"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { StoreBadges } from "../../components/StoreBadges";

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
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#1C1B18] px-4 py-10">
      <div className="w-full max-w-sm bg-[#242219] border border-[#C9A227]/20 rounded-xl p-8 shadow-xl">
        <h1 className="text-2xl font-bold text-[#C9A227] mb-1">Vouch Admin</h1>
        <p className="text-sm text-[#F5EFE0]/60 mb-6">
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
            className="w-full bg-[#C9A227] text-[#1C1B18] font-semibold rounded-lg py-2.5 hover:bg-[#DDBA3E] transition-colors disabled:opacity-50"
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
            className="w-full mt-4 text-xs text-[#F5EFE0]/50 hover:text-[#C9A227] transition-colors"
          >
            {mode === "signIn"
              ? "No admin account yet — set one up"
              : "Already have an account? Sign in"}
          </button>
        )}
      </div>

      <div className="w-full max-w-sm mt-8 flex flex-col items-center gap-4">
        <p className="text-xs text-[#F5EFE0]/40">Get the Vouch mobile app</p>
        <StoreBadges />
        <p className="text-xs text-[#F5EFE0]/40 flex items-center gap-2">
          <Link href="/privacy-policy" className="hover:text-[#C9A227] transition-colors">
            Privacy Policy
          </Link>
          <span>&middot;</span>
          <Link href="/terms-of-service" className="hover:text-[#C9A227] transition-colors">
            Terms &amp; Conditions
          </Link>
        </p>
      </div>
    </div>
  );
}

const inputClass =
  "w-full bg-[#1C1B18] border border-[#C9A227]/20 rounded-lg px-3 py-2 text-sm text-[#F5EFE0] focus:outline-none focus:border-[#C9A227]/60";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-[#F5EFE0]/50 mb-1">
        {label}
      </span>
      {children}
    </label>
  );
}
