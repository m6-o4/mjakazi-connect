import type { Payload } from "payload";

// transactional email templates. email clients strip <style> blocks and CSS
// variables, so the brand hex values from ui-tokens.md are inlined directly here
// — the one place a hardcoded hex is unavoidable rather than a shortcut.

const HEADER_BACKGROUND = "#2F5A48";
const PAGE_BACKGROUND = "#FBFAF7";
const BODY_BACKGROUND = "#FFFFFF";
const BORDER_COLOR = "#E7E2D8";
const HEADING_COLOR = "#2F5A48";
const TEXT_COLOR = "#1F2A24";
const MUTED_COLOR = "#423F37";
const INFO_BACKGROUND = "#FBFAF7";
const DANGER_COLOR = "#B42318";

// staff-entered or Clerk-supplied strings land inside HTML; escape them so a
// stray "<" or "&" cannot break the layout or inject markup
const escapeHtml = (value: string): string =>
	value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");

const h1 = (text: string) =>
	`<h1 style="margin:0 0 8px;font-size:22px;font-weight:600;color:${HEADING_COLOR};letter-spacing:-0.3px;">${text}</h1>`;

const p = (text: string) =>
	`<p style="margin:0 0 16px;font-size:15px;color:${TEXT_COLOR};line-height:1.6;">${text}</p>`;

const muted = (text: string) =>
	`<p style="margin:0 0 16px;font-size:13px;color:${MUTED_COLOR};line-height:1.5;">${text}</p>`;

const divider = () =>
	`<hr style="border:none;border-top:1px solid ${BORDER_COLOR};margin:24px 0;" />`;

const infoBox = (content: string) =>
	`<div style="background-color:${INFO_BACKGROUND};border:1px solid ${BORDER_COLOR};border-radius:8px;padding:16px 20px;margin-bottom:16px;">${content}</div>`;

// the logo is served from public/ at the server origin. email clients need an
// absolute url, and the server url is the only public origin the app has. when
// it is not set the template falls back to the text-only header
const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL?.replace(/\/+$/, "");
const LOGO_URL = SERVER_URL ? `${SERVER_URL}/mjakazi-connect-logo.png` : null;

