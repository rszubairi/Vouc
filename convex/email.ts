import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import {
  sponsorPendingApprovalEmail,
  accountApprovedEmail,
  accountRejectedEmail,
  accountRestoredEmail,
  accountDeletedEmail,
  accountDisabledEmail,
  accountEnabledEmail,
  deleteAccountRequestedEmail,
} from "./emailTemplates";

const eventValidator = v.union(
  v.object({
    kind: v.literal("sponsorPendingApproval"),
    to: v.string(),
    sponsorName: v.string(),
    newMemberName: v.string(),
  }),
  v.object({ kind: v.literal("accountApproved"), to: v.string(), name: v.string() }),
  v.object({ kind: v.literal("accountRejected"), to: v.string(), name: v.string() }),
  v.object({ kind: v.literal("accountRestored"), to: v.string(), name: v.string() }),
  v.object({ kind: v.literal("accountDeleted"), to: v.string(), name: v.string() }),
  v.object({ kind: v.literal("accountDisabled"), to: v.string(), name: v.string() }),
  v.object({ kind: v.literal("accountEnabled"), to: v.string(), name: v.string() }),
  v.object({ kind: v.literal("deleteAccountRequested"), to: v.string(), name: v.string() })
);

// Renders the template for a given event and sends it through Resend.
// Scheduled (fire-and-forget) from mutations via ctx.scheduler.runAfter,
// since mutations cannot call actions directly.
export const sendEmailForEvent = internalAction({
  args: { event: eventValidator },
  handler: async (_ctx, { event }) => {
    const content = (() => {
      switch (event.kind) {
        case "sponsorPendingApproval":
          return sponsorPendingApprovalEmail(event);
        case "accountApproved":
          return accountApprovedEmail(event);
        case "accountRejected":
          return accountRejectedEmail(event);
        case "accountRestored":
          return accountRestoredEmail(event);
        case "accountDeleted":
          return accountDeletedEmail(event);
        case "accountDisabled":
          return accountDisabledEmail(event);
        case "accountEnabled":
          return accountEnabledEmail(event);
        case "deleteAccountRequested":
          return deleteAccountRequestedEmail(event);
      }
    })();

    await sendViaResend({ to: event.to, subject: content.subject, html: content.html });
    return null;
  },
});

async function sendViaResend(params: { to: string; subject: string; html: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    console.warn(
      "[email] RESEND_API_KEY / RESEND_FROM_EMAIL not set — skipping send:",
      params.subject,
      "to",
      params.to
    );
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: params.to,
      subject: params.subject,
      html: params.html,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error("[email] Resend send failed:", response.status, body);
  }
}
