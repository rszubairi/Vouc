"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useAuthActions();
  const claimAdmin = useMutation(api.admin.claimAdmin);
  const anyAdminExists = useQuery(api.admin.anyAdminExists);

  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [nickName, setNickName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signIn("password", { email, password, flow: mode });
      if (mode === "signUp") {
        await claimAdmin({
          nickName: nickName || firstName,
          firstName,
          lastName,
          emailAddress: email,
        });
      }
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
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
        <h1 className="text-2xl font-bold text-black mb-1">Vouch Admin</h1>
        <p className="text-sm text-gray-600 mb-6">
          {mode === "signIn"
            ? "Sign in to the admin console"
            : "Create the admin account"}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signUp" && (
            <>
              <Field label="First name">
                <input
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Last name">
                <input
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Nickname (optional)">
                <input
                  value={nickName}
                  onChange={(e) => setNickName(e.target.value)}
                  className={inputClass}
                />
              </Field>
            </>
          )}

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

          {error && (
            <p className="text-sm text-red-400 bg-red-950/40 border border-red-500/30 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-black text-white font-semibold rounded-lg py-2.5 hover:bg-neutral-800 transition-colors disabled:opacity-50"
          >
            {submitting
              ? "Please wait..."
              : mode === "signIn"
              ? "Sign In"
              : "Create Admin Account"}
          </button>
        </form>

        {anyAdminExists === false && (
          <button
            onClick={() => {
              setMode(mode === "signIn" ? "signUp" : "signIn");
              setError(null);
            }}
            className="w-full mt-4 text-xs text-gray-500 hover:text-black transition-colors"
          >
            {mode === "signIn"
              ? "No admin account yet — set one up"
              : "Already have an account? Sign in"}
          </button>
        )}
      </div>

      <div className="relative w-full max-w-sm mt-8 flex flex-col items-center gap-4">
        <p className="text-xs text-gray-500">
          Don&apos;t have the app yet?{" "}
          <Link href="/" className="text-black font-semibold hover:underline">
            Download it here
          </Link>
        </p>
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

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-gray-600 mb-1">
        {label}
      </span>
      {children}
    </label>
  );
}