const baseTemplate = (content: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Mjakazi Connect</title>
</head>
<body style="margin:0;padding:0;background-color:${PAGE_BACKGROUND};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:${PAGE_BACKGROUND};padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
          ${LOGO_URL ? `<tr>
            <td style="background-color:${BODY_BACKGROUND};border-radius:12px 12px 0 0;padding:24px 32px 16px;text-align:center;">
              <img src="${LOGO_URL}" alt="Mjakazi Connect" style="display:block;width:160px;max-width:100%;height:auto;margin:0 auto;" />
            </td>
          </tr>` : ""}
          <tr>
            <td style="background-color:${HEADER_BACKGROUND};border-radius:${LOGO_URL ? "0" : "12px 12px 0 0"};padding:24px 32px;">
              <p style="margin:0;font-size:18px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">Mjakazi Connect</p>
            </td>
          </tr>
          <tr>
            <td style="background-color:${BODY_BACKGROUND};padding:32px;border-left:1px solid ${BORDER_COLOR};border-right:1px solid ${BORDER_COLOR};">
              ${content}
            </td>
          </tr>
          <tr>
            <td style="background-color:${PAGE_BACKGROUND};border-radius:0 0 12px 12px;padding:20px 32px;border:1px solid ${BORDER_COLOR};border-top:none;">
              <p style="margin:0;font-size:12px;color:${MUTED_COLOR};line-height:1.5;">This is an automated message from Mjakazi Connect. To get in touch, reply to this email.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

type SendVerificationApprovedEmailArgs = {
	payload: Payload;
	to: string;
	firstName: string;
};

type SendVerificationRejectedEmailArgs = {
	payload: Payload;
	to: string;
	firstName: string;
	rejectionReason: string;
	attemptsRemaining: number;
};

// the send functions throw on failure — the Resend adapter wraps a non-2xx as an
// APIError rather than returning an error object. callers wrap them so a failed
// send never blocks the state transition it describes (library-docs.md → Resend).

const sendVerificationApprovedEmail = async ({
	payload,
	to,
	firstName,
}: SendVerificationApprovedEmailArgs): Promise<void> => {
	const content = `
    ${h1("Verification Approved")}
    ${p(`Hi ${escapeHtml(firstName)}, great news — your documents have been reviewed and your profile is now verified.`)}
    ${divider()}
    ${infoBox(`
      <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:${MUTED_COLOR};text-transform:uppercase;letter-spacing:0.5px;">What This Means</p>
      <p style="margin:0;font-size:14px;color:${TEXT_COLOR};line-height:1.6;">Your profile is now visible to employers on Mjakazi Connect and carries the Verified badge.</p>
    `)}
    ${muted("The Verified badge is valid for 12 months.")}
  `;

	await payload.sendEmail({
		to,
		subject: "Verification approved — you're verified",
		html: baseTemplate(content),
	});
};

const sendVerificationRejectedEmail = async ({
	payload,
	to,
	firstName,
	rejectionReason,
	attemptsRemaining,
}: SendVerificationRejectedEmailArgs): Promise<void> => {
	const retryCopy =
		attemptsRemaining > 0
			? p(
					`You have <strong>${attemptsRemaining} free resubmission${attemptsRemaining === 1 ? "" : "s"}</strong> remaining. Log in, address the issue above, and resubmit your documents.`,
				)
			: `<p style="margin:0 0 16px;font-size:15px;color:${DANGER_COLOR};line-height:1.6;">You have no free resubmissions remaining — a new verification fee is required to resubmit. Reply to this email for assistance.</p>`;

	const content = `
    ${h1("Verification Unsuccessful")}
    ${p(`Hi ${escapeHtml(firstName)}, your verification submission has been reviewed and could not be approved at this time.`)}
    ${divider()}
    ${infoBox(`
      <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:${MUTED_COLOR};text-transform:uppercase;letter-spacing:0.5px;">Reason for Rejection</p>
      <p style="margin:0;font-size:14px;color:${TEXT_COLOR};line-height:1.6;">${escapeHtml(rejectionReason)}</p>
    `)}
    ${retryCopy}
    ${muted("Log in to your dashboard to view the details and take action.")}
  `;

	await payload.sendEmail({
		to,
		subject: "Action required — verification submission unsuccessful",
		html: baseTemplate(content),
	});
};

type SendPaymentConfirmedEmailArgs = {
	payload: Payload;
	to: string;
	firstName: string;
	mpesaReceiptNumber: string;
	amount: number;
};

const sendPaymentConfirmedEmail = async ({
	payload,
	to,
	firstName,
	mpesaReceiptNumber,
	amount,
}: SendPaymentConfirmedEmailArgs): Promise<void> => {
	const content = `
    ${h1("Payment Received")}
    ${p(`Hi ${escapeHtml(firstName)}, your verification payment has been received and your profile is now in the review queue.`)}
    ${divider()}
    ${infoBox(`
      <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:${MUTED_COLOR};text-transform:uppercase;letter-spacing:0.5px;">Payment Details</p>
      <p style="margin:0 0 4px;font-size:14px;color:${TEXT_COLOR};line-height:1.6;"><strong>Amount:</strong> KSh ${amount.toLocaleString()}</p>
      <p style="margin:0;font-size:14px;color:${TEXT_COLOR};line-height:1.6;"><strong>M-Pesa Receipt:</strong> ${escapeHtml(mpesaReceiptNumber)}</p>
    `)}
    ${p("Our team will review your documents and verify your profile. You will receive another email once the review is complete.")}
    ${muted("This usually takes 1–2 business days.")}
  `;

	await payload.sendEmail({
		to,
		subject: "Payment received — your profile is under review",
		html: baseTemplate(content),
	});
};

type SendSubscriptionActivatedEmailArgs = {
	payload: Payload;
	to: string;
	firstName: string;
	tierName: string;
	endDate: string;
	mpesaReceiptNumber: string;
	amount: number;
};

const sendSubscriptionActivatedEmail = async ({
	payload,
	to,
	firstName,
	tierName,
	endDate,
	mpesaReceiptNumber,
	amount,
}: SendSubscriptionActivatedEmailArgs): Promise<void> => {
	const formattedEndDate = new Date(endDate).toLocaleDateString("en-GB", {
		day: "numeric",
		month: "long",
		year: "numeric",
		timeZone: "Africa/Nairobi",
	});

	const content = `
    ${h1("Subscription Activated")}
    ${p(`Hi ${escapeHtml(firstName)}, your ${escapeHtml(tierName)} subscription is now active. You can browse and connect with verified wajakazi on Mjakazi Connect.`)}
    ${divider()}
    ${infoBox(`
      <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:${MUTED_COLOR};text-transform:uppercase;letter-spacing:0.5px;">Subscription Details</p>
      <p style="margin:0 0 4px;font-size:14px;color:${TEXT_COLOR};line-height:1.6;"><strong>Plan:</strong> ${escapeHtml(tierName)}</p>
      <p style="margin:0 0 4px;font-size:14px;color:${TEXT_COLOR};line-height:1.6;"><strong>Amount Paid:</strong> KSh ${amount.toLocaleString()}</p>
      <p style="margin:0 0 4px;font-size:14px;color:${TEXT_COLOR};line-height:1.6;"><strong>M-Pesa Receipt:</strong> ${escapeHtml(mpesaReceiptNumber)}</p>
      <p style="margin:0;font-size:14px;color:${TEXT_COLOR};line-height:1.6;"><strong>Access Until:</strong> ${formattedEndDate}</p>
    `)}
    ${p("Log in to your dashboard to start browsing verified domestic workers.")}
    ${muted("You will need to renew your subscription before it expires to maintain uninterrupted access.")}
  `;

	await payload.sendEmail({
		to,
		subject: "Your subscription is active",
		html: baseTemplate(content),
	});
};

export {
	sendPaymentConfirmedEmail,
	sendSubscriptionActivatedEmail,
	sendVerificationApprovedEmail,
	sendVerificationRejectedEmail,
};
