"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";

function friendlyAuthError(message: string): string {
  if (message.includes("InvalidAccountId") || message.includes("InvalidSecret")) {
    return "Incorrect email or password. Please try again.";
  }
  if (message.includes("TooManyFailedAttempts")) {
    return "Too many failed attempts. Please wait a moment and try again.";
  }
  return "Something went wrong. Please try again.";
}

export default function MemberLoginPage() {
  const router = useRouter();
  const { signIn } = useAuthActions();

  const [mode, setMode] = useState<"password" | "otp" | "otp-code">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signIn("password", { email, password, flow: "signIn" });
      router.push("/account/profile");
    } catch (err) {
      setError(err instanceof Error ? friendlyAuthError(err.message) : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRequestCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signIn("resend-otp", { email });
      setMode("otp-code");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send a code. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signIn("resend-otp", { email, code });
      router.push("/account/profile");
    } catch (err) {
      setError(err instanceof Error ? "Incorrect or expired code. Please try again." : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-white to-[#FBF6E9] px-4 py-10">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="animate-drift-a absolute -top-24 -left-24 w-96 h-96 rounded-full bg-[#F2650C]/20 blur-3xl" />
        <div className="animate-drift-b absolute top-1/3 -right-32 w-[28rem] h-[28rem] rounded-full bg-[#F5EFE0] blur-3xl" />
        <div className="animate-drift-c absolute -bottom-32 left-1/4 w-80 h-80 rounded-full bg-[#F2650C]/10 blur-3xl" />
      </div>

      <Link
        href="/"
        className="relative mb-6 text-sm font-medium text-black/50 hover:text-black transition-colors flex items-center gap-1.5"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M11 18l-6-6 6-6" />
        </svg>
        Back to Vouch
      </Link>

      <div className="relative w-full max-w-sm bg-[#F5EFE0] border border-black/10 rounded-xl p-8 shadow-xl">
        <h1 className="text-2xl font-bold text-black mb-1">Member Sign In</h1>
        <p className="text-sm text-gray-600 mb-6">
          {mode === "otp-code"
            ? `Enter the code sent to ${email}`
            : "Sign in with the same account you use on the app"}
        </p>

        {mode === "password" && (
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <Field label="Email">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Password">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
              />
            </Field>

            {error && <ErrorMessage>{error}</ErrorMessage>}

            <button type="submit" disabled={submitting} className={buttonClass}>
              {submitting ? "Please wait..." : "Sign In"}
            </button>

            <button
              type="button"
              onClick={() => {
                setError(null);
                setMode("otp");
              }}
              className="w-full text-xs text-gray-500 hover:text-black transition-colors"
            >
              Sign in with an email code instead
            </button>
          </form>
        )}

        {mode === "otp" && (
          <form onSubmit={handleRequestCode} className="space-y-4">
            <Field label="Email">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
              />
            </Field>

            {error && <ErrorMessage>{error}</ErrorMessage>}

            <button type="submit" disabled={submitting} className={buttonClass}>
              {submitting ? "Sending..." : "Send Code"}
            </button>

            <button
              type="button"
              onClick={() => {
                setError(null);
                setMode("password");
              }}
              className="w-full text-xs text-gray-500 hover:text-black transition-colors"
            >
              Back to password sign in
            </button>
          </form>
        )}

        {mode === "otp-code" && (
          <form onSubmit={handleVerifyCode} className="space-y-4">
            <Field label="Code">
              <input
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className={inputClass}
                autoFocus
              />
            </Field>

            {error && <ErrorMessage>{error}</ErrorMessage>}

            <button type="submit" disabled={submitting} className={buttonClass}>
              {submitting ? "Verifying..." : "Verify & Sign In"}
            </button>

            <button
              type="button"
              onClick={() => {
                setError(null);
                setMode("otp");
              }}
              className="w-full text-xs text-gray-500 hover:text-black transition-colors"
            >
              Use a different email
            </button>
          </form>
        )}
      </div>

      <div className="relative w-full max-w-sm mt-8 flex flex-col items-center gap-4">
        <p className="text-xs text-gray-500 flex items-center gap-2">
          <Link href="/privacy-policy" className="hover:text-black transition-colors">
            Privacy Policy
          </Link>
          <span>&middot;</span>
          <Link href="/terms-of-service" className="hover:text-black transition-colors">
            Terms &amp; Conditions
          </Link>
        </p>
      </div>
    </div>
  );
}

const inputClass =
  "w-full bg-white border border-black/15 rounded-lg px-3 py-2 text-sm text-black focus:outline-none focus:border-black/40";

const buttonClass =
  "w-full bg-black text-white font-semibold rounded-lg py-2.5 hover:bg-neutral-800 transition-colors disabled:opacity-50";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-gray-600 mb-1">{label}</span>
      {children}
    </label>
  );
}

function ErrorMessage({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm text-red-400 bg-red-950/40 border border-red-500/30 rounded-lg px-3 py-2">
      {children}
    </p>
  );
}
