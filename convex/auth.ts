import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { Email } from "@convex-dev/auth/providers/Email";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      id: "password",
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
});
