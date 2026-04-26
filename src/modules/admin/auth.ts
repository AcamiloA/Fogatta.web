import { createHmac, timingSafeEqual } from "node:crypto";
import { verify } from "otplib";

export const ADMIN_SESSION_COOKIE = "fogatta_admin_session";
const SESSION_TTL_SECONDS = 60 * 60 * 8;
export type AdminRole = "admin" | "editor";
const DEFAULT_ADMIN_PASSWORD = "fogatta123";
const DEFAULT_SESSION_SECRET = "fogatta-dev-session-secret-change-me";

type SessionPayload = {
  sub: string;
  role: AdminRole;
  exp: number;
};

type AdminAccount = {
  username: string;
  password: string;
  role: AdminRole;
};

function normalizeLoginUsername(value: string) {
  return value.trim().toLowerCase();
}

export class AdminTwoFactorConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdminTwoFactorConfigurationError";
  }
}

function base64UrlEncode(input: string) {
  return Buffer.from(input, "utf-8").toString("base64url");
}

function base64UrlDecode(input: string) {
  return Buffer.from(input, "base64url").toString("utf-8");
}

function getSessionSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET ?? DEFAULT_SESSION_SECRET;
  if (process.env.NODE_ENV === "production") {
    if (secret === DEFAULT_SESSION_SECRET || secret.length < 32) {
      throw new Error(
        "ADMIN_SESSION_SECRET inseguro para produccion. Usa un secreto unico de al menos 32 caracteres.",
      );
    }
  }
  return secret;
}

function getAdminCredentials() {
  const adminUsername = process.env.ADMIN_USERNAME?.trim() || "admin";
  const adminAccount: AdminAccount = {
    username: adminUsername,
    password: process.env.ADMIN_PASSWORD ?? DEFAULT_ADMIN_PASSWORD,
    role: "admin",
  };

  const editorUsername = process.env.EDITOR_USERNAME?.trim();
  const editorPassword = process.env.EDITOR_PASSWORD;
  const editorAccount: AdminAccount | null =
    editorUsername && editorPassword
      ? {
          username: editorUsername,
          password: editorPassword,
          role: "editor",
        }
      : null;

  const accounts = editorAccount ? [adminAccount, editorAccount] : [adminAccount];

  if (process.env.NODE_ENV === "production") {
    for (const account of accounts) {
      const weakPassword =
        account.password.length < 12 || account.password === DEFAULT_ADMIN_PASSWORD;
      const weakUsername = account.username.trim().toLowerCase() === "admin";
      if (weakPassword || weakUsername) {
        throw new Error(
          "Credenciales admin/editor inseguras para produccion. Usa usuarios no obvios y contrasenas robustas (>=12).",
        );
      }
    }
  }

  return accounts;
}

function getTwoFactorSecret(account: AdminAccount) {
  const secretByRole =
    account.role === "admin" ? process.env.ADMIN_2FA_SECRET : process.env.EDITOR_2FA_SECRET;
  const secret = secretByRole?.trim();

  if (!secret) {
    throw new AdminTwoFactorConfigurationError(
      `2FA no configurado para ${account.role}. Define ${
        account.role === "admin" ? "ADMIN_2FA_SECRET" : "EDITOR_2FA_SECRET"
      }.`,
    );
  }

  if (process.env.NODE_ENV === "production" && secret.length < 16) {
    throw new AdminTwoFactorConfigurationError(
      `Secreto 2FA inseguro para ${account.role}. Usa un secreto robusto en base32.`,
    );
  }

  return secret;
}

export function ensureAdminTwoFactorConfigured(account: { role: AdminRole }) {
  getTwoFactorSecret({
    username: "",
    password: "",
    role: account.role,
  });
}

function signPayload(encodedPayload: string) {
  return createHmac("sha256", getSessionSecret()).update(encodedPayload).digest("base64url");
}

function safeEqual(a: string, b: string) {
  const aBuf = Buffer.from(a, "utf8");
  const bBuf = Buffer.from(b, "utf8");

  if (aBuf.length !== bBuf.length) {
    return false;
  }

  return timingSafeEqual(aBuf, bBuf);
}

export function validateAdminLogin(input: { username: string; password: string }): AdminAccount | null {
  const username = normalizeLoginUsername(input.username);
  const password = input.password;

  for (const account of getAdminCredentials()) {
    const accountUsername = normalizeLoginUsername(account.username);
    if (safeEqual(username, accountUsername) && safeEqual(password, account.password)) {
      return account;
    }
  }

  return null;
}

export async function validateAdminTwoFactor(account: { role: AdminRole }, otp: string) {
  const normalizedOtp = otp.trim().replace(/\s+/g, "");
  if (!/^\d{6}$/.test(normalizedOtp)) {
    return false;
  }

  const secret = getTwoFactorSecret({
    username: "",
    password: "",
    role: account.role,
  });

  try {
    const result = await verify({
      token: normalizedOtp,
      secret,
      epochTolerance: 30,
    });
    return result.valid;
  } catch {
    throw new AdminTwoFactorConfigurationError(
      `Secreto 2FA invalido para ${account.role}. Verifica formato base32 en variables de entorno.`,
    );
  }
}

export function createAdminSessionToken(username: string, role: AdminRole) {
  const payload: SessionPayload = {
    sub: username,
    role,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };

  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = signPayload(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

export function verifyAdminSessionToken(token: string | undefined | null) {
  if (!token) {
    return null;
  }

  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = signPayload(encodedPayload);
  if (!safeEqual(signature, expectedSignature)) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as SessionPayload;

    if (!payload.sub || typeof payload.exp !== "number") {
      return null;
    }

    if (payload.role !== "admin" && payload.role !== "editor") {
      return null;
    }

    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
