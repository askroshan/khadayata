import { Link } from "react-router-dom";
import { Shield } from "lucide-react";
import PublicLayout from "@/components/PublicLayout";
import SEOMeta from "@/components/SEOMeta";

const LAST_UPDATED = "March 16, 2026";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-xl font-display font-bold text-foreground mb-4 pb-2 border-b border-border">{title}</h2>
      <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">{children}</div>
    </section>
  );
}

function DataRow({ label, detail }: { label: string; detail: string }) {
  return (
    <div className="flex items-start gap-3 py-2 border-b border-border/50 last:border-0">
      <span className="font-medium text-foreground min-w-[160px] shrink-0">{label}</span>
      <span>{detail}</span>
    </div>
  );
}

export default function PrivacyPolicy() {
  return (
    <PublicLayout title="Privacy Policy">
    <SEOMeta title="Privacy Policy" description="Khadayata Online's Privacy Policy explains how we collect, use, and protect your personal data in compliance with CCPA and applicable privacy laws." url="/privacy" />
    <div className="bg-background">
      <div className="container py-12 px-4 max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl gradient-hero flex items-center justify-center shrink-0">
            <Shield className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-extrabold text-foreground">Privacy Policy</h1>
            <p className="text-sm text-muted-foreground">Last updated: {LAST_UPDATED}</p>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-10 text-sm text-blue-800 leading-relaxed">
          KhadayataOnline is committed to protecting your privacy. This policy explains what data we collect, why we collect it, and how you can control it. We comply with applicable privacy laws including CCPA (California Consumer Privacy Act).
        </div>

        <Section title="1. Who We Are">
          <p>KhadayataOnline ("we," "our," "us") is a community platform serving the global Khadayata community, operated by KhadayataOnline Inc., located at 1320 Pepperhill Ln, Fort Worth, TX 76131. For privacy-related inquiries, contact us at <a href="mailto:privacy@khadayataonline.com" className="text-primary hover:underline">privacy@khadayataonline.com</a>.</p>
        </Section>

        <Section title="2. Information We Collect">
          <p>We collect the following categories of personal information:</p>
          <div className="bg-muted/40 rounded-xl p-4 mt-3">
            <DataRow label="Identity Data" detail="Full name, date of birth, gender, photographs, Global ID" />
            <DataRow label="Contact Data" detail="Email address, phone number, postal address" />
            <DataRow label="Community Data" detail="Chapter, gotra, native village, family connections, profession, education" />
            <DataRow label="Matrimonial Data" detail="Marital status, preferences, family background (if you opt into matrimonial services)" />
            <DataRow label="Heritage Data" detail="Oral history contributions, archive interactions, elder endorsements" />
            <DataRow label="Transaction Data" detail="Temple donations, event fees, service requests" />
            <DataRow label="Technical Data" detail="IP address, browser type, device info, cookies, usage logs" />
            <DataRow label="Communications" detail="Messages sent through the platform, support requests" />
          </div>
        </Section>

        <Section title="3. How We Use Your Information">
          <p>We use your personal information for the following purposes:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Platform operation:</strong> Creating and managing your account, verifying identity, enabling community connections;</li>
            <li><strong>Community services:</strong> Directory listings, event management, matrimonial introductions, business listings;</li>
            <li><strong>Communication:</strong> Sending transactional emails, event reminders, verification updates, and platform notifications;</li>
            <li><strong>Safety and moderation:</strong> Detecting and preventing fraud, abuse, and policy violations;</li>
            <li><strong>Heritage preservation:</strong> Archiving community history contributions;</li>
            <li><strong>Legal compliance:</strong> Meeting our legal obligations and enforcing our Terms of Use;</li>
            <li><strong>Platform improvement:</strong> Analyzing usage to improve features and user experience.</li>
          </ul>
          <p>We do not sell your personal data to third parties.</p>
        </Section>

        <Section title="4. Privacy Controls and Field-Level Visibility">
          <p>KhadayataOnline is built with privacy-first principles. You have granular control over who can see your profile information:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Public:</strong> Visible to anyone browsing the platform;</li>
            <li><strong>Verified Members Only:</strong> Visible to L1+ verified members;</li>
            <li><strong>Same Chapter Only:</strong> Visible only to members in your chapter;</li>
            <li><strong>Admin Only:</strong> Visible only to chapter and global administrators;</li>
            <li><strong>Hidden:</strong> Not visible to any other member.</li>
          </ul>
          <p>Sensitive fields such as phone number, email, date of birth, and address default to restricted visibility. You can update visibility settings at any time in <strong>Settings → Privacy</strong>.</p>
        </Section>

        <Section title="5. Information Sharing">
          <p>We share your information only in the following circumstances:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>With other members:</strong> Only as permitted by your visibility settings;</li>
            <li><strong>With chapter administrators:</strong> For verification and community management purposes;</li>
            <li><strong>With service providers:</strong> Including Supabase (database), Emailit (email delivery), Easify (SMS), Meta (WhatsApp) — all bound by data processing agreements;</li>
            <li><strong>Legal requirements:</strong> When required by law, court order, or government authority;</li>
            <li><strong>Business transfer:</strong> In the event of a merger, acquisition, or sale of assets, with notice to you.</li>
          </ul>
        </Section>

        <Section title="6. Data Retention">
          <p>We retain your personal data for as long as your account is active or as needed to provide services. Upon account deletion:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Profile and directory information is removed within 30 days;</li>
            <li>Anonymized analytics data may be retained;</li>
            <li>Transaction records (donations, fees) are retained for 7 years for financial compliance;</li>
            <li>Heritage archive contributions may be retained in anonymized form to preserve community history.</li>
          </ul>
        </Section>

        <Section title="7. Cookies and Tracking">
          <p>We use cookies and similar technologies to operate the Platform. See our <Link to="/cookie-policy" className="text-primary hover:underline">Cookie Policy</Link> for full details. You can manage cookie preferences through your browser settings or our cookie consent center.</p>
        </Section>

        <Section title="8. Your Rights">
          <p>Depending on your location, you may have the following rights regarding your personal data:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Access:</strong> Request a copy of your personal data;</li>
            <li><strong>Correction:</strong> Request correction of inaccurate data;</li>
            <li><strong>Deletion:</strong> Request deletion of your account and data;</li>
            <li><strong>Portability:</strong> Receive your data in a machine-readable format;</li>
            <li><strong>Objection:</strong> Object to certain types of processing;</li>
            <li><strong>Withdraw consent:</strong> Where processing is based on consent, you may withdraw it at any time.</li>
          </ul>
          <p>To exercise your rights, contact us at <a href="mailto:privacy@khadayataonline.com" className="text-primary hover:underline">privacy@khadayataonline.com</a> or through Settings → Privacy.</p>
        </Section>

        <Section title="9. California Privacy Rights (CCPA)">
          <p>California residents have additional rights under the California Consumer Privacy Act (CCPA):</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>The right to know what personal information we collect, use, disclose, and sell;</li>
            <li>The right to delete personal information we have collected from you;</li>
            <li>The right to opt-out of the sale of personal information (we do not sell personal information);</li>
            <li>The right to non-discrimination for exercising your privacy rights.</li>
          </ul>
          <p>To submit a CCPA request, email <a href="mailto:privacy@khadayataonline.com" className="text-primary hover:underline">privacy@khadayataonline.com</a>.</p>
        </Section>

        <Section title="10. Data Security">
          <p>We implement industry-standard security measures including:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>TLS encryption for all data in transit;</li>
            <li>Row-Level Security (RLS) in our database, ensuring users can only access their own data;</li>
            <li>Regular security audits and access control reviews;</li>
            <li>Two-factor authentication options for member accounts.</li>
          </ul>
          <p>No method of transmission over the Internet is 100% secure. We encourage you to use a strong, unique password for your account.</p>
        </Section>

        <Section title="11. Children's Privacy">
          <p>KhadayataOnline is not intended for children under 13. We do not knowingly collect personal information from children under 13. If you believe we have inadvertently collected such information, please contact us immediately.</p>
        </Section>

        <Section title="12. Changes to This Policy">
          <p>We may update this Privacy Policy periodically. We will notify you of significant changes via email or a prominent notice on the Platform. Your continued use after the effective date constitutes acceptance.</p>
        </Section>

        <Section title="13. Contact Us">
          <div className="bg-muted/50 rounded-xl p-4 mt-2">
            <p className="font-medium text-foreground">KhadayataOnline — Privacy Team</p>
            <p>1320 Pepperhill Ln, Fort Worth, TX 76131</p>
            <p>Phone: +1 (682) 432-9400</p>
            <p>Email: <a href="mailto:privacy@khadayataonline.com" className="text-primary hover:underline">privacy@khadayataonline.com</a></p>
          </div>
        </Section>
      </div>

    </div>
    </PublicLayout>
  );
}
