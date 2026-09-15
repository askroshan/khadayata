import { describe, it, expect } from "vitest";
import {
  buildEmailHtml,
  pickInviteeName,
  type EmailTemplate,
} from "../../supabase/functions/send-email/templates";

/**
 * Regression suite for the email template engine.
 *
 * Production bug (2026-09-15): invitation emails showed literal HTML tags in
 * the body ("KhadayataOnline Admin" wrapped in visible <strong> text) and
 * greeted every invitee as "Member".
 *
 * Root causes:
 * 1. Template paragraphs mixed literal markup (<strong>, <br/>) into strings
 *    passed to a fully-escaping helper, so our own tags were escaped. Any fix
 *    must keep DYNAMIC values escaped while letting trusted template markup
 *    through — otherwise the next bug is an XSS hole.
 * 2. The reminder sender substituted a generic greeting for stub member rows
 *    without consulting the auth account metadata that holds the real name.
 *
 * Invariants enforced here (add every new template to ALL_TEMPLATES):
 * - No template ever emits escaped versions of our own markup.
 * - No template double-escapes entities.
 * - Dynamic values are always escaped, even when hostile.
 */

const ALL_TEMPLATES: EmailTemplate[] = [
  "welcome", "email_verification", "password_reset", "verification_approved",
  "verification_rejected", "verification_needs_info", "event_rsvp_confirmation",
  "event_rsvp_cancelled", "event_reminder", "event_created", "event_cancelled",
  "event_updated", "event_waitlist_promoted", "matrimonial_interest",
  "matrimonial_match_accepted", "matrimonial_match_declined",
  "matrimonial_profile_approved", "matrimonial_profile_rejected",
  "matrimonial_rishta_forwarded", "job_application_received",
  "job_application_status", "job_posted", "business_listing_approved",
  "business_listing_rejected", "chapter_joined", "chapter_role_assigned",
  "chapter_role_revoked", "chapter_transfer_requested",
  "chapter_transfer_approved", "chapter_announcement",
  "scholarship_application_received", "scholarship_application_status",
  "scholarship_awarded", "mentorship_request_received",
  "mentorship_request_accepted", "mentorship_request_declined",
  "mentorship_session_reminder", "obituary_published", "report_submitted",
  "report_actioned", "donation_receipt", "vouch_request", "vouch_completed",
  "membership_renewal", "new_message", "contact_form_confirmation",
  "contact_form_admin", "global_id_assigned", "family_invitation_sent",
  "chapter_admin_invite", "member_invitation", "chapter_transfer_history_update",
];

const ESCAPED_MARKUP = [
  "&lt;strong&gt;", "&lt;/strong&gt;", "&lt;br", "&lt;a ", "&lt;span",
  "&lt;/a&gt;", "&lt;/span&gt;", "&lt;img", "&lt;script",
];

describe("email templates: trusted markup renders as HTML", () => {
  it("no template emits escaped versions of our own tags", () => {
    for (const template of ALL_TEMPLATES) {
      const { html } = buildEmailHtml(template, { name: "Test" });
      for (const escaped of ESCAPED_MARKUP) {
        expect(html, `${template} emitted escaped markup ${escaped}`).not.toContain(escaped);
      }
      expect(html, `${template} double-escaped an entity`).not.toContain("&amp;amp;");
    }
  });

  it("member_invitation bolds the inviter name", () => {
    const { html } = buildEmailHtml("member_invitation", {
      name: "Kin", inviter_name: "KhadayataOnline Admin", accept_url: "https://x",
    });
    expect(html).toContain("<strong>KhadayataOnline Admin</strong>");
    expect(html).toContain("join <strong>KhadayataOnline</strong>");
  });

  it("welcome bolds the community name", () => {
    const { html } = buildEmailHtml("welcome", { name: "Kin" });
    expect(html).toContain("joined <strong>KhadayataOnline</strong>");
  });

  it("every template produces a complete document with a greeting", () => {
    for (const template of ALL_TEMPLATES) {
      const { subject, html } = buildEmailHtml(template, { name: "Test" });
      expect(subject.length).toBeGreaterThan(0);
      expect(html).toContain("<!DOCTYPE html>");
      expect(html, `${template} never addresses the recipient`).toMatch(/Hi Test|Congratulations, Test|Jai Jai Khadayata, Test|Great news, Test|Dear Test|In Memoriam|New Contact Form/);
    }
  });
});

describe("email templates: dynamic values stay escaped (XSS guard)", () => {
  it("member_invitation escapes a hostile recipient name", () => {
    const { html } = buildEmailHtml("member_invitation", {
      name: 'Eve <img src=x onerror="alert(1)">',
      inviter_name: "Admin",
    });
    expect(html).toContain("Hi Eve &lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
    // the only permitted raw <img> is the header logo
    const imgMatches = html.match(/<img[^>]*>/g) ?? [];
    for (const tag of imgMatches) {
      expect(tag, "unexpected raw img tag").toContain("khadayataonline.com/Screenshot");
    }
  });

  it("event_rsvp_confirmation escapes name and event title in the body", () => {
    const { html } = buildEmailHtml("event_rsvp_confirmation", {
      name: "A <b>B</b>",
      event_name: "Diwali <i>Night</i>",
    });
    expect(html).toContain("Hi A &lt;b&gt;B&lt;/b&gt;");
    expect(html).toContain("&lt;i&gt;Night&lt;/i&gt;");
    // body paragraphs must not contain the raw title markup
    const bodyStart = html.indexOf("body-pad");
    const bodyEnd = html.indexOf("footer-pad");
    const body = html.slice(bodyStart, bodyEnd);
    expect(body).not.toContain("<i>Night</i>");
  });

  it("verification_rejected escapes attacker-controlled notes", () => {
    const { html } = buildEmailHtml("verification_rejected", {
      name: "R", notes: "<script>x</script>",
    });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("vouch_request escapes the requester name while bolding it", () => {
    const { html } = buildEmailHtml("vouch_request", {
      name: "R", requester_name: "Bad <b>Actor</b>",
    });
    expect(html).toContain("<strong>Bad &lt;b&gt;Actor&lt;/b&gt;</strong>");
  });
});

describe("pickInviteeName", () => {
  it("prefers a real member name", () => {
    expect(pickInviteeName({ first_name: "Nikhil", last_name: "Shah" }, { first_name: "Ignored" })).toBe("Nikhil");
  });

  it("falls back to auth metadata for stub rows", () => {
    expect(pickInviteeName({ first_name: "Pending", last_name: "Verification" }, { first_name: "Nikhil" })).toBe("Nikhil");
    expect(pickInviteeName({ first_name: "Member", last_name: "Member" }, { first_name: "Priya" })).toBe("Priya");
  });

  it("ends at the generic greeting when nothing is known", () => {
    expect(pickInviteeName(null, null)).toBe("Member");
    expect(pickInviteeName({ first_name: "Member" }, {})).toBe("Member");
  });
});
