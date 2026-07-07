"use node";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { Scrypt } from "lucia";

export const seedAdmin = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx): Promise<null> => {
    const passwordHash = await new Scrypt().hash("Tool4life123!@#");
    await ctx.runMutation(internal.seedMutation.insertAdmin, { passwordHash });
    return null;
  },
});
