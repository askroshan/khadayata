import { useEffect } from "react";
import { Link } from "react-router-dom";
import { MapPin, Phone, Mail, Clock, ArrowRight } from "lucide-react";
import patternOrnament from "@/assets/pattern-ornament.png";

const CONTACT_INFO = [
  {
    icon: MapPin,
    label: "Address",
    value: "1320 Pepperhill Ln\nFort Worth, TX 76131",
    href: "https://maps.google.com/?q=1320+Pepperhill+Ln+Fort+Worth+TX+76131",
  },
  {
    icon: Phone,
    label: "Phone",
    value: "+1 (682) 432-9400",
    href: "tel:+16824329400",
  },
  {
    icon: Mail,
    label: "Email",
    value: "support@khadayataonline.com",
    href: "mailto:support@khadayataonline.com",
  },
  {
    icon: Clock,
    label: "Office Hours",
    value: "Monday – Friday\n9:00 AM – 5:00 PM CST",
    href: null,
  },
];

export default function Contact() {
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://app.companyhub.com/scripts/companyhub.forms.js";
    script.async = true;
    document.body.appendChild(script);

    script.onload = () => {
      if (typeof (window as { companyhubForms?: { render: (url: string, id: string) => void } }).companyhubForms !== "undefined") {
        (window as { companyhubForms: { render: (url: string, id: string) => void } }).companyhubForms.render(
          "https://app.companyhub.com/webtolead/renderform/MjIzNzM1?name=Contact_FormKhadayataOnline",
          "companyhub-form"
        );
      }
    };

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
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

      {/* Hero */}
      <section className="relative py-16 sm:py-24 overflow-hidden">
        <div className="absolute inset-0 gradient-hero opacity-10" />
        <img src={patternOrnament} alt="" className="absolute right-0 top-0 w-72 h-72 opacity-5 pointer-events-none" />
        <div className="container relative z-10 text-center px-4">
          <span className="inline-block text-xs font-semibold uppercase tracking-widest text-primary mb-4">Get in Touch</span>
          <h1 className="text-3xl sm:text-5xl font-display font-extrabold text-foreground mb-4">
            We'd Love to <span className="text-gradient-hero">Hear From You</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto leading-relaxed">
            Have questions about membership, chapters, or the platform? Our team is here to help.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="container pb-20 px-4">
        <div className="grid gap-12 lg:grid-cols-5 items-start max-w-5xl mx-auto">
          {/* Contact Info Panel */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h2 className="text-xl font-display font-bold text-foreground mb-1">Contact Information</h2>
              <p className="text-sm text-muted-foreground">Reach us through any of the channels below.</p>
            </div>

            <div className="space-y-4">
              {CONTACT_INFO.map((item) => {
                const Icon = item.icon;
                const content = (
                  <div className="flex items-start gap-4 p-4 rounded-xl bg-card border border-border hover:border-primary/30 hover:shadow-card transition-all group">
                    <div className="w-10 h-10 rounded-lg gradient-hero flex items-center justify-center shrink-0">
                      <Icon className="w-4.5 h-4.5 text-primary-foreground" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">{item.label}</p>
                      <p className="text-sm font-medium text-foreground whitespace-pre-line leading-relaxed group-hover:text-primary transition-colors">{item.value}</p>
                    </div>
                  </div>
                );
                return item.href ? (
                  <a key={item.label} href={item.href} target="_blank" rel="noopener noreferrer" className="block">
                    {content}
                  </a>
                ) : (
                  <div key={item.label}>{content}</div>
                );
              })}
            </div>

            {/* Map embed */}
            <div className="rounded-xl overflow-hidden border border-border shadow-card">
              <iframe
                title="Office Location"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3351.1!2d-97.3!3d32.9!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMzLCsDU0JzA3LjkiTiA5N8KwMTgnMDAuMCJX!5e0!3m2!1sen!2sus!4v1234567890"
                width="100%"
                height="220"
                style={{ border: 0, display: "block" }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>

          {/* CompanyHub Form */}
          <div className="lg:col-span-3">
            <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
              <div className="px-6 pt-6 pb-4 border-b border-border">
                <h2 className="text-xl font-display font-bold text-foreground">Send Us a Message</h2>
                <p className="text-sm text-muted-foreground mt-1">We'll respond within 2–3 business days.</p>
              </div>
              <div className="p-6">
                <div id="companyhub-form" style={{ height: "100%", width: "100%", minHeight: "520px" }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer strip */}
      <div className="border-t border-border py-6 bg-card">
        <div className="container text-center text-xs text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} KhadayataOnline. All rights reserved. &bull;{" "}
            <Link to="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link> &bull;{" "}
            <Link to="/terms" className="hover:text-primary transition-colors">Terms of Use</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
