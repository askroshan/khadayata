import { Link } from "react-router-dom";
import { ArrowRight, FileText } from "lucide-react";
import patternOrnament from "@/assets/pattern-ornament.png";

const LAST_UPDATED = "March 16, 2026";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-xl font-display font-bold text-foreground mb-4 pb-2 border-b border-border">{title}</h2>
      <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">{children}</div>
    </section>
  );
}

export default function Terms() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container flex items-center justify-between py-3 sm:py-4">
          <Link to="/" className="flex items-center gap-2 min-w-0">
            <img src={patternOrnament} alt="" className="w-7 h-7 opacity-80 shrink-0" />
            <span className="text-base sm:text-xl font-display font-bold text-gradient-hero truncate">KhadayataOnline</span>
          </Link>
          <Link to="/auth" className="text-sm font-medium text-primary hover:text-primary/80 transition-colors flex items-center gap-1">
            Sign In <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </nav>

      <div className="container py-12 px-4 max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl gradient-hero flex items-center justify-center shrink-0">
            <FileText className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-extrabold text-foreground">Terms of Use</h1>
            <p className="text-sm text-muted-foreground">Last updated: {LAST_UPDATED}</p>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-10 text-sm text-amber-800 leading-relaxed">
          Please read these Terms of Use carefully before accessing or using KhadayataOnline. By creating an account or using our services, you agree to be bound by these terms.
        </div>

        <Section title="1. Acceptance of Terms">
          <p>These Terms of Use ("Terms") constitute a legally binding agreement between you ("Member," "User," or "You") and KhadayataOnline ("Company," "We," "Our," or "Us"), governing your access to and use of the KhadayataOnline platform, including our website, mobile application, and all related services (collectively, the "Platform").</p>
          <p>By registering for an account, accessing, or using the Platform, you acknowledge that you have read, understood, and agree to be bound by these Terms. If you do not agree, you may not access or use the Platform.</p>
          <p>We reserve the right to update these Terms at any time. Continued use of the Platform after changes constitutes acceptance of the revised Terms.</p>
        </Section>

        <Section title="2. Eligibility">
          <p>To use KhadayataOnline, you must:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Be at least 18 years of age, or have parental/guardian consent if between 13 and 17 years of age;</li>
            <li>Be a member of, or have a direct familial connection to, the Khadayata community;</li>
            <li>Provide accurate, current, and complete registration information;</li>
            <li>Not have been previously suspended or removed from the Platform;</li>
            <li>Comply with all applicable local, state, national, and international laws and regulations.</li>
          </ul>
          <p>We reserve the right to verify eligibility and deny or revoke access at our sole discretion.</p>
        </Section>

        <Section title="3. Account Registration and Security">
          <p>You are responsible for maintaining the confidentiality of your account credentials. You agree to:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Provide accurate and truthful information during registration;</li>
            <li>Keep your password secure and not share it with anyone;</li>
            <li>Notify us immediately of any unauthorized use of your account at <a href="mailto:support@khadayataonline.com" className="text-primary hover:underline">support@khadayataonline.com</a>;</li>
            <li>Be responsible for all activity that occurs under your account.</li>
          </ul>
          <p>We are not liable for any loss or damage arising from your failure to protect your account credentials.</p>
        </Section>

        <Section title="4. Community Standards and Acceptable Use">
          <p>KhadayataOnline is a community platform built on trust and mutual respect. You agree not to:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Post false, misleading, defamatory, or fraudulent content;</li>
            <li>Harass, threaten, or intimidate other members;</li>
            <li>Share another member's private information without consent;</li>
            <li>Use the Platform for commercial solicitation without prior written approval;</li>
            <li>Attempt to access accounts or data that does not belong to you;</li>
            <li>Upload malicious code, spam, or automated bots;</li>
            <li>Violate any applicable laws, including privacy, intellectual property, or anti-discrimination laws;</li>
            <li>Use matrimonial or directory features for non-community purposes.</li>
          </ul>
          <p>Violations may result in content removal, account suspension, or permanent banning.</p>
        </Section>

        <Section title="5. Verification and Identity">
          <p>KhadayataOnline operates a tiered verification system to ensure community authenticity. By submitting verification documents or requesting endorsements:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>You confirm the information and documents provided are genuine and accurate;</li>
            <li>You authorize us to verify your identity with community elders, chapter administrators, or trusted third parties;</li>
            <li>You understand that misrepresentation may result in permanent account termination.</li>
          </ul>
        </Section>

        <Section title="6. Matrimonial Services">
          <p>The matrimonial section is exclusively for verified Khadayata community members seeking life partners in accordance with community values. Users of matrimonial services agree to:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Use the service solely for genuine matrimonial purposes;</li>
            <li>Not misrepresent personal details, photographs, or family background;</li>
            <li>Respect other members' privacy and only pursue introductions through the platform's workflow;</li>
            <li>Not contact families or members outside the platform without mutual consent.</li>
          </ul>
          <p>KhadayataOnline does not guarantee successful matches and is not responsible for outcomes of any introductions facilitated through the Platform.</p>
        </Section>

        <Section title="7. Content and Intellectual Property">
          <p>You retain ownership of content you post. By submitting content to the Platform, you grant KhadayataOnline a non-exclusive, royalty-free, worldwide license to use, display, and distribute your content for the purposes of operating the Platform.</p>
          <p>All platform design, code, logos, and non-user content are the property of KhadayataOnline and may not be reproduced without written permission.</p>
        </Section>

        <Section title="8. Privacy">
          <p>Your use of the Platform is governed by our <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>, which is incorporated into these Terms by reference. Please review our Privacy Policy to understand our practices.</p>
        </Section>

        <Section title="9. Disclaimer of Warranties">
          <p>The Platform is provided "as is" and "as available" without warranties of any kind, express or implied. We do not warrant that the Platform will be uninterrupted, error-free, or free of viruses. Your use of the Platform is at your sole risk.</p>
        </Section>

        <Section title="10. Limitation of Liability">
          <p>To the maximum extent permitted by law, KhadayataOnline shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of or inability to use the Platform. Our total liability shall not exceed the amount you paid us (if any) in the twelve months preceding the claim.</p>
        </Section>

        <Section title="11. Termination">
          <p>We may suspend or terminate your account at any time for any reason, including violation of these Terms, without prior notice. Upon termination, your right to use the Platform ceases immediately. You may request deletion of your data as described in our Privacy Policy.</p>
        </Section>

        <Section title="12. Governing Law and Dispute Resolution">
          <p>These Terms are governed by the laws of the State of Texas, United States, without regard to conflict of law principles. Any disputes shall be resolved through good-faith negotiation. Unresolved disputes shall be subject to binding arbitration in Tarrant County, Texas, except that either party may seek injunctive relief in any court of competent jurisdiction.</p>
        </Section>

        <Section title="13. Contact Us">
          <p>For questions about these Terms, please contact us:</p>
          <div className="bg-muted/50 rounded-xl p-4 mt-2">
            <p className="font-medium text-foreground">KhadayataOnline</p>
            <p>1320 Pepperhill Ln, Fort Worth, TX 76131</p>
            <p>Phone: +1 (682) 432-9400</p>
            <p>Email: <a href="mailto:legal@khadayataonline.com" className="text-primary hover:underline">legal@khadayataonline.com</a></p>
          </div>
        </Section>
      </div>

      <div className="border-t border-border py-6 bg-card">
        <div className="container text-center text-xs text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} KhadayataOnline. &bull;{" "}
            <Link to="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link> &bull;{" "}
            <Link to="/cookie-policy" className="hover:text-primary transition-colors">Cookie Policy</Link> &bull;{" "}
            <Link to="/accessibility" className="hover:text-primary transition-colors">Accessibility</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
