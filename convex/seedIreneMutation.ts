import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const insertIrene = internalMutation({
  args: { passwordHash: v.string() },
  handler: async (ctx, { passwordHash }) => {
    const email = "irenemonkeysy@icloud.com";

    const existing = await ctx.db
      .query("authAccounts")
      .withIndex("providerAndAccountId", (q) =>
        q.eq("provider", "password").eq("providerAccountId", email)
      )
      .first();

    if (existing) {
      console.log("Irene already exists, skipping seed.");
      return;
    }

    const userId = await ctx.db.insert("users", {
      name: "Irene",
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
      nickName: "Irene",
      firstName: "Irene",
      lastName: "",
      emailAddress: email,
      sponsorEmailAddress: email,
      city: "",
      country: "",
      sponsorApproved: true,
      fullAccess: true,
      deleteAccount: false,
    });

    console.log("Irene seeded: " + email);
  },
});
