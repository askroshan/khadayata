// Email template definitions shared by the send-email edge function and the
// Vitest suite in src/test/email-templates.test.ts. Keep Deno-specific code
// (env vars, fetch) out of this module.
//
// Escaping model: helpers that take a plain string escape it fully. Helpers
// that take a segment array escape plain string segments and pass { raw }
// segments through — raw is reserved for trusted template markup (<strong>,
// <br/>, our own links), NEVER for dynamic values.
const COMMUNITY_NAME = "KhadayataOnline";
const ADDR_LINE1 = "Fort Worth";
const ADDR_LINE2 = "TX";
const PHONE = "+1 972 371 0001";
const WEBSITE = "https://khadayataonline.com";
const LOGO_URL = "https://khadayataonline.com/Screenshot_2026-03-16_at_9.18.14_AM.png";

// Khadayata Brand Palette — derived from logo
// WCAG 2.2 AA: all text/bg combinations maintain ≥ 4.5:1 contrast
const BG = "#FDF8F2";               // warm ivory — matches logo bg feel
const CARD = "#FFFFFF";
// Header: rich saffron-to-gold gradient (no black)
const HEADER_SAFFRON = "#C85E0A";   // deep saffron — 6.1:1 on white
const HEADER_GOLD = "#D4860A";      // warm gold
const HEADER_BG = "#1A1108";         // deep warm dark for ID card bg
const HEADER_TEXT = "#FFFFFF";      // white on saffron — 4.9:1 ✓
const HEADER_SUBTEXT = "#FFE0B2";   // soft peach on saffron — readable
// Body
const ACCENT = "#C85E0A";           // saffron — 6.1:1 on white ✓
const ACCENT_LIGHT = "#E87C1E";     // logo orange
const TEXT = "#2D1A0E";             // deep warm brown — 14:1 on white ✓
const TEXT_MUTED = "#5C3D1E";       // medium warm brown — 7.2:1 ✓
const TEXT_FAINT = "#8C6239";       // muted amber-brown — 4.6:1 ✓
const BORDER = "#F0DCC0";           // warm sand border
const FOOTER_BG = "#FFF7ED";        // very light saffron wash
// Status colors — all WCAG AA on their backgrounds
const GREEN = "#166534";            // forest green — 7.3:1 on white ✓
const GREEN_BG = "#F0FDF4";
const GREEN_BORDER = "#86EFAC";
const RED = "#991B1B";              // deep red — 6.8:1 ✓
const RED_BG = "#FFF1F2";
const RED_BORDER = "#FCA5A5";
const AMBER = "#78350F";            // dark amber — 8.4:1 ✓
const AMBER_BG = "#FFFBEB";
const AMBER_BORDER = "#FDE68A";
const BLUE = "#0A4F8C";             // peacock blue from logo — 7.1:1 ✓
const BLUE_BG = "#EFF8FF";
const BLUE_BORDER = "#BAE6FD";

function baseTemplate(content: string, preheader: string): string {
  const year = new Date().getFullYear().toString();
  const pre = preheader
    ? '<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;color:' +
      BG + ';">' + escapeHtml(preheader) + "&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>"
    : "";
  return (
    "<!DOCTYPE html>" +
    '<html lang="en">' +
    "<head>" +
    '<meta charset="UTF-8" />' +
    '<meta name="viewport" content="width=device-width, initial-scale=1.0" />' +
    '<meta http-equiv="X-UA-Compatible" content="IE=edge" />' +
    "<title>" + COMMUNITY_NAME + "</title>" +
    "<style>" +
    "body{margin:0;padding:0;background-color:" + BG + ";font-family:'Helvetica Neue',Arial,sans-serif;}" +
    "a{color:" + ACCENT + ";text-decoration:none;}" +
    "img{border:0;display:block;}" +
    "@media only screen and (max-width:640px){" +
    ".container{width:100%!important;}" +
    ".body-pad{padding:32px 20px!important;}" +
    ".footer-pad{padding:24px 20px!important;}" +
    "}" +
    "</style>" +
    "</head>" +
    '<body style="margin:0;padding:0;background-color:' + BG + ';">' +
    pre +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:' + BG + ';">' +
    "<tr>" +
    '<td align="center" style="padding:40px 16px;">' +
    '<table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:' + CARD + ';border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(200,94,10,0.12);">' +

    // ── Header: warm saffron-to-gold gradient, no black ──
    "<tr>" +
    '<td style="background:linear-gradient(135deg,' + HEADER_SAFFRON + ' 0%,' + HEADER_GOLD + ' 50%,' + ACCENT_LIGHT + ' 100%);padding:0;">' +
    // decorative top stripe — peacock teal
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0">' +
    "<tr><td style=\"height:4px;background:linear-gradient(90deg,#0A4F8C 0%,#0091A8 40%,#5CB85C 70%,#D4007A 100%);font-size:0;line-height:0;\">&nbsp;</td></tr>" +
    "<tr>" +
    '<td style="padding:24px 40px 20px;">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0">' +
    "<tr>" +
    '<td style="vertical-align:middle;">' +
    '<img src="' + LOGO_URL + '" alt="' + COMMUNITY_NAME + '" width="56" height="56" style="display:inline-block;border-radius:8px;vertical-align:middle;margin-right:14px;background:#fff;padding:3px;" />' +
    '<span style="display:inline-block;vertical-align:middle;">' +
    '<span style="font-size:19px;font-weight:800;color:' + HEADER_TEXT + ';letter-spacing:-0.3px;text-shadow:0 1px 2px rgba(0,0,0,0.15);">Khadayata</span><span style="font-size:19px;font-weight:400;color:' + HEADER_TEXT + ';">Online</span><br/>' +
    '<span style="font-size:9px;color:' + HEADER_SUBTEXT + ';letter-spacing:2.5px;text-transform:uppercase;font-weight:600;">HERITAGE &bull; COMMUNITY &bull; IDENTITY</span>' +
    "</span>" +
    "</td>" +
    '<td align="right" style="vertical-align:middle;">' +
    '<span style="font-size:9px;color:' + HEADER_SUBTEXT + ';letter-spacing:1.5px;text-transform:uppercase;font-weight:500;">Member Portal</span>' +
    "</td>" +
    "</tr>" +
    "</table>" +
    "</td>" +
    "</tr>" +
    "</table>" +
    "</td>" +
    "</tr>" +

    // ── Body ──
    "<tr>" +
    '<td class="body-pad" style="padding:44px 48px 36px;">' +
    content +
    "</td>" +
    "</tr>" +

    // ── Divider ──
    "<tr>" +
    '<td style="padding:0 48px;"><hr style="border:none;border-top:1px solid ' + BORDER + ';margin:0;" /></td>' +
    "</tr>" +

    // ── Footer ──
    "<tr>" +
    '<td class="footer-pad" style="padding:24px 48px 28px;background-color:' + FOOTER_BG + ';text-align:center;">' +
    // mini rainbow stripe in footer too
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">' +
    "<tr><td style=\"height:3px;background:linear-gradient(90deg," + HEADER_SAFFRON + " 0%," + HEADER_GOLD + " 30%,#5CB85C 60%,#0091A8 100%);border-radius:2px;font-size:0;line-height:0;\">&nbsp;</td></tr>" +
    "</table>" +
    '<p style="margin:0 0 4px;font-size:13px;font-weight:700;color:' + TEXT_MUTED + ';">' + COMMUNITY_NAME + "</p>" +
    '<p style="margin:0 0 2px;font-size:12px;color:' + TEXT_FAINT + ';">' + ADDR_LINE1 + ", " + ADDR_LINE2 + " &bull; " + PHONE + "</p>" +
    '<p style="margin:12px 0 0;font-size:11px;color:' + TEXT_FAINT + ';line-height:1.8;">' +
    "You are receiving this email as a registered member of " + COMMUNITY_NAME + ".<br/>" +
    '<a href="' + WEBSITE + '/settings?tab=notifications" style="color:' + ACCENT + ';text-decoration:underline;">Manage preferences</a>' +
    " &bull; " +
    '<a href="' + WEBSITE + '/settings?tab=notifications" style="color:' + ACCENT + ';text-decoration:underline;">Unsubscribe</a>' +
    "</p>" +
    "</td>" +
    "</tr>" +

    "</table>" +

    '<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;margin-top:16px;">' +
    "<tr>" +
    '<td style="text-align:center;">' +
    '<p style="font-size:11px;color:' + TEXT_FAINT + ';margin:0;">' +
    "&copy; " + year + " " + COMMUNITY_NAME + ". All rights reserved." +
    ' &bull; <a href="' + WEBSITE + '/privacy" style="color:' + TEXT_FAINT + ';text-decoration:underline;">Privacy Policy</a>' +
    ' &bull; <a href="' + WEBSITE + '/terms" style="color:' + TEXT_FAINT + ';text-decoration:underline;">Terms of Service</a>' +
    "</p>" +
    "</td>" +
    "</tr>" +
    "</table>" +

    "</td>" +
    "</tr>" +
    "</table>" +
    "</body>" +
    "</html>"
  );
}

