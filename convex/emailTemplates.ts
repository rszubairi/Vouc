// Plain HTML email templates for transactional emails sent via Resend
// (convex/email.ts). Kept dependency-free so it can be imported from an
// action without pulling in any Convex server types.

type EmailContent = { subject: string; html: string };

const APP_URL = process.env.APP_URL ?? "";

function layout(preheader: string, bodyHtml: string): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Helvetica,Arial,sans-serif;">
    <span style="display:none;font-size:1px;color:#f4f4f5;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${preheader}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;">
            <tr>
              <td style="padding:32px 32px 24px 32px;">
                ${bodyHtml}
              </td>
            </tr>
          </table>
          <table role="presentation" width="480" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:16px 8px;color:#9ca3af;font-size:12px;text-align:center;">
                This is an automated message — please don't reply directly to this email.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function button(label: string, url: string): string {
  return `<a href="${url}" style="display:inline-block;margin-top:20px;padding:12px 24px;background-color:#111827;color:#ffffff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:bold;">${label}</a>`;
}

function heading(text: string): string {
  return `<h1 style="margin:0 0 16px 0;font-size:20px;color:#111827;">${text}</h1>`;
}

function paragraph(text: string): string {
  return `<p style="margin:0 0 12px 0;font-size:15px;line-height:1.5;color:#374151;">${text}</p>`;
}

// New member registered and is awaiting sponsor approval. Sent to the sponsor.
export function sponsorPendingApprovalEmail(params: {
  sponsorName: string;
  newMemberName: string;
}): EmailContent {
  const { sponsorName, newMemberName } = params;
  const cta = APP_URL ? button("Review pending approvals", `${APP_URL}/approvals`) : "";
  return {
    subject: `${newMemberName} is waiting for your approval`,
    html: layout(
      `${newMemberName} signed up under you and is awaiting approval.`,
      `${heading("New member awaiting approval")}
       ${paragraph(`Hi ${sponsorName},`)}
       ${paragraph(`<strong>${newMemberName}</strong> just registered using your email as their sponsor. Their account is pending your approval before they can fully participate.`)}
       ${cta}`
    ),
  };
}

// Sponsor approved a downline member. Sent to the newly approved member.
export function accountApprovedEmail(params: { name: string }): EmailContent {
  const { name } = params;
  const cta = APP_URL ? button("Go to your account", APP_URL) : "";
  return {
    subject: "Your account has been approved",
    html: layout(
      "Your account has been approved and is now active.",
      `${heading("You're approved!")}
       ${paragraph(`Hi ${name},`)}
       ${paragraph("Good news — your account has been approved and is now active.")}
       ${cta}`
    ),
  };
}

// Admin rejected a pending registration.
export function accountRejectedEmail(params: { name: string }): EmailContent {
  const { name } = params;
  return {
    subject: "Your registration was not approved",
    html: layout(
      "Your registration could not be approved at this time.",
      `${heading("Registration not approved")}
       ${paragraph(`Hi ${name},`)}
       ${paragraph("Unfortunately your registration could not be approved at this time. If you believe this is a mistake, please contact support.")}`
    ),
  };
}

// Admin restored a previously deleted account.
export function accountRestoredEmail(params: { name: string }): EmailContent {
  const { name } = params;
  const cta = APP_URL ? button("Go to your account", APP_URL) : "";
  return {
    subject: "Your account has been restored",
    html: layout(
      "Your account has been restored and is now active again.",
      `${heading("Account restored")}
       ${paragraph(`Hi ${name},`)}
       ${paragraph("Your account has been restored and is now active again.")}
       ${cta}`
    ),
  };
}

// Admin deleted an account (or the user's own delete request was processed).
export function accountDeletedEmail(params: { name: string }): EmailContent {
  const { name } = params;
  return {
    subject: "Your account has been deleted",
    html: layout(
      "Your account has been deleted.",
      `${heading("Account deleted")}
       ${paragraph(`Hi ${name},`)}
       ${paragraph("Your account has been deleted. If you didn't expect this or believe it's a mistake, please contact support.")}`
    ),
  };
}

// Confirmation sent to a user who requested deletion of their own account.
export function deleteAccountRequestedEmail(params: { name: string }): EmailContent {
  const { name } = params;
  return {
    subject: "We received your account deletion request",
    html: layout(
      "We've received your request to delete your account.",
      `${heading("Deletion request received")}
       ${paragraph(`Hi ${name},`)}
       ${paragraph("We've received your request to delete your account. It has been deactivated accordingly.")}`
    ),
  };
}

// Admin disabled an account.
export function accountDisabledEmail(params: { name: string }): EmailContent {
  const { name } = params;
  return {
    subject: "Your account has been disabled",
    html: layout(
      "Your account has been disabled.",
      `${heading("Account disabled")}
       ${paragraph(`Hi ${name},`)}
       ${paragraph("Your account has been disabled by an administrator. If you believe this is a mistake, please contact support.")}`
    ),
  };
}

// Admin re-enabled a previously disabled account.
export function accountEnabledEmail(params: { name: string }): EmailContent {
  const { name } = params;
  const cta = APP_URL ? button("Go to your account", APP_URL) : "";
  return {
    subject: "Your account has been re-enabled",
    html: layout(
      "Your account has been re-enabled.",
      `${heading("Account re-enabled")}
       ${paragraph(`Hi ${name},`)}
       ${paragraph("Your account has been re-enabled and you can sign in again.")}
       ${cta}`
    ),
  };
}
