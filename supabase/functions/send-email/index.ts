import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const EMAILIT_API = "https://api.emailit.com/v2/emails";
const FROM_NAME = "KhadayataOnline";
const FROM_EMAIL = "noreply@khadayataonline.com";
const REPLY_TO = "support@khadayataonline.com";

const COMMUNITY_NAME = "KhadayataOnline";
const ADDR_LINE1 = "1320 Pepperhill Ln";
const ADDR_LINE2 = "Fort Worth, TX 76131";
const PHONE = "+1 (682) 432-9400";
const WEBSITE = "https://khadayataonline.com";

function baseTemplate(content: string, preheader = ""): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${COMMUNITY_NAME}</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f5f2ee;font-family:'Segoe UI',Arial,sans-serif;">
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>` : ""}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f2ee;">
    <tr>
      <td align="center" style="padding:24px 16px;">
        <!-- Container -->
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#b45309 0%,#d97706 50%,#7c3aed 100%);padding:32px 40px;text-align:center;">
              <h1 style="margin:0;font-size:24px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">${COMMUNITY_NAME}</h1>
              <p style="margin:6px 0 0;font-size:12px;color:rgba(255,255,255,0.75);letter-spacing:1.5px;text-transform:uppercase;">Heritage · Community · Identity</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              ${content}
            </td>
          </tr>
          <!-- Divider -->
          <tr>
            <td style="padding:0 40px;"><hr style="border:none;border-top:1px solid #e9e3db;margin:0;" /></td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;text-align:center;background-color:#faf8f5;">
              <p style="margin:0 0 4px;font-size:13px;color:#78716c;">${COMMUNITY_NAME}</p>
              <p style="margin:0 0 4px;font-size:12px;color:#a8a29e;">${ADDR_LINE1}, ${ADDR_LINE2}</p>
              <p style="margin:0 0 12px;font-size:12px;color:#a8a29e;">Phone: ${PHONE}</p>
              <p style="margin:0;font-size:11px;color:#c4b9ae;">
                You received this email because you are a member of ${COMMUNITY_NAME}.<br/>
                To manage your email preferences, <a href="${WEBSITE}/settings?tab=notifications" style="color:#b45309;text-decoration:none;">update your settings</a>.
              </p>
            </td>
          </tr>
        </table>
        <!-- CAN-SPAM unsubscribe line -->
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;margin-top:16px;">
          <tr>
            <td style="text-align:center;">
              <p style="font-size:11px;color:#a8a29e;margin:0;">
                &copy; ${new Date().getFullYear()} ${COMMUNITY_NAME}. All rights reserved. &bull;
                <a href="${WEBSITE}/settings?tab=notifications" style="color:#a8a29e;">Unsubscribe</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

type EmailTemplate =
  | "welcome"
  | "email_verification"
  | "password_reset"
  | "verification_approved"
  | "verification_rejected"
  | "verification_needs_info"
  | "event_rsvp_confirmation"
  | "event_reminder"
  | "matrimonial_interest"
  | "matrimonial_match_accepted"
  | "new_message"
  | "vouch_request"
  | "membership_renewal"
  | "contact_form_confirmation"
  | "contact_form_admin";

function buildEmailHtml(template: EmailTemplate, vars: Record<string, string>): { subject: string; html: string } {
  const name = vars.name ?? "Member";

  switch (template) {
    case "welcome": {
      const subject = `Welcome to ${COMMUNITY_NAME}, ${name}!`;
      const html = baseTemplate(`
        <h2 style="margin:0 0 16px;font-size:28px;font-weight:700;color:#1c1917;">Jai Jai Khadayata! 🙏</h2>
        <p style="margin:0 0 16px;font-size:16px;color:#44403c;line-height:1.7;">
          Dear ${name},<br/><br/>
          Welcome to <strong>${COMMUNITY_NAME}</strong> — the global home for the Khadayata community.
          Your account has been created successfully.
        </p>
        <p style="margin:0 0 24px;font-size:15px;color:#57534e;line-height:1.7;">
          Here's what you can do to get started:
        </p>
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
          ${["Complete your profile", "Connect with your chapter", "Explore the member directory", "Discover events near you"].map((step, i) => `
          <tr>
            <td style="padding:10px 0;vertical-align:top;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="width:32px;height:32px;background:linear-gradient(135deg,#b45309,#d97706);border-radius:50%;text-align:center;vertical-align:middle;">
                    <span style="font-size:13px;font-weight:700;color:#fff;">${i + 1}</span>
                  </td>
                  <td style="padding-left:12px;font-size:14px;color:#44403c;">${step}</td>
                </tr>
              </table>
            </td>
          </tr>`).join("")}
        </table>
        <div style="margin:32px 0 0;text-align:center;">
          <a href="${WEBSITE}/dashboard" style="display:inline-block;background:linear-gradient(135deg,#b45309,#d97706);color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:8px;">
            Go to Dashboard &rarr;
          </a>
        </div>
      `, `Welcome to ${COMMUNITY_NAME}! Start exploring your community.`);
      return { subject, html };
    }

    case "email_verification": {
      const subject = `Verify your email — ${COMMUNITY_NAME}`;
      const html = baseTemplate(`
        <h2 style="margin:0 0 16px;font-size:26px;font-weight:700;color:#1c1917;">Verify Your Email</h2>
        <p style="margin:0 0 24px;font-size:15px;color:#44403c;line-height:1.7;">
          Hi ${name},<br/><br/>
          Please verify your email address to complete your registration. Click the button below — this link expires in 24 hours.
        </p>
        <div style="text-align:center;margin:32px 0;">
          <a href="${vars.verification_url ?? "#"}" style="display:inline-block;background:linear-gradient(135deg,#b45309,#d97706);color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 40px;border-radius:8px;">
            Verify Email Address
          </a>
        </div>
        <p style="margin:0;font-size:13px;color:#78716c;text-align:center;">
          If you did not create an account, please ignore this email.
        </p>
      `, "Confirm your email to complete registration.");
      return { subject, html };
    }

    case "password_reset": {
      const subject = `Reset your password — ${COMMUNITY_NAME}`;
      const html = baseTemplate(`
        <h2 style="margin:0 0 16px;font-size:26px;font-weight:700;color:#1c1917;">Reset Your Password</h2>
        <p style="margin:0 0 24px;font-size:15px;color:#44403c;line-height:1.7;">
          Hi ${name},<br/><br/>
          We received a request to reset your password. Click below to choose a new one. This link expires in 1 hour.
        </p>
        <div style="text-align:center;margin:32px 0;">
          <a href="${vars.reset_url ?? "#"}" style="display:inline-block;background:linear-gradient(135deg,#b45309,#d97706);color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 40px;border-radius:8px;">
            Reset Password
          </a>
        </div>
        <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;padding:16px;margin-top:16px;">
          <p style="margin:0;font-size:13px;color:#92400e;">
            <strong>Security tip:</strong> If you did not request a password reset, your account may be at risk. Please contact us immediately at <a href="mailto:support@khadayataonline.com" style="color:#b45309;">support@khadayataonline.com</a>.
          </p>
        </div>
      `, "Reset your KhadayataOnline password.");
      return { subject, html };
    }

    case "verification_approved": {
      const subject = `Your verification is approved — ${COMMUNITY_NAME}`;
      const html = baseTemplate(`
        <div style="text-align:center;margin-bottom:24px;">
          <div style="display:inline-block;width:64px;height:64px;background:linear-gradient(135deg,#16a34a,#22c55e);border-radius:50%;line-height:64px;font-size:28px;">✓</div>
        </div>
        <h2 style="margin:0 0 16px;font-size:26px;font-weight:700;color:#1c1917;text-align:center;">Verification Approved!</h2>
        <p style="margin:0 0 16px;font-size:15px;color:#44403c;line-height:1.7;text-align:center;">
          Congratulations ${name}! Your identity has been verified.<br/>
          Your account has been upgraded to <strong>Level ${vars.level ?? "1"}</strong>.
        </p>
        ${vars.notes ? `<p style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;font-size:14px;color:#166534;margin:0 0 24px;">${vars.notes}</p>` : ""}
        <div style="text-align:center;margin-top:24px;">
          <a href="${WEBSITE}/profile" style="display:inline-block;background:linear-gradient(135deg,#b45309,#d97706);color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:8px;">
            View Your Profile
          </a>
        </div>
      `, "Your KhadayataOnline identity has been verified.");
      return { subject, html };
    }

    case "verification_rejected": {
      const subject = `Verification update — ${COMMUNITY_NAME}`;
      const html = baseTemplate(`
        <h2 style="margin:0 0 16px;font-size:26px;font-weight:700;color:#1c1917;">Verification Update</h2>
        <p style="margin:0 0 16px;font-size:15px;color:#44403c;line-height:1.7;">
          Hi ${name},<br/><br/>
          After reviewing your verification request, we were unable to approve it at this time.
        </p>
        ${vars.notes ? `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin:0 0 24px;"><p style="margin:0;font-size:14px;color:#991b1b;"><strong>Reason:</strong> ${vars.notes}</p></div>` : ""}
        <p style="margin:0 0 24px;font-size:15px;color:#44403c;line-height:1.7;">
          You may resubmit your verification with the required documents. If you have questions, please contact your chapter admin or reach us at <a href="mailto:support@khadayataonline.com" style="color:#b45309;">support@khadayataonline.com</a>.
        </p>
        <div style="text-align:center;">
          <a href="${WEBSITE}/settings?tab=verification" style="display:inline-block;background:linear-gradient(135deg,#b45309,#d97706);color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:8px;">
            Resubmit Verification
          </a>
        </div>
      `, "An update on your KhadayataOnline verification request.");
      return { subject, html };
    }

    case "verification_needs_info": {
      const subject = `Additional information needed — ${COMMUNITY_NAME}`;
      const html = baseTemplate(`
        <h2 style="margin:0 0 16px;font-size:26px;font-weight:700;color:#1c1917;">Additional Information Needed</h2>
        <p style="margin:0 0 16px;font-size:15px;color:#44403c;line-height:1.7;">
          Hi ${name},<br/><br/>
          Your verification request is under review. We need a little more information to proceed.
        </p>
        ${vars.notes ? `<div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:16px;margin:0 0 24px;"><p style="margin:0;font-size:14px;color:#92400e;"><strong>What we need:</strong> ${vars.notes}</p></div>` : ""}
        <div style="text-align:center;">
          <a href="${WEBSITE}/settings?tab=verification" style="display:inline-block;background:linear-gradient(135deg,#b45309,#d97706);color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:8px;">
            Update Verification
          </a>
        </div>
      `, "We need a bit more info to verify your KhadayataOnline identity.");
      return { subject, html };
    }

    case "event_rsvp_confirmation": {
      const subject = `RSVP confirmed: ${vars.event_name ?? "Event"} — ${COMMUNITY_NAME}`;
      const html = baseTemplate(`
        <div style="text-align:center;margin-bottom:24px;">
          <div style="display:inline-block;width:64px;height:64px;background:linear-gradient(135deg,#b45309,#d97706);border-radius:50%;line-height:64px;font-size:24px;">📅</div>
        </div>
        <h2 style="margin:0 0 8px;font-size:26px;font-weight:700;color:#1c1917;text-align:center;">You're Going!</h2>
        <p style="margin:0 0 24px;font-size:15px;color:#57534e;text-align:center;">Your RSVP for <strong>${vars.event_name ?? "the event"}</strong> has been confirmed.</p>
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#faf8f5;border-radius:8px;margin-bottom:24px;">
          <tr><td style="padding:20px;">
            ${vars.event_date ? `<p style="margin:0 0 8px;font-size:14px;color:#44403c;"><strong>Date:</strong> ${vars.event_date}</p>` : ""}
            ${vars.event_venue ? `<p style="margin:0 0 8px;font-size:14px;color:#44403c;"><strong>Venue:</strong> ${vars.event_venue}</p>` : ""}
            ${vars.event_address ? `<p style="margin:0;font-size:14px;color:#44403c;"><strong>Address:</strong> ${vars.event_address}</p>` : ""}
          </td></tr>
        </table>
        <p style="margin:0 0 24px;font-size:13px;color:#78716c;text-align:center;">
          You can cancel your RSVP anytime by visiting the Events page.
        </p>
        <div style="text-align:center;">
          <a href="${WEBSITE}/events" style="display:inline-block;background:linear-gradient(135deg,#b45309,#d97706);color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:8px;">
            View Events
          </a>
        </div>
      `, `RSVP confirmed for ${vars.event_name ?? "your event"}.`);
      return { subject, html };
    }

    case "event_reminder": {
      const subject = `Reminder: ${vars.event_name ?? "Your event"} is tomorrow — ${COMMUNITY_NAME}`;
      const html = baseTemplate(`
        <h2 style="margin:0 0 16px;font-size:26px;font-weight:700;color:#1c1917;">Event Reminder</h2>
        <p style="margin:0 0 16px;font-size:15px;color:#44403c;line-height:1.7;">
          Hi ${name},<br/><br/>
          Just a friendly reminder that <strong>${vars.event_name ?? "your event"}</strong> is coming up!
        </p>
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#faf8f5;border-radius:8px;margin-bottom:24px;">
          <tr><td style="padding:20px;">
            ${vars.event_date ? `<p style="margin:0 0 8px;font-size:14px;color:#44403c;"><strong>When:</strong> ${vars.event_date}</p>` : ""}
            ${vars.event_venue ? `<p style="margin:0;font-size:14px;color:#44403c;"><strong>Where:</strong> ${vars.event_venue}</p>` : ""}
          </td></tr>
        </table>
        <div style="text-align:center;">
          <a href="${WEBSITE}/events" style="display:inline-block;background:linear-gradient(135deg,#b45309,#d97706);color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:8px;">
            View Event Details
          </a>
        </div>
      `, `Reminder: ${vars.event_name ?? "Your event"} is coming up soon.`);
      return { subject, html };
    }

    case "matrimonial_interest": {
      const subject = `Someone expressed interest in your profile — ${COMMUNITY_NAME}`;
      const html = baseTemplate(`
        <div style="text-align:center;margin-bottom:24px;">
          <div style="display:inline-block;width:64px;height:64px;background:linear-gradient(135deg,#ec4899,#f97316);border-radius:50%;line-height:64px;font-size:24px;">💐</div>
        </div>
        <h2 style="margin:0 0 16px;font-size:26px;font-weight:700;color:#1c1917;text-align:center;">New Interest!</h2>
        <p style="margin:0 0 16px;font-size:15px;color:#44403c;line-height:1.7;text-align:center;">
          Hi ${name},<br/><br/>
          <strong>${vars.sender_name ?? "A community member"}</strong> has expressed interest in your matrimonial profile.
        </p>
        ${vars.message ? `<div style="background:#fdf2f8;border:1px solid #fbcfe8;border-radius:8px;padding:16px;margin:0 0 24px;"><p style="margin:0;font-size:14px;color:#831843;font-style:italic;">"${vars.message}"</p></div>` : ""}
        <p style="margin:0 0 24px;font-size:13px;color:#78716c;text-align:center;">
          Your contact details are only shared after both parties accept the introduction.
        </p>
        <div style="text-align:center;">
          <a href="${WEBSITE}/matrimonial" style="display:inline-block;background:linear-gradient(135deg,#b45309,#d97706);color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:8px;">
            View Profile &amp; Respond
          </a>
        </div>
      `, "Someone from the community is interested in your matrimonial profile.");
      return { subject, html };
    }

    case "matrimonial_match_accepted": {
      const subject = `Your introduction has been accepted — ${COMMUNITY_NAME}`;
      const html = baseTemplate(`
        <div style="text-align:center;margin-bottom:24px;">
          <div style="display:inline-block;width:64px;height:64px;background:linear-gradient(135deg,#16a34a,#22c55e);border-radius:50%;line-height:64px;font-size:24px;">🌸</div>
        </div>
        <h2 style="margin:0 0 16px;font-size:26px;font-weight:700;color:#1c1917;text-align:center;">Introduction Accepted!</h2>
        <p style="margin:0 0 16px;font-size:15px;color:#44403c;line-height:1.7;text-align:center;">
          Wonderful news, ${name}!<br/><br/>
          <strong>${vars.other_name ?? "The other member"}</strong> has accepted your introduction request.
          You may now proceed to exchange contact information through a family elder or chapter admin.
        </p>
        <div style="text-align:center;">
          <a href="${WEBSITE}/matrimonial" style="display:inline-block;background:linear-gradient(135deg,#b45309,#d97706);color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:8px;">
            Continue in Matrimonial
          </a>
        </div>
      `, "Your matrimonial introduction has been accepted.");
      return { subject, html };
    }

    case "vouch_request": {
      const subject = `Vouch request from ${vars.requester_name ?? "a member"} — ${COMMUNITY_NAME}`;
      const html = baseTemplate(`
        <h2 style="margin:0 0 16px;font-size:26px;font-weight:700;color:#1c1917;">Vouch Request</h2>
        <p style="margin:0 0 16px;font-size:15px;color:#44403c;line-height:1.7;">
          Hi ${name},<br/><br/>
          <strong>${vars.requester_name ?? "A community member"}</strong> has requested you vouch for their identity on ${COMMUNITY_NAME}.
          Vouching confirms that you personally know this person and can attest to their being a community member.
        </p>
        ${vars.message ? `<div style="background:#faf8f5;border:1px solid #e7e0d9;border-radius:8px;padding:16px;margin:0 0 24px;"><p style="margin:0;font-size:14px;color:#57534e;font-style:italic;">"${vars.message}"</p></div>` : ""}
        <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;padding:14px;margin:0 0 24px;">
          <p style="margin:0;font-size:13px;color:#92400e;">
            <strong>Important:</strong> Only vouch for someone you personally know. False vouches may result in account suspension.
          </p>
        </div>
        <div style="text-align:center;">
          <a href="${WEBSITE}/profile/${vars.requester_id ?? ""}" style="display:inline-block;background:linear-gradient(135deg,#b45309,#d97706);color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:8px;">
            Review &amp; Respond
          </a>
        </div>
      `, `${vars.requester_name ?? "A community member"} is requesting your vouch on ${COMMUNITY_NAME}.`);
      return { subject, html };
    }

    case "membership_renewal": {
      const subject = `Membership renewal reminder — ${COMMUNITY_NAME}`;
      const html = baseTemplate(`
        <h2 style="margin:0 0 16px;font-size:26px;font-weight:700;color:#1c1917;">Membership Renewal</h2>
        <p style="margin:0 0 16px;font-size:15px;color:#44403c;line-height:1.7;">
          Hi ${name},<br/><br/>
          Your ${COMMUNITY_NAME} membership ${vars.expires_date ? `expires on <strong>${vars.expires_date}</strong>` : "is coming up for renewal"}.
          Renew now to continue enjoying all platform features.
        </p>
        <div style="text-align:center;margin-top:24px;">
          <a href="${WEBSITE}/settings?tab=account" style="display:inline-block;background:linear-gradient(135deg,#b45309,#d97706);color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:8px;">
            Renew Membership
          </a>
        </div>
      `, "Your KhadayataOnline membership is up for renewal.");
      return { subject, html };
    }

    case "contact_form_confirmation": {
      const subject = `We received your message — ${COMMUNITY_NAME}`;
      const html = baseTemplate(`
        <h2 style="margin:0 0 16px;font-size:26px;font-weight:700;color:#1c1917;">Thank You for Contacting Us</h2>
        <p style="margin:0 0 16px;font-size:15px;color:#44403c;line-height:1.7;">
          Hi ${name},<br/><br/>
          Thank you for reaching out to ${COMMUNITY_NAME}. We have received your message and will get back to you within 2-3 business days.
        </p>
        ${vars.message_preview ? `<div style="background:#faf8f5;border-left:4px solid #d97706;padding:16px;margin:0 0 24px;border-radius:0 8px 8px 0;"><p style="margin:0;font-size:14px;color:#57534e;font-style:italic;">"${vars.message_preview}"</p></div>` : ""}
        <p style="margin:0;font-size:14px;color:#78716c;line-height:1.6;">
          For urgent matters, please contact us at:<br/>
          <strong>Phone:</strong> ${PHONE}<br/>
          <strong>Email:</strong> <a href="mailto:support@khadayataonline.com" style="color:#b45309;">support@khadayataonline.com</a>
        </p>
      `, "We received your message and will respond within 2-3 business days.");
      return { subject, html };
    }

    case "contact_form_admin": {
      const subject = `New contact form submission from ${name} — ${COMMUNITY_NAME}`;
      const html = baseTemplate(`
        <h2 style="margin:0 0 16px;font-size:26px;font-weight:700;color:#1c1917;">New Contact Form Submission</h2>
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#faf8f5;border-radius:8px;margin-bottom:24px;">
          <tr><td style="padding:20px;">
            <p style="margin:0 0 8px;font-size:14px;color:#44403c;"><strong>Name:</strong> ${name}</p>
            ${vars.email ? `<p style="margin:0 0 8px;font-size:14px;color:#44403c;"><strong>Email:</strong> ${vars.email}</p>` : ""}
            ${vars.phone ? `<p style="margin:0 0 8px;font-size:14px;color:#44403c;"><strong>Phone:</strong> ${vars.phone}</p>` : ""}
            ${vars.subject_line ? `<p style="margin:0 0 8px;font-size:14px;color:#44403c;"><strong>Subject:</strong> ${vars.subject_line}</p>` : ""}
            ${vars.message ? `<p style="margin:0;font-size:14px;color:#44403c;"><strong>Message:</strong><br/>${vars.message}</p>` : ""}
          </td></tr>
        </table>
      `);
      return { subject, html };
    }

    default: {
      const subject = `Notification from ${COMMUNITY_NAME}`;
      const html = baseTemplate(`
        <p style="font-size:15px;color:#44403c;line-height:1.7;">Hi ${name},<br/><br/>${vars.message ?? "You have a new notification from KhadayataOnline."}</p>
        <div style="text-align:center;margin-top:24px;">
          <a href="${WEBSITE}/dashboard" style="display:inline-block;background:linear-gradient(135deg,#b45309,#d97706);color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:8px;">View Dashboard</a>
        </div>
      `);
      return { subject, html };
    }
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const emailitKey = Deno.env.get("EMAILIT_API_KEY");
    if (!emailitKey) {
      return new Response(
        JSON.stringify({ error: "Email not configured. Add EMAILIT_API_KEY secret." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { template, to, vars = {}, override_subject, override_html } = body as {
      template: EmailTemplate;
      to: string | string[];
      vars?: Record<string, string>;
      override_subject?: string;
      override_html?: string;
    };

    if (!to || !template) {
      return new Response(JSON.stringify({ error: "to and template are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { subject, html } = buildEmailHtml(template, vars);

    const payload = {
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: Array.isArray(to) ? to : [to],
      subject: override_subject ?? subject,
      html: override_html ?? html,
      reply_to: REPLY_TO,
    };

    const emailRes = await fetch(EMAILIT_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${emailitKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const emailResult = await emailRes.json().catch(() => ({}));

    if (!emailRes.ok) {
      return new Response(
        JSON.stringify({ error: "Emailit error", details: emailResult }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, result: emailResult }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