function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}

type Segment = string | { raw?: string };

function renderSegments(segments: Segment[]): string {
  let inner = "";
  for (const seg of segments) {
    inner += typeof seg === "string" ? escapeHtml(seg) : (seg.raw ?? "");
  }
  return inner;
}

function h1(text: string): string {
  return '<h1 style="margin:0 0 20px;font-size:26px;font-weight:800;color:' + TEXT + ';letter-spacing:-0.5px;line-height:1.25;">' + escapeHtml(text) + "</h1>";
}

function p(content: string | Segment[], style = ""): string {
  const inner = typeof content === "string" ? escapeHtml(content) : renderSegments(content);
  return '<p style="margin:0 0 20px;font-size:15px;color:' + TEXT_MUTED + ';line-height:1.75;' + style + '">' + inner + "</p>";
}

function pt(text: string): string { return p(text, ""); }

// Paragraph with trusted markup: string segments are escaped, { raw } segments
// are our own tags and pass through untouched.
function prich(segments: Segment[], style = ""): string {
  return p(segments, style);
}

function prt(segments: Segment[]): string { return prich(segments, ""); }

function btn(label: string, href: string): string {
  return (
    '<table role="presentation" cellpadding="0" cellspacing="0" style="margin:32px auto 0;">' +
    "<tr>" +
    '<td style="border-radius:6px;background:linear-gradient(135deg,' + HEADER_SAFFRON + ' 0%,' + ACCENT_LIGHT + ' 100%);box-shadow:0 4px 14px rgba(200,94,10,0.35);">' +
    '<a href="' + escapeHtml(href) + '" style="display:inline-block;background:transparent;color:#FFFFFF;font-size:15px;font-weight:700;text-decoration:none;padding:14px 36px;border-radius:6px;letter-spacing:0.4px;">' +
    escapeHtml(label) + " &rarr;" +
    "</a>" +
    "</td>" +
    "</tr>" +
    "</table>"
  );
}

function infoRows(rows: Array<{ label: string; value: string }>): string {
  let inner = "";
  for (const r of rows) {
    inner +=
      '<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:10px;">' +
      "<tr>" +
      '<td style="font-size:11px;font-weight:600;color:' + TEXT_FAINT + ';text-transform:uppercase;letter-spacing:1px;width:120px;vertical-align:top;padding-top:2px;">' + escapeHtml(r.label) + "</td>" +
      '<td style="font-size:14px;color:' + TEXT + ';font-weight:500;vertical-align:top;">' + escapeHtml(r.value) + "</td>" +
      "</tr>" +
      "</table>";
  }
  return (
    '<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:' + BG + ';border:1px solid ' + BORDER + ';border-radius:6px;margin:24px 0;">' +
    "<tr><td style=\"padding:20px 24px;\">" +
    inner +
    "</td></tr>" +
    "</table>"
  );
}

function kvGrid(pairs: Array<{ label: string; value: string }>): string {
  let rows = "";
  for (const pair of pairs) {
    rows +=
      "<tr>" +
      '<td style="font-size:12px;color:' + TEXT_FAINT + ';font-weight:600;text-transform:uppercase;letter-spacing:0.8px;padding:5px 12px 5px 0;width:130px;vertical-align:top;">' + escapeHtml(pair.label) + "</td>" +
      '<td style="font-size:14px;color:' + TEXT + ';font-weight:500;padding:5px 0;vertical-align:top;">' + escapeHtml(pair.value) + "</td>" +
      "</tr>";
  }
  return (
    '<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:' + BG + ';border:1px solid ' + BORDER + ';border-radius:6px;margin:20px 0 24px;">' +
    "<tr><td style=\"padding:20px 24px;\">" +
    '<table role="presentation" cellpadding="0" cellspacing="0" width="100%">' +
    rows +
    "</table>" +
    "</td></tr>" +
    "</table>"
  );
}

function alert(content: string | Segment[], type: string): string {
  let bg = AMBER_BG, border = AMBER_BORDER, color = AMBER;
  if (type === "error")   { bg = RED_BG;   border = RED_BORDER;   color = RED; }
  if (type === "success") { bg = GREEN_BG; border = GREEN_BORDER; color = GREEN; }
  if (type === "info")    { bg = BLUE_BG;  border = BLUE_BORDER;  color = BLUE; }
  const inner = typeof content === "string" ? escapeHtml(content) : renderSegments(content);
  return (
    '<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:' + bg + ';border-left:3px solid ' + border + ';border-radius:0 6px 6px 0;margin:16px 0;">' +
    "<tr><td style=\"padding:14px 18px;font-size:14px;color:" + color + ";line-height:1.65;font-weight:500;\">" +
    inner +
    "</td></tr>" +
    "</table>"
  );
}

function label(text: string): string {
  return '<p style="margin:0 0 8px;font-size:10px;font-weight:700;color:' + ACCENT + ';letter-spacing:2.5px;text-transform:uppercase;">' + escapeHtml(text) + "</p>";
}

function icon(emoji: string, color: string): string {
  return (
    '<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 28px;">' +
    '<tr><td style="width:64px;height:64px;background:linear-gradient(135deg,' + color + ' 0%,' + HEADER_GOLD + ' 100%);border-radius:50%;text-align:center;vertical-align:middle;font-size:26px;line-height:64px;box-shadow:0 4px 12px rgba(200,94,10,0.25);">' +
    emoji +
    "</td></tr>" +
    "</table>"
  );
}

function quote(text: string): string {
  return (
    '<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:' + FOOTER_BG + ';border-left:4px solid ' + ACCENT_LIGHT + ';border-radius:0 6px 6px 0;margin:0 0 24px;">' +
    '<tr><td style="padding:16px 20px;font-size:15px;color:' + TEXT_MUTED + ';font-style:italic;line-height:1.75;">&ldquo;' + escapeHtml(text) + '&rdquo;</td></tr>' +
    "</table>"
  );
}

export type EmailTemplate =
  | "welcome"
  | "email_verification"
  | "password_reset"
  | "verification_approved"
  | "verification_rejected"
  | "verification_needs_info"
  | "event_rsvp_confirmation"
  | "event_rsvp_cancelled"
  | "event_reminder"
  | "event_created"
  | "event_cancelled"
  | "event_updated"
  | "event_waitlist_promoted"
  | "matrimonial_interest"
  | "matrimonial_match_accepted"
  | "matrimonial_match_declined"
  | "matrimonial_profile_approved"
  | "matrimonial_profile_rejected"
  | "matrimonial_rishta_forwarded"
  | "job_application_received"
  | "job_application_status"
  | "job_posted"
  | "business_listing_approved"
  | "business_listing_rejected"
  | "chapter_joined"
  | "chapter_role_assigned"
  | "chapter_role_revoked"
  | "chapter_transfer_requested"
  | "chapter_transfer_approved"
  | "chapter_announcement"
  | "scholarship_application_received"
  | "scholarship_application_status"
  | "scholarship_awarded"
  | "mentorship_request_received"
  | "mentorship_request_accepted"
  | "mentorship_request_declined"
  | "mentorship_session_reminder"
  | "obituary_published"
  | "report_submitted"
  | "report_actioned"
  | "donation_receipt"
  | "vouch_request"
  | "vouch_completed"
  | "membership_renewal"
  | "new_message"
  | "contact_form_confirmation"
  | "contact_form_admin"
  | "global_id_assigned"
  | "family_invitation_sent"
  | "chapter_admin_invite"
  | "member_invitation"
  | "chapter_transfer_history_update";

