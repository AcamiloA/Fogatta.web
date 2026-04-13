"use client";

import {
  ClipboardEvent,
  FormEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import { BrandWordmark } from "@/components/layout/brand-wordmark";

type LoginResponse = {
  ok?: boolean;
  requiresTwoFactor?: boolean;
  error?: string;
};

type LoginStep = "credentials" | "otp";

const OTP_LENGTH = 6;

function createEmptyOtpDigits() {
  return Array.from({ length: OTP_LENGTH }, () => "");
}

export function AdminLoginForm() {
  const router = useRouter();
  const otpInputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [otpDigits, setOtpDigits] = useState<string[]>(() => createEmptyOtpDigits());
  const [step, setStep] = useState<LoginStep>("credentials");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const otpCode = useMemo(() => otpDigits.join(""), [otpDigits]);

  const requestLogin = useCallback(async (payload: { username: string; password: string; otp?: string }) => {
    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    let data: LoginResponse | null = null;
    try {
      data = (await response.json()) as LoginResponse;
    } catch {
      data = null;
    }

    return { response, data };
  }, []);

  function setOtpDigit(index: number, value: string) {
    setOtpDigits((current) => {
      const next = [...current];
      next[index] = value;
      return next;
    });
  }

  function resetToCredentials(errorMessage: string) {
    setStep("credentials");
    setPassword("");
    setOtpDigits(createEmptyOtpDigits());
    setError(errorMessage);
  }

  const submitOtpCode = useCallback(async (code: string) => {
    const { response, data } = await requestLogin({ username, password, otp: code });

    if (!response.ok || !data?.ok) {
      resetToCredentials(data?.error ?? "Credenciales invalidas.");
      return;
    }

    router.push("/admin");
    router.refresh();
  }, [password, requestLogin, router, username]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (step !== "credentials" || loading) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { response, data } = await requestLogin({ username, password });

      if (!response.ok) {
        throw new Error(data?.error ?? "Credenciales invalidas.");
      }

      if (data?.ok) {
        router.push("/admin");
        router.refresh();
        return;
      }

      if (data?.requiresTwoFactor) {
        setStep("otp");
        setOtpDigits(createEmptyOtpDigits());
        return;
      }

      throw new Error("No se pudo iniciar sesion.");
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "No se pudo iniciar sesion.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  function handleOtpChange(index: number, rawValue: string) {
    const digits = rawValue.replace(/\D/g, "");

    if (!digits) {
      setOtpDigit(index, "");
      return;
    }

    const next = [...otpDigits];
    let cursor = index;

    for (const digit of digits) {
      if (cursor >= OTP_LENGTH) break;
      next[cursor] = digit;
      cursor += 1;
    }

    setOtpDigits(next);

    const nextFocusIndex = Math.min(cursor, OTP_LENGTH - 1);
    otpInputRefs.current[nextFocusIndex]?.focus();
    otpInputRefs.current[nextFocusIndex]?.select();
  }

  function handleOtpKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace") {
      if (otpDigits[index]) {
        event.preventDefault();
        setOtpDigit(index, "");
        return;
      }

      if (index > 0) {
        event.preventDefault();
        setOtpDigit(index - 1, "");
        otpInputRefs.current[index - 1]?.focus();
      }
      return;
    }

    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      otpInputRefs.current[index - 1]?.focus();
      return;
    }

    if (event.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      event.preventDefault();
      otpInputRefs.current[index + 1]?.focus();
    }
  }

  function handleOtpPaste(index: number, event: ClipboardEvent<HTMLInputElement>) {
    const pastedDigits = event.clipboardData.getData("text").replace(/\D/g, "");
    if (!pastedDigits) {
      return;
    }

    event.preventDefault();

    const next = [...otpDigits];
    let cursor = index;

    for (const digit of pastedDigits) {
      if (cursor >= OTP_LENGTH) break;
      next[cursor] = digit;
      cursor += 1;
    }

    setOtpDigits(next);

    const nextFocusIndex = Math.min(cursor, OTP_LENGTH - 1);
    otpInputRefs.current[nextFocusIndex]?.focus();
    otpInputRefs.current[nextFocusIndex]?.select();
  }

  useEffect(() => {
    if (step !== "otp") {
      return;
    }

    const firstEmptyIndex = otpDigits.findIndex((digit) => !digit);
    const targetIndex = firstEmptyIndex === -1 ? OTP_LENGTH - 1 : firstEmptyIndex;
    otpInputRefs.current[targetIndex]?.focus();
  }, [step, otpDigits]);

  useEffect(() => {
    if (step !== "otp" || loading) {
      return;
    }

    const isComplete = otpCode.length === OTP_LENGTH && otpDigits.every((digit) => digit.length === 1);
    if (!isComplete) {
      return;
    }

    let active = true;

    void (async () => {
      setLoading(true);
      setError(null);

      try {
        await submitOtpCode(otpCode);
      } catch {
        if (active) {
          resetToCredentials("Credenciales invalidas.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [step, otpCode, otpDigits, loading, submitOtpCode]);

  return (
    <form
      onSubmit={handleSubmit}
      autoComplete="off"
      className="mx-auto w-full max-w-md space-y-4 rounded-2xl border border-[var(--border)]/40 bg-[var(--surface-2)] p-6 shadow-sm"
    >
      <div className="mb-2 flex items-center justify-center gap-3">
        <Image
          src="/brand/flame.png"
          alt="FOGATTA"
          width={512}
          height={512}
          className="h-11 w-11 object-contain"
          priority
        />
        <BrandWordmark className="text-xl tracking-[0.14em] text-[var(--fg-strong)]" />
      </div>

      {step === "credentials" ? (
        <>
          <label className="block text-sm text-[var(--fg-muted)]">
            Usuario
            <input
              autoComplete="off"
              className="mt-1 w-full rounded-lg border border-[var(--input-border)] bg-[var(--surface-3)] px-3 py-2 text-[var(--fg)]"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
            />
          </label>

          <label className="block text-sm text-[var(--fg-muted)]">
            Contraseña
            <input
              type="password"
              autoComplete="new-password"
              className="mt-1 w-full rounded-lg border border-[var(--input-border)] bg-[var(--surface-3)] px-3 py-2 text-[var(--fg)]"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
        </>
      ) : (
        <div className="rounded-xl border border-[var(--accent)]/35 bg-[var(--surface-3)]/65 p-4">
          <label className="block text-sm text-[var(--fg-muted)]"></label>
          <div className="mt-2 flex items-center justify-center gap-2">
            {otpDigits.map((digit, index) => (
              <input
                key={`otp-digit-${index}`}
                ref={(node) => {
                  otpInputRefs.current[index] = node;
                }}
                type="text"
                inputMode="numeric"
                autoComplete="off"
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                onChange={(event) => handleOtpChange(index, event.target.value)}
                onKeyDown={(event) => handleOtpKeyDown(index, event)}
                onPaste={(event) => handleOtpPaste(index, event)}
                onFocus={(event) => event.currentTarget.select()}
                aria-label={`Clave ${index + 1}`}
                className="h-11 w-11 rounded-lg border border-[var(--input-border)] bg-[var(--surface-3)] text-center text-lg text-[var(--fg)]"
              />
            ))}
          </div>
        </div>
      )}

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      {step === "credentials" ? (
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-medium text-[var(--accent-contrast)] disabled:bg-[var(--accent-disabled)]"
        >
          {loading ? "Validando..." : "Continuar"}
        </button>
      ) : (
        <p className="text-center text-xs text-[var(--fg-muted)]">
          {loading ? "Verificando..." : ""}
        </p>
      )}
    </form>
  );
}
