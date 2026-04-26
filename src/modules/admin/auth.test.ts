import { afterAll, describe, expect, it } from "vitest";
import { generate } from "otplib";

import {
  AdminTwoFactorConfigurationError,
  createAdminSessionToken,
  validateAdminLogin,
  validateAdminTwoFactor,
  verifyAdminSessionToken,
} from "@/modules/admin/auth";

describe("admin auth", () => {
  const originalEnv = process.env;

  function setBaseEnv() {
    process.env = {
      ...originalEnv,
      ADMIN_USERNAME: "admin",
      ADMIN_PASSWORD: "fogatta123",
      ADMIN_2FA_SECRET: "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP",
      EDITOR_USERNAME: "",
      EDITOR_PASSWORD: "",
      EDITOR_2FA_SECRET: "",
    };
  }

  setBaseEnv();

  afterAll(() => {
    process.env = originalEnv;
  });

  it("validates default admin credentials", () => {
    setBaseEnv();
    const account = validateAdminLogin({
      username: "admin",
      password: "fogatta123",
    });
    expect(account?.role).toBe("admin");
  });

  it("accepts username in uppercase or mixed case", () => {
    setBaseEnv();
    const upper = validateAdminLogin({
      username: "ADMIN",
      password: "fogatta123",
    });
    const mixed = validateAdminLogin({
      username: "AdMiN",
      password: "fogatta123",
    });
    expect(upper?.role).toBe("admin");
    expect(mixed?.role).toBe("admin");
  });

  it("validates 2fa code for admin", async () => {
    setBaseEnv();
    const code = await generate({ secret: process.env.ADMIN_2FA_SECRET as string });
    await expect(validateAdminTwoFactor({ role: "admin" }, code)).resolves.toBe(true);
  });

  it("validates 2fa code for editor", async () => {
    setBaseEnv();
    process.env.EDITOR_USERNAME = "editor";
    process.env.EDITOR_PASSWORD = "editor-pass-123";
    process.env.EDITOR_2FA_SECRET = "KRSXG5AUMVZXIIDEMVZXG2LONFXGOIDB";

    const editor = validateAdminLogin({
      username: "editor",
      password: "editor-pass-123",
    });
    expect(editor?.role).toBe("editor");

    const code = await generate({ secret: process.env.EDITOR_2FA_SECRET as string });
    await expect(validateAdminTwoFactor({ role: "editor" }, code)).resolves.toBe(true);
  });

  it("rejects invalid 2fa code", async () => {
    setBaseEnv();
    await expect(validateAdminTwoFactor({ role: "admin" }, "000000")).resolves.toBe(false);
  });

  it("throws when 2fa secret is missing", async () => {
    setBaseEnv();
    process.env.ADMIN_2FA_SECRET = "";

    await expect(validateAdminTwoFactor({ role: "admin" }, "123456")).rejects.toThrow(
      AdminTwoFactorConfigurationError,
    );
  });

  it("creates and verifies token with role", () => {
    setBaseEnv();
    const token = createAdminSessionToken("admin", "admin");
    const parsed = verifyAdminSessionToken(token);
    expect(parsed?.sub).toBe("admin");
    expect(parsed?.role).toBe("admin");
  });
});
