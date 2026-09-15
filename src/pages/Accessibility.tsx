import { Link } from "react-router-dom";
import { ArrowRight, Accessibility as AccessibilityIcon } from "lucide-react";
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

export default function Accessibility() {
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
            <AccessibilityIcon className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-extrabold text-foreground">Accessibility Statement</h1>
            <p className="text-sm text-muted-foreground">Last updated: {LAST_UPDATED}</p>
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-10 text-sm text-green-800 leading-relaxed">
          KhadayataOnline is committed to ensuring digital accessibility for people with disabilities. We continually improve the user experience for everyone and apply relevant accessibility standards.
        </div>

        <Section title="1. Our Commitment">
          <p>KhadayataOnline believes that the internet should be available and accessible to everyone. We are committed to providing a website and platform that is accessible to people with disabilities, including those using assistive technologies such as screen readers, magnification software, voice recognition tools, and switch access devices.</p>
          <p>We strive to conform to the <strong>Web Content Accessibility Guidelines (WCAG) 2.1 Level AA</strong>, published by the World Wide Web Consortium (W3C), as well as the requirements of the Americans with Disabilities Act (ADA) and Section 508 of the Rehabilitation Act.</p>
        </Section>

        <Section title="2. Measures Taken">
          <p>To support accessibility, KhadayataOnline has implemented the following:</p>

          <div className="space-y-3 mt-2">
            {[
              {
                title: "Keyboard Navigation",
                desc: "All interactive elements (buttons, links, forms, dialogs) are fully navigable using a keyboard alone. Tab order is logical and predictable. Focus indicators are clearly visible.",
              },
              {
                title: "Screen Reader Compatibility",
                desc: "We use semantic HTML5 elements with appropriate ARIA labels, roles, and live regions. Dynamic content updates are announced to screen readers. Images include descriptive alt text.",
              },
              {
                title: "Color and Contrast",
                desc: "Text contrast ratios meet or exceed WCAG 2.1 AA minimums (4.5:1 for normal text, 3:1 for large text). We do not rely on color alone to convey information. All interactive states (hover, focus, active) maintain sufficient contrast.",
              },
              {
                title: "Responsive Design",
                desc: "The Platform is fully responsive across mobile, tablet, and desktop viewports. Content reflows correctly when text is resized up to 200% without loss of functionality.",
              },
              {
                title: "Forms",
                desc: "All form fields have associated labels. Error messages are clearly identified and linked to the affected field. Required fields are marked both visually and programmatically.",
              },
              {
                title: "Videos and Media",
                desc: "Where media is included, we provide text alternatives. Live Aarti streams include descriptive context.",
              },
              {
                title: "Language",
                desc: "The primary language of the page is declared in the HTML. Gujarati (gu) text is appropriately marked up where used.",
              },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-3 p-4 bg-muted/40 rounded-xl">
                <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                <div>
                  <p className="font-semibold text-foreground mb-1">{item.title}</p>
                  <p>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="3. Known Limitations">
          <p>While we strive for full accessibility, some areas are still being improved:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Legacy PDF archives:</strong> Some older Khadayata Jyoti magazine issues may not be screen-reader accessible. We are working to add OCR and alternative text versions.</li>
            <li><strong>Rich text editor:</strong> The oral history contribution editor has limited screen reader compatibility. We are evaluating accessible alternatives.</li>
            <li><strong>Third-party embeds:</strong> The CompanyHub contact form and Google Maps embed are controlled by third parties and may not fully meet WCAG 2.1 AA. We have communicated our accessibility requirements to these providers.</li>
            <li><strong>Complex data tables:</strong> Some admin tables with many columns may be difficult to navigate on mobile screen readers. We are improving table structure and summaries.</li>
          </ul>
        </Section>

        <Section title="4. Assistive Technologies Tested">
          <p>We regularly test the Platform with the following assistive technologies:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>NVDA with Google Chrome (Windows)</li>
            <li>JAWS with Microsoft Edge (Windows)</li>
            <li>VoiceOver with Safari (macOS and iOS)</li>
            <li>TalkBack with Chrome (Android)</li>
            <li>Zoom and OS-level magnification tools</li>
            <li>Keyboard-only navigation (no mouse)</li>
          </ul>
        </Section>

        <Section title="5. Alternative Access">
          <p>If you experience difficulty using any part of KhadayataOnline, our team is happy to assist. We can:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Provide information in an alternative format upon request;</li>
            <li>Assist with account setup or navigation by phone;</li>
            <li>Connect you with your local chapter representative for in-person assistance;</li>
            <li>Provide Gujarati-language support where needed.</li>
          </ul>
        </Section>

        <Section title="6. Feedback and Reporting Issues">
          <p>We welcome your feedback on the accessibility of KhadayataOnline. If you encounter an accessibility barrier, please tell us:</p>
          <div className="bg-muted/50 rounded-xl p-4 mt-2">
            <p className="font-medium text-foreground">Accessibility Team — KhadayataOnline</p>
            <p>1320 Pepperhill Ln, Fort Worth, TX 76131</p>
            <p>Phone: +1 (682) 432-9400</p>
            <p>Contact: <Link to="/contact" className="text-primary hover:underline">Contact Us form</Link></p>
          </div>
          <p className="mt-3">Please include:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>The URL or page where you experienced the issue;</li>
            <li>A description of the problem;</li>
            <li>The assistive technology and browser you were using.</li>
          </ul>
          <p>We aim to respond to accessibility feedback within 5 business days.</p>
        </Section>

        <Section title="7. Formal Complaints">
          <p>If you are not satisfied with our response to your accessibility feedback, you may contact the following organizations:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><a href="https://www.ada.gov" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">U.S. Department of Justice ADA Information Line</a> — 1-800-514-0301</li>
            <li><a href="https://www.hhs.gov/civil-rights" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">U.S. Department of Health & Human Services Office for Civil Rights</a></li>
          </ul>
        </Section>

        <Section title="8. Ongoing Efforts">
          <p>Accessibility is an ongoing commitment. Our roadmap includes:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Annual third-party accessibility audits;</li>
            <li>Accessibility training for all developers and content contributors;</li>
            <li>Automated accessibility testing integrated into our CI/CD pipeline;</li>
            <li>User testing sessions with disabled community members.</li>
          </ul>
          <p>This statement was last reviewed and updated on <strong>{LAST_UPDATED}</strong>.</p>
        </Section>
      </div>

      <div className="border-t border-border py-6 bg-card">
        <div className="container text-center text-xs text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} KhadayataOnline. &bull;{" "}
            <Link to="/terms" className="hover:text-primary transition-colors">Terms of Use</Link> &bull;{" "}
            <Link to="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
