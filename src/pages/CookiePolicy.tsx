import { Link } from "react-router-dom";
import { ArrowRight, Cookie } from "lucide-react";
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

type CookieType = "essential" | "functional" | "analytics" | "third-party";

function CookieTable({ cookies }: { cookies: { name: string; type: CookieType; purpose: string; duration: string }[] }) {
  const typeColors: Record<CookieType, string> = {
    essential: "bg-green-100 text-green-800",
    functional: "bg-blue-100 text-blue-800",
    analytics: "bg-amber-100 text-amber-800",
    "third-party": "bg-orange-100 text-orange-800",
  };
  return (
    <div className="overflow-x-auto mt-3">
      <table className="w-full text-xs border border-border rounded-xl overflow-hidden">
        <thead>
          <tr className="bg-muted/50">
            <th className="text-left px-3 py-2 font-semibold text-foreground border-b border-border">Cookie Name</th>
            <th className="text-left px-3 py-2 font-semibold text-foreground border-b border-border">Type</th>
            <th className="text-left px-3 py-2 font-semibold text-foreground border-b border-border">Purpose</th>
            <th className="text-left px-3 py-2 font-semibold text-foreground border-b border-border">Duration</th>
          </tr>
        </thead>
        <tbody>
          {cookies.map((c, i) => (
            <tr key={c.name} className={i % 2 === 0 ? "bg-background" : "bg-muted/20"}>
              <td className="px-3 py-2 font-mono text-foreground">{c.name}</td>
              <td className="px-3 py-2">
                <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${typeColors[c.type]}`}>{c.type}</span>
              </td>
              <td className="px-3 py-2">{c.purpose}</td>
              <td className="px-3 py-2">{c.duration}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function CookiePolicy() {
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
            <Cookie className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-extrabold text-foreground">Cookie Policy</h1>
            <p className="text-sm text-muted-foreground">Last updated: {LAST_UPDATED}</p>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-10 text-sm text-amber-800 leading-relaxed">
          This Cookie Policy explains how KhadayataOnline uses cookies and similar tracking technologies. By using our Platform, you consent to our use of cookies as described here.
        </div>

        <Section title="1. What Are Cookies?">
          <p>Cookies are small text files placed on your device when you visit a website. They help the website remember your preferences, keep you logged in, and understand how you use the site. Similar technologies include local storage, session storage, and pixel tags.</p>
        </Section>

        <Section title="2. Types of Cookies We Use">
          <p>We use the following categories of cookies:</p>
          <div className="space-y-4 mt-2">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <p className="font-semibold text-green-800 mb-1">Essential Cookies (Always Active)</p>
              <p className="text-green-700">These cookies are strictly necessary for the Platform to function. They cannot be disabled. They include authentication tokens, session management, and security cookies.</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="font-semibold text-blue-800 mb-1">Functional Cookies</p>
              <p className="text-blue-700">These remember your preferences such as language, theme (dark/light mode), notification settings, and tab states. They enhance your experience but are not strictly necessary.</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="font-semibold text-amber-800 mb-1">Analytics Cookies</p>
              <p className="text-amber-700">We use anonymized analytics to understand how members use the Platform, which pages are most visited, and how to improve features. No personally identifiable information is used in analytics.</p>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
              <p className="font-semibold text-orange-800 mb-1">Third-Party Cookies</p>
              <p className="text-orange-700">Some features (e.g., the CompanyHub contact form, Google Maps embed, reCAPTCHA) set their own cookies. These are governed by the respective third party's privacy policies.</p>
            </div>
          </div>
        </Section>

        <Section title="3. Cookies We Set">
          <CookieTable cookies={[
            { name: "sb-*-auth-token", type: "essential", purpose: "Supabase authentication session token", duration: "1 week" },
            { name: "sb-*-auth-token-code-verifier", type: "essential", purpose: "PKCE code verifier for OAuth flows", duration: "Session" },
            { name: "kho_theme", type: "functional", purpose: "Stores your light/dark mode preference", duration: "1 year" },
            { name: "kho_sidebar", type: "functional", purpose: "Stores sidebar open/closed state", duration: "30 days" },
            { name: "kho_notifications_seen", type: "functional", purpose: "Tracks which notifications you have viewed", duration: "Session" },
          ]} />
        </Section>

        <Section title="4. Third-Party Cookies">
          <CookieTable cookies={[
            { name: "COMPASS", type: "third-party", purpose: "Google Maps — routes and map rendering", duration: "3 months" },
            { name: "CONSENT", type: "third-party", purpose: "Google — tracks consent for embedded features", duration: "2 years" },
            { name: "_grecaptcha", type: "third-party", purpose: "Google reCAPTCHA v3 — bot protection on forms", duration: "Session / 6 months" },
            { name: "companyhub_*", type: "third-party", purpose: "CompanyHub form — contact form session state", duration: "Session" },
          ]} />
          <p className="mt-3">Third-party services have their own privacy policies. We recommend reviewing:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google Privacy Policy</a></li>
            <li><a href="https://www.companyhub.com/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">CompanyHub Privacy Policy</a></li>
          </ul>
        </Section>

        <Section title="5. Managing Cookies">
          <p>You can control cookies through:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Browser settings:</strong> Most browsers allow you to view, delete, and block cookies. Note that blocking essential cookies will prevent you from logging in.</li>
            <li><strong>Platform settings:</strong> Visit <strong>Settings &rarr; Privacy</strong> to manage notification and communication preferences.</li>
            <li><strong>Opt-out tools:</strong> For analytics opt-out, you may use the <a href="https://tools.google.com/dlpage/gaoptout" target=\"_blank" rel="noopener noreferrer\" className="text-primary hover:underline">Google Analytics Opt-out Browser Add-on</a>.</li>
          </ul>
          <p className="mt-2">Browser-specific instructions for managing cookies:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google Chrome</a></li>
            <li><a href="https://support.mozilla.org/kb/cookies-information-websites-store-on-your-computer" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Mozilla Firefox</a></li>
            <li><a href="https://support.apple.com/guide/safari/manage-cookies-sfri11471" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Apple Safari</a></li>
            <li><a href="https://support.microsoft.com/help/4468242" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Microsoft Edge</a></li>
          </ul>
        </Section>

        <Section title="6. Do Not Track">
          <p>Some browsers offer a "Do Not Track" (DNT) signal. Our Platform does not currently alter its behavior in response to DNT signals, as there is no industry-wide standard for doing so. We continue to develop privacy-enhancing features for our members.</p>
        </Section>

        <Section title="7. Changes to This Policy">
          <p>We may update this Cookie Policy from time to time. The updated date at the top of this page reflects the most recent revision. Significant changes will be communicated via email or platform notification.</p>
        </Section>

        <Section title="8. Contact Us">
          <div className="bg-muted/50 rounded-xl p-4 mt-2">
            <p className="font-medium text-foreground">KhadayataOnline</p>
            <p>1320 Pepperhill Ln, Fort Worth, TX 76131</p>
            <p>Phone: +1 (682) 432-9400</p>
            <p>Email: <a href="mailto:privacy@khadayataonline.com" className="text-primary hover:underline">privacy@khadayataonline.com</a></p>
          </div>
        </Section>
      </div>

      <div className="border-t border-border py-6 bg-card">
        <div className="container text-center text-xs text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} KhadayataOnline. &bull;{" "}
            <Link to="/terms" className="hover:text-primary transition-colors">Terms of Use</Link> &bull;{" "}
            <Link to="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link> &bull;{" "}
            <Link to="/accessibility" className="hover:text-primary transition-colors">Accessibility</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
