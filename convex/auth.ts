import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { Email } from "@convex-dev/auth/providers/Email";
import { ConvexError, Value } from "convex/values";
import { MutationCtx } from "./_generated/server";
import { createProfileForUser, RegistrationFields } from "./profiles";

const REQUIRED_REGISTRATION_FIELDS = [
  "nickName",
  "firstName",
  "lastName",
  "sponsorEmailAddress",
  "city",
  "country",
] as const;

// Pull the profile fields a sign-up sends alongside email/password. Returns
// null when none were sent (older app builds), in which case the user is
// created without a profile and the app routes them to complete-profile.
function parseRegistration(
  params: Record<string, Value | undefined>,
): Omit<RegistrationFields, "emailAddress"> | null {
  const str = (key: string) => {
    const value = params[key];
    return typeof value === "string" && value.trim() ? value.trim() : undefined;
  };
  if (REQUIRED_REGISTRATION_FIELDS.every((key) => str(key) === undefined)) {
    return null;
  }
  const missing = REQUIRED_REGISTRATION_FIELDS.filter((key) => !str(key));
  if (missing.length > 0) {
    throw new ConvexError(`Missing required fields: ${missing.join(", ")}`);
  }
  return {
    nickName: str("nickName")!,
    firstName: str("firstName")!,
    middleName: str("middleName"),
    lastName: str("lastName")!,
    sponsorEmailAddress: str("sponsorEmailAddress")!,
    city: str("city")!,
    country: str("country")!,
  };
}

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      id: "password",
      // Carry the registration fields through to createOrUpdateUser below so
      // the profile is written in the same transaction as the account.
      profile(params): Record<string, Value> & { email: string } {
        const email = params.email as string;
        if (params.flow !== "signUp") return { email };
        const registration = parseRegistration(params);
        if (!registration) return { email };
        return { email, registration: registration as Record<string, Value> };
      },
      validatePasswordRequirements: (password: string) => {
        if (password.length < 8) throw new Error("Password must be at least 8 characters.");
        if (!/[A-Z]/.test(password)) throw new Error("Password must contain an uppercase letter.");
        if (!/[a-z]/.test(password)) throw new Error("Password must contain a lowercase letter.");
        if (!/[0-9]/.test(password)) throw new Error("Password must contain a digit.");
        if (!/[^A-Za-z0-9]/.test(password)) throw new Error("Password must contain a special character.");
      },
    }),
    Email({
      id: "resend-otp",
      sendVerificationRequest: async ({ identifier: email, token }) => {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: process.env.AUTH_EMAIL ?? "noreply@example.com",
            to: email,
            subject: "Your OTP code",
            text: `Your verification code is: ${token}`,
          }),
        });
        if (!response.ok) {
          throw new Error(`Failed to send OTP email: ${response.statusText}`);
        }
      },
    }),
  ],
  callbacks: {
    // Replaces Convex Auth's default user creation so sign-up can also insert
    // the profile. Throwing here (e.g. unknown referrer) rolls back the whole
    // sign-up, so no auth account is left behind without a profile.
    async createOrUpdateUser(genericCtx, args) {
      const ctx = genericCtx as unknown as MutationCtx;
      const { emailVerified, registration, ...profile } = args.profile;
      const email = typeof profile.email === "string" ? profile.email : undefined;
      const userData = {
        ...(email !== undefined ? { email } : {}),
        ...(emailVerified ? { emailVerificationTime: Date.now() } : {}),
      };

      let userId = args.existingUserId;
      // Same linking as the default: an email-OTP sign-in joins the single
      // existing user with that verified email.
      if (userId === null && args.type === "email" && email !== undefined) {
        const matches = await ctx.db
          .query("users")
          .withIndex("email", (q) => q.eq("email", email))
          .filter((q) => q.neq(q.field("emailVerificationTime"), undefined))
          .take(2);
        if (matches.length === 1) userId = matches[0]._id;
      }
      if (userId !== null) {
        await ctx.db.patch(userId, userData);
        return userId;
      }

      const newUserId = await ctx.db.insert("users", userData);
      if (registration && email !== undefined) {
        await createProfileForUser(ctx, newUserId, {
          ...(registration as Omit<RegistrationFields, "emailAddress">),
          emailAddress: email,
        });
      }
      return newUserId;
    },
  },
});