export function buildEmailHtml(template: EmailTemplate, vars: Record<string, string>): { subject: string; html: string } {
  const name = vars.name ?? "Member";

  if (template === "welcome") {
    const steps = [
      ["Complete your profile", "Add your photo, bio, and family details"],
      ["Connect with your chapter", "Find and join your local Khadayata chapter"],
      ["Explore the directory", "Browse community members worldwide"],
      ["Discover upcoming events", "RSVP for cultural gatherings near you"],
    ];
    let stepRows = "";
    for (let i = 0; i < steps.length; i++) {
      stepRows +=
        "<tr>" +
        '<td style="padding:10px 0;border-bottom:1px solid ' + BORDER + ';">' +
        '<table role="presentation" cellpadding="0" cellspacing="0"><tr>' +
        '<td style="width:32px;height:32px;background-color:' + ACCENT + ';border-radius:50%;text-align:center;vertical-align:middle;font-size:13px;font-weight:700;color:#fff;">' + (i + 1) + "</td>" +
        '<td style="padding-left:14px;">' +
        '<p style="margin:0 0 2px;font-size:14px;font-weight:600;color:' + TEXT + ';">' + steps[i][0] + "</p>" +
        '<p style="margin:0;font-size:12px;color:' + TEXT_FAINT + ';">' + steps[i][1] + "</p>" +
        "</td>" +
        "</tr></table>" +
        "</td>" +
        "</tr>";
    }
    const content =
      h1("Jai Jai Khadayata, " + name + "!") +
      prt([{ raw: "You have successfully joined <strong>" }, COMMUNITY_NAME, { raw: "</strong> — the global home for the Khadayata community. Your account is now active." }]) +
      label("Getting Started") +
      '<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 32px;">' + stepRows + "</table>" +
      btn("Go to Dashboard", WEBSITE + "/dashboard");
    return { subject: "Welcome to " + COMMUNITY_NAME + ", " + name, html: baseTemplate(content, "Welcome to " + COMMUNITY_NAME + " — your community awaits.") };
  }

  if (template === "email_verification") {
    const url = vars.verification_url ?? "#";
    const content =
      h1("Verify Your Email") +
      prt(["Hi ", name, { raw: ",<br/><br/>Thank you for registering. Please confirm your email address to activate all platform features. This link expires in <strong>24 hours</strong>." }]) +
      btn("Verify Email Address", url) +
      prich(["If the button does not work, copy and paste this link into your browser:", { raw: '<br/><span style="word-break:break-all;font-family:monospace;font-size:12px;">' + escapeHtml(url) + "</span>" }], "font-size:14px;") +
      p("If you did not create a " + COMMUNITY_NAME + " account, you may safely ignore this email.", "font-size:13px;color:" + TEXT_FAINT + ";margin-top:24px;");
    return { subject: "Verify your email address — " + COMMUNITY_NAME, html: baseTemplate(content, "Confirm your email to complete registration.") };
  }

  if (template === "password_reset") {
    const url = vars.reset_url ?? "#";
    const content =
      h1("Reset Your Password") +
      prt(["Hi ", name, { raw: ",<br/><br/>We received a request to reset your password. Click below to set a new password. This link expires in <strong>1 hour</strong>." }]) +
      btn("Reset Password", url) +
      alert([{ raw: "<strong>Security Notice:</strong> If you did not request a password reset, please contact us at " }, { raw: '<a href="mailto:support@khadayataonline.com" style="color:' + AMBER + ';">support@khadayataonline.com</a>' }, { raw: " or call " + PHONE + "." }], "warning");
    return { subject: "Password reset request — " + COMMUNITY_NAME, html: baseTemplate(content, "Reset your KhadayataOnline password.") };
  }

  if (template === "verification_approved") {
    const level = vars.level ?? "1";
    const pairs: Array<{ label: string; value: string }> = [
      { label: "Status", value: "Verified" },
      { label: "Level Granted", value: "Level " + level },
    ];
    if (vars.notes) pairs.push({ label: "Notes", value: vars.notes });
    const content =
      icon("&#10003;", GREEN) +
      h1("Verification Approved") +
      prt(["Congratulations, ", name, { raw: ". Your identity has been verified and your account has been upgraded to <strong>Level " }, level, { raw: "</strong>." }]) +
      kvGrid(pairs) +
      p("You now have access to all Level " + level + " features including the member directory, matrimonial listings, and more.", "font-size:14px;") +
      btn("View Your Profile", WEBSITE + "/profile");
    return { subject: "Identity verified — Level " + level + " — " + COMMUNITY_NAME, html: baseTemplate(content, "Your KhadayataOnline identity has been verified.") };
  }

  if (template === "verification_rejected") {
    const content =
      h1("Verification Update") +
      prt(["Hi ", name, { raw: ",<br/><br/>After reviewing your verification submission, we were unable to approve it at this time." }]) +
      (vars.notes ? alert([{ raw: "<strong>Reason:</strong> " }, vars.notes], "error") : "") +
      prich(["You may resubmit with updated documentation. If you believe this was an error, please contact your chapter admin or email ", { raw: '<a href="mailto:support@khadayataonline.com">support@khadayataonline.com</a>.' }]) +
      btn("Resubmit Verification", WEBSITE + "/settings?tab=verification");
    return { subject: "Verification update — action required — " + COMMUNITY_NAME, html: baseTemplate(content, "An update on your KhadayataOnline verification.") };
  }

  if (template === "verification_needs_info") {
    const content =
      h1("Action Required") +
      prt(["Hi ", name, { raw: ",<br/><br/>Your verification request is currently under review. Our team requires additional information to complete the assessment." }]) +
      (vars.notes ? alert([{ raw: "<strong>What we need:</strong> " }, vars.notes], "warning") : "") +
      pt("Please log in to your account and update your verification submission.") +
      btn("Update Verification", WEBSITE + "/settings?tab=verification");
    return { subject: "Additional information needed — " + COMMUNITY_NAME, html: baseTemplate(content, "We need a bit more information to verify your identity.") };
  }

  if (template === "event_rsvp_confirmation") {
    const rows: Array<{ label: string; value: string }> = [];
    if (vars.event_date) rows.push({ label: "Date & Time", value: vars.event_date });
    if (vars.event_venue) rows.push({ label: "Venue", value: vars.event_venue });
    if (vars.event_address) rows.push({ label: "Address", value: vars.event_address });
    if (vars.ticket_id) rows.push({ label: "RSVP Ref", value: vars.ticket_id });
    const content =
      icon("&#10003;", ACCENT) +
      h1("You're Registered!") +
      prt(["Hi ", name, { raw: ", your RSVP for <strong>" }, vars.event_name ?? "the event", { raw: "</strong> has been confirmed." }]) +
      (rows.length ? infoRows(rows) : "") +
      alert("You may cancel your RSVP at any time by visiting the Events page.", "info") +
      btn("View Event Details", WEBSITE + "/events");
    return { subject: "RSVP confirmed: " + (vars.event_name ?? "Event") + " — " + COMMUNITY_NAME, html: baseTemplate(content, "RSVP confirmed for " + (vars.event_name ?? "your event") + ".") };
  }

  if (template === "event_rsvp_cancelled") {
    const rows: Array<{ label: string; value: string }> = [];
    if (vars.event_date) rows.push({ label: "Date", value: vars.event_date });
    if (vars.event_venue) rows.push({ label: "Venue", value: vars.event_venue });
    const content =
      h1("RSVP Cancelled") +
      prt(["Hi ", name, { raw: ", your RSVP for <strong>" }, vars.event_name ?? "the event", { raw: "</strong> has been cancelled as requested." }]) +
      (rows.length ? infoRows(rows) : "") +
      pt("If you change your mind, you are welcome to re-register as long as capacity is available.") +
      btn("Browse Other Events", WEBSITE + "/events");
    return { subject: "RSVP cancelled: " + (vars.event_name ?? "Event") + " — " + COMMUNITY_NAME, html: baseTemplate(content, "Your RSVP has been cancelled.") };
  }

  if (template === "event_reminder") {
    const rows: Array<{ label: string; value: string }> = [];
    if (vars.event_date) rows.push({ label: "When", value: vars.event_date });
    if (vars.event_venue) rows.push({ label: "Where", value: vars.event_venue });
    if (vars.event_address) rows.push({ label: "Address", value: vars.event_address });
    const content =
      h1("Event Reminder") +
      prt(["Hi ", name, { raw: ", this is a friendly reminder that <strong>" }, vars.event_name ?? "your event", { raw: "</strong> is coming up soon." }]) +
      (rows.length ? infoRows(rows) : "") +
      btn("View Event Details", WEBSITE + "/events");
    return { subject: "Reminder: " + (vars.event_name ?? "Your event") + " is tomorrow — " + COMMUNITY_NAME, html: baseTemplate(content, "Reminder: " + (vars.event_name ?? "Your event") + " is coming up soon.") };
  }

  if (template === "event_created") {
    const rows: Array<{ label: string; value: string }> = [{ label: "Event", value: vars.event_name ?? "TBD" }];
    if (vars.event_date) rows.push({ label: "Date", value: vars.event_date });
    if (vars.event_venue) rows.push({ label: "Venue", value: vars.event_venue });
    if (vars.event_type) rows.push({ label: "Category", value: vars.event_type });
    const content =
      h1("New Event Announced") +
      prt(["Hi ", name, { raw: ", a new event has been published" }, ...(vars.chapter_name ? [{ raw: " by the <strong>" }, vars.chapter_name, { raw: "</strong> chapter" }] : []), { raw: "." }]) +
      infoRows(rows) +
      btn("RSVP Now", WEBSITE + "/events");
    return { subject: "New event: " + (vars.event_name ?? "Event") + " — " + COMMUNITY_NAME, html: baseTemplate(content, "New event — register now.") };
  }

  if (template === "event_cancelled") {
    const content =
      alert([{ raw: "<strong>Important:</strong> The following event has been cancelled." }], "error") +
      h1("Event Cancelled") +
      prt(["Hi ", name, { raw: ", we regret to inform you that <strong>" }, vars.event_name ?? "the event", { raw: "</strong> has been cancelled." }]) +
      (vars.reason ? kvGrid([{ label: "Reason", value: vars.reason }]) : "") +
      p("We apologise for any inconvenience. Please check the Events page for future opportunities.", "font-size:14px;") +
      btn("Browse Events", WEBSITE + "/events");
    return { subject: "Event cancelled: " + (vars.event_name ?? "Event") + " — " + COMMUNITY_NAME, html: baseTemplate(content, "Event cancelled.") };
  }

  if (template === "event_updated") {
    const rows: Array<{ label: string; value: string }> = [];
    if (vars.event_date) rows.push({ label: "New Date", value: vars.event_date });
    if (vars.event_venue) rows.push({ label: "New Venue", value: vars.event_venue });
    if (vars.event_address) rows.push({ label: "New Address", value: vars.event_address });
    if (vars.changes) rows.push({ label: "Changes", value: vars.changes });
    const content =
      h1("Event Details Updated") +
      prt(["Hi ", name, { raw: ", the details for <strong>" }, vars.event_name ?? "an event", { raw: "</strong> you RSVPed for have been updated." }]) +
      (rows.length ? infoRows(rows) : "") +
      btn("View Event", WEBSITE + "/events");
    return { subject: "Event updated: " + (vars.event_name ?? "Event") + " — " + COMMUNITY_NAME, html: baseTemplate(content, "Event updated.") };
  }

  if (template === "event_waitlist_promoted") {
    const rows: Array<{ label: string; value: string }> = [];
    if (vars.event_date) rows.push({ label: "Date", value: vars.event_date });
    if (vars.event_venue) rows.push({ label: "Venue", value: vars.event_venue });
    const content =
      icon("&#127881;", GREEN) +
      h1("A Spot Is Available!") +
      prt(["Great news, ", name, { raw: "! A spot has opened up for <strong>" }, vars.event_name ?? "the event", { raw: "</strong>. You have been moved from the waitlist to confirmed." }]) +
      (rows.length ? infoRows(rows) : "") +
      alert("Please confirm your attendance within 48 hours or your spot may be offered to the next person on the waitlist.", "warning") +
      btn("Confirm Attendance", WEBSITE + "/events");
    return { subject: "You're in! Spot available: " + (vars.event_name ?? "Event") + " — " + COMMUNITY_NAME, html: baseTemplate(content, "A spot opened up for you!") };
  }

  if (template === "matrimonial_interest") {
    const content =
      h1("New Interest in Your Profile") +
      prt(["Hi ", name, { raw: ",<br/><br/><strong>" }, vars.sender_name ?? "A community member", { raw: "</strong> has expressed interest in your matrimonial profile." }]) +
      (vars.message ? label("Their Message") + quote(vars.message) : "") +
      alert("For privacy and safety, contact details are only exchanged after both parties formally accept the introduction.", "info") +
      btn("View Profile & Respond", WEBSITE + "/matrimonial");
    return { subject: "New interest received — " + COMMUNITY_NAME + " Matrimonial", html: baseTemplate(content, "Someone from the community is interested in your profile.") };
  }

  if (template === "matrimonial_match_accepted") {
    const content =
      icon("&#128144;", GREEN) +
      h1("Introduction Accepted") +
      prt(["Congratulations, ", name, { raw: "!<br/><br/><strong>" }, vars.other_name ?? "The other member", { raw: "</strong> has accepted your introduction. The next step is to connect through a family elder or your chapter admin who will facilitate the exchange of contact information." }]) +
      alert("All further communication should be conducted through trusted family channels as per community tradition.", "info") +
      btn("Continue in Matrimonial", WEBSITE + "/matrimonial");
    return { subject: "Introduction accepted — " + COMMUNITY_NAME + " Matrimonial", html: baseTemplate(content, "Your matrimonial introduction has been accepted.") };
  }

  if (template === "matrimonial_match_declined") {
    const content =
      h1("Introduction Update") +
      prt(["Hi ", name, { raw: ",<br/><br/>We wanted to let you know that <strong>" }, vars.other_name ?? "the other member", { raw: "</strong> has respectfully declined the introduction." }]) +
      pt("There are many wonderful profiles on " + COMMUNITY_NAME + ". We encourage you to continue exploring.") +
      btn("Browse Profiles", WEBSITE + "/matrimonial");
    return { subject: "Introduction update — " + COMMUNITY_NAME + " Matrimonial", html: baseTemplate(content, "An update on your matrimonial introduction.") };
  }

  if (template === "matrimonial_profile_approved") {
    const content =
      icon("&#10003;", GREEN) +
      h1("Profile Approved") +
      pt("Hi " + name + ", your matrimonial profile has been reviewed and approved. It is now visible to community members within your privacy settings.") +
      btn("View Your Profile", WEBSITE + "/matrimonial");
    return { subject: "Matrimonial profile approved — " + COMMUNITY_NAME, html: baseTemplate(content, "Your matrimonial profile is now live.") };
  }

  if (template === "matrimonial_profile_rejected") {
    const content =
      h1("Profile Review Update") +
      pt("Hi " + name + ", your matrimonial profile requires some changes before it can be published.") +
      (vars.notes ? alert([{ raw: "<strong>Feedback:</strong> " }, vars.notes], "warning") : "") +
      pt("Please update your profile and resubmit for review. If you have questions, contact your chapter admin.") +
      btn("Update Profile", WEBSITE + "/matrimonial");
    return { subject: "Matrimonial profile review — " + COMMUNITY_NAME, html: baseTemplate(content, "Your matrimonial profile needs updates.") };
  }

  if (template === "matrimonial_rishta_forwarded") {
    const rows: Array<{ label: string; value: string }> = [];
    if (vars.candidate_name) rows.push({ label: "Candidate", value: vars.candidate_name });
    if (vars.forwarded_by) rows.push({ label: "Forwarded By", value: vars.forwarded_by });
    if (vars.notes) rows.push({ label: "Notes", value: vars.notes });
    const content =
      h1("Rishta Forwarded") +
      prt(["Hi ", name, { raw: ",<br/><br/>A chapter elder or admin has forwarded rishta details for <strong>" }, vars.candidate_name ?? "a prospective match", { raw: "</strong> to your family." }]) +
      (rows.length ? infoRows(rows) : "") +
      pt("Please discuss with your family and respond at your earliest convenience.") +
      btn("View Matrimonial", WEBSITE + "/matrimonial");
    return { subject: "Rishta details forwarded — " + COMMUNITY_NAME, html: baseTemplate(content, "A rishta has been forwarded to your family.") };
  }

  if (template === "job_application_received") {
    const pairs: Array<{ label: string; value: string }> = [{ label: "Position", value: vars.job_title ?? "N/A" }];
    if (vars.company) pairs.push({ label: "Company", value: vars.company });
    if (vars.location) pairs.push({ label: "Location", value: vars.location });
    pairs.push({ label: "Status", value: "Under Review" });
    const content =
      icon("&#128203;", ACCENT) +
      h1("Application Received") +
      prt(["Hi ", name, { raw: ", your application for <strong>" }, vars.job_title ?? "the position", ...(vars.company ? [{ raw: " at <strong>" }, vars.company, { raw: "</strong>" }] : []), { raw: " has been received." }]) +
      kvGrid(pairs) +
      p("The hiring team will review your application and follow up directly.", "font-size:14px;") +
      btn("View Applications", WEBSITE + "/business");
    return { subject: "Application received: " + (vars.job_title ?? "Position") + " — " + COMMUNITY_NAME, html: baseTemplate(content, "Your job application has been received.") };
  }

  if (template === "job_application_status") {
    const statusLabels: Record<string, string> = {
      reviewing: "Under Review", shortlisted: "Shortlisted",
      interview: "Interview Scheduled", offered: "Offer Extended", rejected: "Not Selected",
    };
    const statusLabel = statusLabels[vars.status ?? "reviewing"] ?? "Under Review";
    const pairs: Array<{ label: string; value: string }> = [{ label: "Position", value: vars.job_title ?? "N/A" }];
    if (vars.company) pairs.push({ label: "Company", value: vars.company });
    pairs.push({ label: "New Status", value: statusLabel });
    const content =
      h1("Application Status Update") +
      prt(["Hi ", name, { raw: ", there is an update on your application for <strong>" }, vars.job_title ?? "the position", { raw: "</strong>." }]) +
      kvGrid(pairs) +
      (vars.notes ? alert(vars.notes, "info") : "") +
      btn("View Application", WEBSITE + "/business");
    return { subject: "Application update: " + (vars.job_title ?? "Position") + " — " + COMMUNITY_NAME, html: baseTemplate(content, "Update on your job application.") };
  }

  if (template === "job_posted") {
    const rows: Array<{ label: string; value: string }> = [{ label: "Position", value: vars.job_title ?? "N/A" }];
    if (vars.company) rows.push({ label: "Company", value: vars.company });
    if (vars.location) rows.push({ label: "Location", value: vars.location });
    if (vars.job_type) rows.push({ label: "Type", value: vars.job_type });
    if (vars.salary_range) rows.push({ label: "Salary", value: vars.salary_range });
    if (vars.deadline) rows.push({ label: "Apply By", value: vars.deadline });
    const content =
      h1("New Job Opportunity") +
      pt("Hi " + name + ", a new job has been posted in the " + COMMUNITY_NAME + " community.") +
      infoRows(rows) +
      btn("View & Apply", WEBSITE + "/business");
    return { subject: "New job opportunity: " + (vars.job_title ?? "Position") + " — " + COMMUNITY_NAME, html: baseTemplate(content, "New job posted — apply now.") };
  }

  if (template === "business_listing_approved") {
    const rows: Array<{ label: string; value: string }> = [{ label: "Business", value: vars.business_name ?? "N/A" }];
    if (vars.sector) rows.push({ label: "Sector", value: vars.sector });
    const content =
      icon("&#10003;", GREEN) +
      h1("Business Listing Approved") +
      prt(["Hi ", name, { raw: ", your business listing for <strong>" }, vars.business_name ?? "your business", { raw: "</strong> has been reviewed and is now live on the " }, COMMUNITY_NAME, { raw: " directory." }]) +
      infoRows(rows) +
      btn("View Listing", WEBSITE + "/business");
    return { subject: "Business listing approved — " + COMMUNITY_NAME, html: baseTemplate(content, "Your business listing is now live.") };
  }

  if (template === "business_listing_rejected") {
    const content =
      h1("Business Listing Update") +
      prt(["Hi ", name, { raw: ", your business listing for <strong>" }, vars.business_name ?? "your business", { raw: "</strong> requires some changes before it can be published." }]) +
      (vars.notes ? alert([{ raw: "<strong>Feedback:</strong> " }, vars.notes], "warning") : "") +
      btn("Update Listing", WEBSITE + "/business");
    return { subject: "Business listing review — " + COMMUNITY_NAME, html: baseTemplate(content, "Your business listing needs updates.") };
  }

  if (template === "chapter_joined") {
    const rows: Array<{ label: string; value: string }> = [{ label: "Chapter", value: vars.chapter_name ?? "N/A" }];
    if (vars.city) rows.push({ label: "Location", value: vars.city });
    const content =
      icon("&#127963;", ACCENT) +
      h1("Welcome to " + (vars.chapter_name ?? "Your Chapter") + "!") +
      prt(["Hi ", name, { raw: ", you have successfully joined the <strong>" }, vars.chapter_name ?? "chapter", { raw: "</strong>. You are now connected with your local Khadayata community." }]) +
      infoRows(rows) +
      pt("Explore upcoming chapter events, connect with fellow members, and get involved in community initiatives.") +
      btn("Explore Chapter", WEBSITE + "/chapters");
    return { subject: "Welcome to " + (vars.chapter_name ?? "your chapter") + " — " + COMMUNITY_NAME, html: baseTemplate(content, "You've joined " + (vars.chapter_name ?? "your chapter") + ".") };
  }

  if (template === "chapter_role_assigned") {
    const pairs: Array<{ label: string; value: string }> = [{ label: "Role Assigned", value: vars.role_name ?? "N/A" }];
    if (vars.chapter_name) pairs.push({ label: "Chapter", value: vars.chapter_name });
    if (vars.assigned_by) pairs.push({ label: "Assigned By", value: vars.assigned_by });
    if (vars.expires_at) pairs.push({ label: "Expires", value: vars.expires_at });
    const content =
      h1("Role Assignment") +
      pt("Hi " + name + ", you have been assigned a new role within " + COMMUNITY_NAME + ".") +
      kvGrid(pairs) +
      alert("Your new role grants additional administrative capabilities. Please use these responsibly in service of the community.", "info") +
      btn("Go to Dashboard", WEBSITE + "/dashboard");
    return { subject: "Role assigned: " + (vars.role_name ?? "Role") + " — " + COMMUNITY_NAME, html: baseTemplate(content, "You have been assigned a new role.") };
  }

  if (template === "chapter_role_revoked") {
    const content =
      h1("Role Update") +
      prt(["Hi ", name, { raw: ", your <strong>" }, vars.role_name ?? "role", { raw: "</strong>" }, ...(vars.chapter_name ? [" in the ", vars.chapter_name, " chapter"] : []), { raw: " has been updated." }]) +
      (vars.reason ? kvGrid([{ label: "Reason", value: vars.reason }]) : "") +
      pt("You retain your regular member access. If you have questions, please contact the platform admin.") +
      btn("Go to Dashboard", WEBSITE + "/dashboard");
    return { subject: "Role update: " + (vars.role_name ?? "Role") + " — " + COMMUNITY_NAME, html: baseTemplate(content, "Your role has been updated.") };
  }

  if (template === "chapter_transfer_requested") {
    const content =
      h1("Transfer Request Received") +
      prt(["Hi ", name, { raw: ", your request to transfer" }, ...(vars.from_chapter ? [{ raw: " from <strong>" }, vars.from_chapter, { raw: "</strong>" }] : []), ...(vars.to_chapter ? [{ raw: " to the <strong>" }, vars.to_chapter, { raw: "</strong> chapter" }] : []), { raw: " has been received." }]) +
      pt("The respective chapter admins will review your request. You will be notified once a decision is made, typically within 3-5 business days.") +
      btn("View Profile", WEBSITE + "/profile");
    return { subject: "Chapter transfer request received — " + COMMUNITY_NAME, html: baseTemplate(content, "Your chapter transfer request is being reviewed.") };
  }

  if (template === "chapter_transfer_approved") {
    const content =
      icon("&#10003;", GREEN) +
      h1("Transfer Approved") +
      prt(["Hi ", name, { raw: ", your chapter transfer" }, ...(vars.to_chapter ? [{ raw: " to the <strong>" }, vars.to_chapter, { raw: "</strong> chapter" }] : []), { raw: " has been approved." }]) +
      pt("You are now a member of your new chapter. Welcome to the community!") +
      btn("Explore New Chapter", WEBSITE + "/chapters");
    return { subject: "Chapter transfer approved — " + COMMUNITY_NAME, html: baseTemplate(content, "Your chapter transfer has been approved.") };
  }

  if (template === "chapter_announcement") {
    const content =
      label(vars.chapter_name ?? "Chapter Announcement") +
      h1(vars.announcement_title ?? "New Announcement") +
      pt("Hi " + name + ",") +
      (vars.announcement_body ? '<div style="font-size:15px;color:' + TEXT_MUTED + ';line-height:1.8;margin:0 0 24px;">' + vars.announcement_body + "</div>" : "") +
      btn("View Full Announcement", WEBSITE + "/news");
    return { subject: (vars.chapter_name ?? "Chapter") + ": " + (vars.announcement_title ?? "New Announcement") + " — " + COMMUNITY_NAME, html: baseTemplate(content, vars.announcement_title ?? "New chapter announcement.") };
  }

  if (template === "scholarship_application_received") {
    const pairs: Array<{ label: string; value: string }> = [{ label: "Scholarship", value: vars.scholarship_name ?? "N/A" }];
    if (vars.amount) pairs.push({ label: "Award", value: vars.amount });
    if (vars.deadline) pairs.push({ label: "Decision By", value: vars.deadline });
    pairs.push({ label: "Status", value: "Under Review" });
    const content =
      icon("&#127891;", ACCENT) +
      h1("Application Received") +
      prt(["Hi ", name, { raw: ", your application for the <strong>" }, vars.scholarship_name ?? "scholarship", { raw: "</strong> has been received." }]) +
      kvGrid(pairs) +
      p("The scholarship committee will review all applications and notify successful candidates.", "font-size:14px;") +
      btn("View Application", WEBSITE + "/scholarships");
    return { subject: "Scholarship application received — " + COMMUNITY_NAME, html: baseTemplate(content, "Your scholarship application has been received.") };
  }

  if (template === "scholarship_application_status") {
    const pairs: Array<{ label: string; value: string }> = [
      { label: "Scholarship", value: vars.scholarship_name ?? "N/A" },
      { label: "Status", value: vars.status ?? "Under Review" },
    ];
    if (vars.notes) pairs.push({ label: "Notes", value: vars.notes });
    const content =
      h1("Scholarship Application Update") +
      prt(["Hi ", name, { raw: ", there is an update on your application for the <strong>" }, vars.scholarship_name ?? "scholarship", { raw: "</strong>." }]) +
      kvGrid(pairs) +
      btn("View Scholarships", WEBSITE + "/scholarships");
    return { subject: "Scholarship update: " + (vars.scholarship_name ?? "Scholarship") + " — " + COMMUNITY_NAME, html: baseTemplate(content, "Update on your scholarship application.") };
  }

  if (template === "scholarship_awarded") {
    const pairs: Array<{ label: string; value: string }> = [{ label: "Scholarship", value: vars.scholarship_name ?? "N/A" }];
    if (vars.amount) pairs.push({ label: "Award Amount", value: vars.amount });
    if (vars.disbursement) pairs.push({ label: "Disbursement", value: vars.disbursement });
    const content =
      icon("&#127942;", ACCENT) +
      h1("Scholarship Awarded!") +
      prt(["Congratulations, ", name, { raw: "! We are delighted to inform you that you have been selected as a recipient of the <strong>" }, vars.scholarship_name ?? "scholarship", { raw: "</strong>." }]) +
      kvGrid(pairs) +
      pt("Your achievement is a credit to the Khadayata community. Keep excelling!") +
      btn("View Award Details", WEBSITE + "/scholarships");
    return { subject: "Congratulations! Scholarship awarded — " + COMMUNITY_NAME, html: baseTemplate(content, "Congratulations — your scholarship has been awarded!") };
  }

  if (template === "mentorship_request_received") {
    const pairs: Array<{ label: string; value: string }> = [{ label: "From", value: vars.requester_name ?? "Community Member" }];
    if (vars.topic) pairs.push({ label: "Topic", value: vars.topic });
    if (vars.message) pairs.push({ label: "Message", value: vars.message });
    const content =
      h1("New Mentorship Request") +
      prt(["Hi ", name, { raw: ", <strong>" }, vars.requester_name ?? "a community member", { raw: "</strong> has sent you a mentorship request." }]) +
      kvGrid(pairs) +
      btn("Review Request", WEBSITE + "/mentorship");
    return { subject: "New mentorship request — " + COMMUNITY_NAME, html: baseTemplate(content, "You have a new mentorship request.") };
  }

  if (template === "mentorship_request_accepted") {
    const pairs: Array<{ label: string; value: string }> = [{ label: "Mentor", value: vars.mentor_name ?? "N/A" }];
    if (vars.topic) pairs.push({ label: "Focus Area", value: vars.topic });
    const content =
      icon("&#129309;", ACCENT) +
      h1("Mentorship Accepted!") +
      prt(["Hi ", name, { raw: ", <strong>" }, vars.mentor_name ?? "your mentor", { raw: "</strong> has accepted your mentorship request. You can now coordinate and schedule your first session." }]) +
      kvGrid(pairs) +
      btn("Start Mentorship", WEBSITE + "/mentorship");
    return { subject: "Mentorship request accepted — " + COMMUNITY_NAME, html: baseTemplate(content, "Your mentorship request has been accepted.") };
  }

  if (template === "mentorship_request_declined") {
    const content =
      h1("Mentorship Update") +
      prt(["Hi ", name, { raw: ", <strong>" }, vars.mentor_name ?? "the mentor", { raw: "</strong> is unable to take on new mentees at this time and has respectfully declined your request." }]) +
      pt("There are many talented mentors available on " + COMMUNITY_NAME + ". We encourage you to explore other profiles.") +
      btn("Find a Mentor", WEBSITE + "/mentorship");
    return { subject: "Mentorship update — " + COMMUNITY_NAME, html: baseTemplate(content, "An update on your mentorship request.") };
  }

  if (template === "mentorship_session_reminder") {
    const rows: Array<{ label: string; value: string }> = [{ label: "With", value: vars.mentor_name ?? "Your Mentor" }];
    if (vars.session_date) rows.push({ label: "Date & Time", value: vars.session_date });
    if (vars.topic) rows.push({ label: "Topic", value: vars.topic });
    const content =
      h1("Upcoming Mentorship Session") +
      pt("Hi " + name + ", this is a reminder that you have a mentorship session coming up.") +
      infoRows(rows) +
      btn("View Mentorship", WEBSITE + "/mentorship");
    return { subject: "Session reminder: " + (vars.mentor_name ?? "Mentor") + " — " + COMMUNITY_NAME, html: baseTemplate(content, "Reminder about your upcoming mentorship session.") };
  }

  if (template === "obituary_published") {
    const pairs: Array<{ label: string; value: string }> = [];
    if (vars.deceased_name) pairs.push({ label: "Name", value: vars.deceased_name });
    if (vars.passed_date) pairs.push({ label: "Passed", value: vars.passed_date });
    if (vars.survived_by) pairs.push({ label: "Survived By", value: vars.survived_by });
    if (vars.funeral_details) pairs.push({ label: "Service Details", value: vars.funeral_details });
    const content =
      '<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;"><tr><td style="border-top:3px solid ' + TEXT + ';padding-top:24px;"></td></tr></table>' +
      h1("In Memoriam: " + (vars.deceased_name ?? "A Beloved Community Member")) +
      pt("Dear " + name + ",") +
      prt([{ raw: "The " + COMMUNITY_NAME + " community shares in the grief of the family of <strong>" }, vars.deceased_name ?? "a dear member", { raw: "</strong>." }]) +
      (pairs.length ? kvGrid(pairs) : "") +
      p("May the departed soul rest in eternal peace. We extend our heartfelt condolences to the bereaved family.", "font-style:italic;color:" + TEXT_FAINT + ";") +
      btn("View Obituary", WEBSITE + "/news");
    return { subject: "In Memoriam: " + (vars.deceased_name ?? "A Community Member") + " — " + COMMUNITY_NAME, html: baseTemplate(content, "In memoriam — a community member.") };
  }

  if (template === "report_submitted") {
    const pairs: Array<{ label: string; value: string }> = [];
    if (vars.report_type) pairs.push({ label: "Type", value: vars.report_type });
    if (vars.reference) pairs.push({ label: "Ref #", value: vars.reference });
    pairs.push({ label: "Status", value: "Under Review" });
    const content =
      icon("&#128203;", ACCENT) +
      h1("Report Received") +
      pt("Hi " + name + ", thank you for submitting a report. Our moderation team will review it within 48 hours.") +
      kvGrid(pairs) +
      alert("Your identity is kept confidential in all moderation proceedings.", "info") +
      btn("View Dashboard", WEBSITE + "/dashboard");
    return { subject: "Report submitted — " + COMMUNITY_NAME, html: baseTemplate(content, "Your report has been received.") };
  }

  if (template === "report_actioned") {
    const pairs: Array<{ label: string; value: string }> = [];
    if (vars.report_type) pairs.push({ label: "Type", value: vars.report_type });
    pairs.push({ label: "Outcome", value: vars.outcome ?? "Reviewed" });
    if (vars.notes) pairs.push({ label: "Details", value: vars.notes });
    const content =
      h1("Report Update") +
      pt("Hi " + name + ", there is an update on a report you submitted.") +
      kvGrid(pairs) +
      pt("Thank you for helping us maintain a safe and respectful community.") +
      btn("View Dashboard", WEBSITE + "/dashboard");
    return { subject: "Report update — " + COMMUNITY_NAME, html: baseTemplate(content, "An update on your submitted report.") };
  }

  if (template === "donation_receipt") {
    const pairs: Array<{ label: string; value: string }> = [
      { label: "Donor", value: name },
      { label: "Fund", value: vars.fund_name ?? COMMUNITY_NAME },
      { label: "Amount", value: vars.amount ?? "N/A" },
      { label: "Date", value: vars.donation_date ?? new Date().toDateString() },
    ];
    if (vars.receipt_id) pairs.push({ label: "Receipt #", value: vars.receipt_id });
    if (vars.currency) pairs.push({ label: "Currency", value: vars.currency });
    const content =
      icon("&#128591;", ACCENT) +
      h1("Thank You for Your Contribution") +
      prt(["Dear ", name, { raw: ",<br/><br/>Your generous donation to <strong>" }, vars.fund_name ?? COMMUNITY_NAME, { raw: "</strong> has been received. On behalf of the entire Khadayata community, we are deeply grateful for your seva." }]) +
      kvGrid(pairs) +
      alert("This email serves as your official donation acknowledgement. Please retain it for your records.", "info") +
      btn("View Donation History", WEBSITE + "/dashboard");
    return { subject: "Donation receipt — " + COMMUNITY_NAME, html: baseTemplate(content, "Your donation receipt from KhadayataOnline.") };
  }

  if (template === "vouch_request") {
    const content =
      h1("Vouch Request") +
      prt(["Hi ", name, { raw: ",<br/><br/><strong>" }, vars.requester_name ?? "A community member", { raw: "</strong> has asked you to vouch for their identity on " }, COMMUNITY_NAME, { raw: ". Vouching confirms that you personally know this individual and can attest to their community membership." }]) +
      (vars.message ? label("Their Message") + quote(vars.message) : "") +
      alert([{ raw: "<strong>Important:</strong> Only vouch for someone you personally know. Inaccurate vouches may result in account suspension." }], "warning") +
      btn("Review & Respond", WEBSITE + "/profile/" + (vars.requester_id ?? ""));
    return { subject: "Vouch request from " + (vars.requester_name ?? "a member") + " — " + COMMUNITY_NAME, html: baseTemplate(content, (vars.requester_name ?? "A community member") + " is requesting your vouch.") };
  }

  if (template === "vouch_completed") {
    const content =
      icon("&#10003;", GREEN) +
      h1("You've Been Vouched!") +
      prt(["Hi ", name, { raw: ", <strong>" }, vars.voucher_name ?? "a community member", { raw: "</strong> has vouched for your identity on " }, COMMUNITY_NAME, { raw: "." }]) +
      pt("You now have " + (vars.vouch_count ?? "additional") + " vouch(es). Once you reach the required number, you will be eligible for verification upgrade.") +
      btn("Check Verification Status", WEBSITE + "/settings?tab=verification");
    return { subject: "You have been vouched — " + COMMUNITY_NAME, html: baseTemplate(content, "You have been vouched by a community member.") };
  }

  if (template === "membership_renewal") {
    const content =
      h1("Membership Renewal") +
      prt(["Hi ", name, { raw: ", your " }, COMMUNITY_NAME, { raw: " membership " }, ...(vars.expires_date ? [{ raw: "expires on <strong>" }, vars.expires_date, { raw: "</strong>" }] : ["is coming up for renewal"]), { raw: "." }]) +
      pt("Renewing ensures you retain full access to all community features including events, the member directory, matrimonial listings, and more.") +
      btn("Renew Membership", WEBSITE + "/settings?tab=account");
    return { subject: "Membership renewal — " + COMMUNITY_NAME, html: baseTemplate(content, "Your KhadayataOnline membership is up for renewal.") };
  }

  if (template === "new_message") {
    const content =
      h1("New Notification") +
      pt("Hi " + name + ",") +
      (vars.message ? '<div style="font-size:15px;color:' + TEXT_MUTED + ';line-height:1.8;margin:0 0 24px;">' + vars.message + "</div>" : "") +
      btn("View Dashboard", WEBSITE + "/dashboard");
    return { subject: "New notification — " + COMMUNITY_NAME, html: baseTemplate(content, "You have a new notification from KhadayataOnline.") };
  }

  if (template === "contact_form_confirmation") {
    const content =
      h1("Thank You for Reaching Out") +
      prt(["Hi ", name, { raw: ",<br/><br/>We have received your message and will respond within 2-3 business days." }]) +
      (vars.message_preview ? label("Your Message") + quote(vars.message_preview) : "") +
      prich(["For urgent matters:", { raw: "<br/><strong>Phone:</strong> " + PHONE + "<br/><strong>Email:</strong> " }, { raw: '<a href="mailto:support@khadayataonline.com">support@khadayataonline.com</a>' }], "font-size:14px;");
    return { subject: "We received your message — " + COMMUNITY_NAME, html: baseTemplate(content, "We received your message and will respond shortly.") };
  }

  if (template === "contact_form_admin") {
    const pairs: Array<{ label: string; value: string }> = [{ label: "Name", value: name }];
    if (vars.email) pairs.push({ label: "Email", value: vars.email });
    if (vars.phone) pairs.push({ label: "Phone", value: vars.phone });
    if (vars.subject_line) pairs.push({ label: "Subject", value: vars.subject_line });
    const content =
      h1("New Contact Form Submission") +
      kvGrid(pairs) +
      (vars.message ? label("Message") + '<div style="background:' + BG + ';border:1px solid ' + BORDER + ';border-radius:6px;padding:16px 20px;font-size:14px;color:' + TEXT + ';line-height:1.8;margin-bottom:24px;">' + escapeHtml(vars.message) + "</div>" : "");
    return { subject: "Contact form: " + (vars.subject_line ?? "New submission") + " — " + name, html: baseTemplate(content, "New contact form submission.") };
  }

  if (template === "global_id_assigned") {
    const gid = vars.global_id ?? "KHD-000000";
    const content =
      icon("&#127759;", ACCENT) +
      h1("Your Global Khadayata ID") +
      prt(["Hi ", name, { raw: ",<br/><br/>Congratulations! Your unique <strong>Khadayata Global ID</strong> has been assigned. This is your permanent, portable identity across all chapters, events, and services on " }, COMMUNITY_NAME, { raw: "." }]) +
      '<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:24px 0;">' +
      '<tr><td style="background:' + HEADER_BG + ';border-radius:8px;padding:28px;text-align:center;">' +
      '<p style="margin:0 0 8px;font-size:11px;font-weight:700;color:rgba(255,255,255,0.45);letter-spacing:2px;text-transform:uppercase;">Your Global ID</p>' +
      '<p style="margin:0;font-size:32px;font-weight:800;color:#FFFFFF;letter-spacing:4px;font-family:monospace;">' + escapeHtml(gid) + '</p>' +
      (vars.chapter_name ? '<p style="margin:10px 0 0;font-size:12px;color:rgba(255,255,255,0.45);">' + escapeHtml(vars.chapter_name) + '</p>' : '') +
      '</td></tr></table>' +
      alert("Keep this ID safe. Use it when contacting any Khadayata chapter worldwide — it uniquely identifies you in our global network.", "info") +
      kvGrid([
        { label: "Assigned To", value: name },
        { label: "Global ID", value: gid },
        ...(vars.chapter_name ? [{ label: "Home Chapter", value: vars.chapter_name }] : []),
        { label: "Issued On", value: vars.issued_date ?? new Date().toDateString() },
      ]) +
      btn("View Your Profile", WEBSITE + "/profile");
    return { subject: "Your Khadayata Global ID: " + gid + " — " + COMMUNITY_NAME, html: baseTemplate(content, "Your unique Khadayata Global ID has been assigned.") };
  }

  if (template === "family_invitation_sent") {
    const inviterName = vars.inviter_name ?? "A community member";
    const relation = vars.relation ?? "family member";
    const joinUrl = vars.join_url ?? WEBSITE + "/auth";
    const content =
      icon("&#128106;", ACCENT) +
      h1("You've Been Invited to Connect on " + COMMUNITY_NAME) +
      prt(["Hi ", name, { raw: ",<br/><br/><strong>" }, inviterName, { raw: "</strong> has invited you to join <strong>" }, COMMUNITY_NAME, { raw: "</strong> and connect as their <strong>" }, relation, { raw: "</strong> in the Parivar (Family Tree)." }]) +
      alert(COMMUNITY_NAME + " is the global platform for the Khadayata community — connecting families, chapters, and heritage across the world.", "info") +
      kvGrid([
        { label: "Invited By", value: inviterName },
        { label: "Relation", value: relation.charAt(0).toUpperCase() + relation.slice(1) },
      ]) +
      pt("Join the community to accept this invitation and build your family connections.") +
      btn("Join " + COMMUNITY_NAME, joinUrl) +
      p("If you are already a member, sign in and visit your profile to find family connection requests.", "font-size:13px;color:" + TEXT_FAINT + ";margin-top:16px;");
    return {
      subject: inviterName + " has invited you to join " + COMMUNITY_NAME,
      html: baseTemplate(content, inviterName + " wants to connect with you on " + COMMUNITY_NAME + "."),
    };
  }

  if (template === "chapter_admin_invite") {
    const chapterName = vars.chapter_name ?? "your chapter";
    const chapterCity = vars.chapter_city ?? "";
    const chapterCountry = vars.chapter_country ?? "";
    const locationStr = [chapterCity, chapterCountry].filter(Boolean).join(", ");
    const loginUrl = vars.login_url ?? WEBSITE + "/auth";
    const adminUrl = vars.admin_url ?? WEBSITE + "/admin";
    const content =
      icon("&#127963;", ACCENT) +
      h1("You've Been Appointed Chapter Admin") +
      prt(["Hi ", name, { raw: ",<br/><br/>The Global Admin of <strong>" }, COMMUNITY_NAME, { raw: "</strong> has appointed you as the <strong>Chapter Admin</strong> for the " }, chapterName, { raw: ". This is an important leadership role in our community." }]) +
      kvGrid([
        { label: "Chapter", value: chapterName },
        ...(locationStr ? [{ label: "Location", value: locationStr }] : []),
        { label: "Role", value: "Chapter Admin" },
        { label: "Effective", value: new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) },
      ]) +
      alert("As Chapter Admin, you can manage members, events, announcements, roles, and chapter settings for the " + chapterName + ".", "info") +
      pt("Sign in to your account and navigate to the Admin panel to begin managing your chapter.") +
      btn("Open Admin Panel", adminUrl) +
      prich(["Need help getting started? Sign in at ", { raw: '<a href="' + escapeHtml(loginUrl) + '" style="color:' + ACCENT + ';">khadayataonline.com</a>' }, " and visit the Admin section."], "font-size:13px;color:" + TEXT_FAINT + ";margin-top:16px;");
    return {
      subject: "You've been appointed Chapter Admin — " + chapterName + " | " + COMMUNITY_NAME,
      html: baseTemplate(content, "You are now the Chapter Admin for " + chapterName + " on " + COMMUNITY_NAME + "."),
    };
  }

  if (template === "member_invitation") {
    const inviterName = vars.inviter_name ?? "The Admin";
    const chapterName = vars.chapter_name ?? "";
    const acceptUrl = vars.accept_url ?? WEBSITE + "/auth";
    const content =
      icon("&#127881;", ACCENT) +
      h1("You've Been Invited to Join " + COMMUNITY_NAME) +
      prt(["Hi ", name, { raw: ",<br/><br/><strong>" }, inviterName, { raw: "</strong> has invited you to join <strong>" }, COMMUNITY_NAME, { raw: "</strong> — the global platform connecting the Khadayata community across heritage, chapters, and identity." }]) +
      (chapterName ? kvGrid([{ label: "Your Chapter", value: chapterName }]) : "") +
      alert("This invitation link is unique to you and expires in 24 hours. Please set your password before it expires.", "warning") +
      pt("Click the button below to set your password and complete your registration:") +
      btn("Accept Invitation & Set Password", acceptUrl) +
      p("If you did not expect this invitation, you can safely ignore this email. No account will be created until you accept.", "font-size:13px;color:" + TEXT_FAINT + ";margin-top:16px;");
    return {
      subject: "You've been invited to join " + COMMUNITY_NAME,
      html: baseTemplate(content, inviterName + " has invited you to join " + COMMUNITY_NAME + "."),
    };
  }

  if (template === "chapter_transfer_history_update") {
    const rows: Array<{ label: string; value: string }> = [];
    if (vars.from_chapter) rows.push({ label: "Previous Chapter", value: vars.from_chapter });
    if (vars.to_chapter) rows.push({ label: "New Chapter", value: vars.to_chapter });
    if (vars.transfer_type) rows.push({ label: "Transfer Type", value: vars.transfer_type });
    if (vars.effective_date) rows.push({ label: "Effective Date", value: vars.effective_date });
    if (vars.reason) rows.push({ label: "Reason", value: vars.reason });
    const content =
      h1("Chapter Membership Updated") +
      pt("Hi " + name + ", your chapter membership has been updated on " + COMMUNITY_NAME + ".") +
      (rows.length ? infoRows(rows) : "") +
      alert("This change has been permanently recorded in your membership history. You can view your full chapter transfer history in your profile settings.", "info") +
      btn("View Membership History", WEBSITE + "/profile");
    return { subject: "Chapter membership updated — " + COMMUNITY_NAME, html: baseTemplate(content, "Your chapter membership has been updated.") };
  }

  const content =
    prt(["Hi ", name, { raw: ",<br/><br/>" }, vars.message ?? "You have a new notification from KhadayataOnline."]) +
    btn("View Dashboard", WEBSITE + "/dashboard");
  return { subject: "Notification from " + COMMUNITY_NAME, html: baseTemplate(content, "") };
}

// Choose the best available greeting name for an invitee. Stub placeholder
// names (created by auto-triggers or unnamed bulk invites) fall back to the
// auth account metadata, then to a generic greeting.
const STUB_FIRST_NAMES = new Set(["Pending", "Member", "Verification"]);

export function pickInviteeName(
  member: { first_name?: string | null; last_name?: string | null } | null,
  authMeta?: { first_name?: string | null; last_name?: string | null } | null
): string {
  const first = member?.first_name?.trim() ?? "";
  if (first && !STUB_FIRST_NAMES.has(first)) return first;
  const metaFirst = authMeta?.first_name?.trim() ?? "";
  if (metaFirst && !STUB_FIRST_NAMES.has(metaFirst)) return metaFirst;
  return first || metaFirst || "Member";
}
