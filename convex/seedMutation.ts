import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const grantIsAdmin = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_email", (q) => q.eq("emailAddress", email))
      .first();
    if (!profile) throw new Error("Profile not found");
    await ctx.db.patch(profile._id, { isAdmin: true });
  },
});

export const insertAdmin = internalMutation({
  args: { passwordHash: v.string() },
  handler: async (ctx, { passwordHash }) => {
    const email = "r.s.zubairi@gmail.com";

    const existing = await ctx.db
      .query("authAccounts")
      .withIndex("providerAndAccountId", (q) =>
        q.eq("provider", "password").eq("providerAccountId", email)
      )
      .first();

    if (existing) {
      console.log("Admin user already exists, skipping seed.");
      return;
    }

    const userId = await ctx.db.insert("users", {
      name: "Raheel Zubairi",
      email,
      emailVerificationTime: Date.now(),
    });

    await ctx.db.insert("authAccounts", {
      userId,
      provider: "password",
      providerAccountId: email,
      secret: passwordHash,
    });

    // schemaValidation is false so the extra role field is stored without
    // needing a schema change.
    await (ctx.db as any).insert("profiles", {
      userId: userId as string,
      nickName: "Raheel",
      firstName: "Raheel",
      lastName: "Zubairi",
      emailAddress: email,
      sponsorEmailAddress: email,
      city: "",
      country: "",
      sponsorApproved: true,
      fullAccess: true,
      deleteAccount: false,
      role: "administrator",
    });

    console.log("Admin user seeded: " + email);
  },
});
