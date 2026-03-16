import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Globe, Users, Shield, BookOpen, Building2, Briefcase, ArrowRight, Heart, Calendar, Star } from "lucide-react";
import { useTotalMemberCount, useTotalChapterCount, useTotalBusinessCount } from "@/hooks/useChapter";
import heroTemple from "@/assets/hero-temple.jpg";
import communityGathering from "@/assets/community-gathering.jpg";
import patternOrnament from "@/assets/pattern-ornament.png";

const FEATURES = [
  { icon: Globe, title: "Global Identity", desc: "One verified GlobalID across all chapters worldwide", color: "from-primary to-primary/70" },
  { icon: Users, title: "Community Directory", desc: "Find and connect with members in your chapter and beyond", color: "from-secondary to-secondary/70" },
  { icon: Shield, title: "Privacy First", desc: "Field-level controls over who sees your information", color: "from-jewel to-jewel/70" },
  { icon: Briefcase, title: "Business & Jobs", desc: "Post listings, find opportunities, grow together", color: "from-gold to-gold/70" },
  { icon: BookOpen, title: "Heritage Archives", desc: "Khadayata Jyoti magazine and community history digitized", color: "from-primary to-secondary" },
  { icon: Building2, title: "Kotyark Temple", desc: "Donate, view live Aarti, and support sacred heritage", color: "from-secondary to-jewel" },
];

// Stats are now dynamic — see component body

const TESTIMONIALS = [
  { name: "Rajesh Khadayata", chapter: "Ahmedabad Chapter", text: "KhadayataOnline helped me reconnect with relatives I hadn't spoken to in decades. The directory is simply amazing." },
  { name: "Priya Shah", chapter: "Houston Chapter", text: "The matrimonial feature is safe and verified. Found a wonderful match through proper community introductions." },
  { name: "Amit Khadayata", chapter: "Mumbai Chapter", text: "As a business owner, the Business Directory brought me clients from within our own community. Incredible platform!" },
];

export default function Index() {
  const { user } = useAuth();
  const { data: totalMembers } = useTotalMemberCount();
  const { data: totalChapters } = useTotalChapterCount();
  const { data: totalBusinesses } = useTotalBusinessCount();

  const STATS = [
    { value: totalMembers ? totalMembers.toLocaleString() : "—", label: "Members Worldwide" },
    { value: totalChapters ? totalChapters.toLocaleString() : "—", label: "Chapters Globally" },
    { value: totalBusinesses ? totalBusinesses.toLocaleString() : "—", label: "Businesses Listed" },
    { value: "50+", label: "Years of Heritage" },
  ];
  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Nav */}
      <nav className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container flex items-center justify-between py-3 sm:py-4">
          <div className="flex items-center gap-2 min-w-0">
            <img src={patternOrnament} alt="" className="w-7 h-7 sm:w-8 sm:h-8 opacity-80 shrink-0" />
            <h1 className="text-base sm:text-xl font-display font-bold text-gradient-hero truncate">KhadayataOnline</h1>
          </div>
          <div className="flex gap-2 sm:gap-3 shrink-0">
            {user ? (
              <Button asChild size="sm" className="gradient-hero text-primary-foreground">
                <Link to="/dashboard">Dashboard <ArrowRight className="w-4 h-4 ml-1 hidden sm:inline" /></Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="outline" size="sm">
                  <Link to="/auth">Sign In</Link>
                </Button>
                <Button asChild size="sm" className="gradient-hero text-primary-foreground shadow-glow">
                  <Link to="/auth">Join Now</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero with temple image */}
      <section className="relative min-h-[70vh] sm:min-h-[85vh] flex items-center">
        <div className="absolute inset-0">
          <img src={heroTemple} alt="Kotyark Temple" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-foreground/90 via-foreground/70 to-foreground/40" />
        </div>
        <div className="container relative z-10 py-12 sm:py-20">
          <div className="max-w-2xl animate-fade-in">
            <span className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs font-medium bg-primary/20 text-primary-foreground border border-primary-foreground/20 mb-4 sm:mb-6 backdrop-blur-sm">
              <Star className="w-3.5 h-3.5 fill-current" />
              Connecting Khadayata families worldwide
            </span>
            <h2 className="text-3xl sm:text-5xl lg:text-7xl font-display font-extrabold leading-[1.1] text-primary-foreground">
              One Community.{" "}
              <span className="bg-gradient-to-r from-gold to-primary bg-clip-text text-transparent">One Identity.</span>{" "}
              One Platform.
            </h2>
            <p className="mt-4 sm:mt-6 text-base sm:text-lg text-primary-foreground/80 max-w-xl leading-relaxed">
              KhadayataOnline empowers every member with a verified global identity,
              connecting chapters across countries for social and economic advancement.
            </p>
            <div className="mt-6 sm:mt-8 flex flex-wrap gap-3 sm:gap-4">
              <Button asChild size="lg" className="gradient-hero text-primary-foreground shadow-glow h-12 sm:h-14 px-6 sm:px-8 text-sm sm:text-base">
                <Link to="/auth">Get Started Free <ArrowRight className="w-5 h-5 ml-2" /></Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-12 sm:h-14 px-6 sm:px-8 text-sm sm:text-base border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
                <a href="#features">Learn More</a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="gradient-hero py-6">
        <div className="container grid grid-cols-2 md:grid-cols-4 gap-6">
          {STATS.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-3xl font-display font-bold text-primary-foreground">{stat.value}</p>
              <p className="text-xs text-primary-foreground/70 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="container py-12 sm:py-24">
        <div className="text-center mb-10 sm:mb-16 px-4">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">Everything You Need</span>
          <h3 className="text-2xl sm:text-4xl font-display font-bold mt-2">Built for the Community,<br/>by the Community</h3>
          <p className="text-muted-foreground mt-3 max-w-md mx-auto">A comprehensive platform covering every aspect of Khadayata community life.</p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <Card
                key={f.title}
                className="shadow-card hover:shadow-elevated transition-all group border-border/50 hover:-translate-y-1 animate-slide-up overflow-hidden"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <CardContent className="p-7">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform shadow-lg`}>
                    <Icon className="w-7 h-7 text-primary-foreground" />
                  </div>
                  <h4 className="font-display font-bold text-lg">{f.title}</h4>
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{f.desc}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Community image section */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0">
          <img src={communityGathering} alt="Community gathering" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-foreground/85 to-foreground/60" />
        </div>
        <div className="container relative z-10 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h3 className="text-4xl font-display font-bold text-primary-foreground">
              A Family That Spans<br/>
              <span className="bg-gradient-to-r from-gold to-primary bg-clip-text text-transparent">Continents</span>
            </h3>
            <p className="text-primary-foreground/80 mt-4 leading-relaxed">
              From Ahmedabad to Houston, from Mumbai to London — the Khadayata community thrives across borders.
              Our platform makes distance disappear, keeping traditions alive while embracing the future.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-4">
              {[
                { icon: Users, label: "Member Directory", desc: "Search & connect" },
                { icon: Heart, label: "Matrimonial", desc: "Safe matchmaking" },
                { icon: Calendar, label: "Events", desc: "Stay connected" },
                { icon: Building2, label: "Temple", desc: "Sacred heritage" },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="flex items-start gap-3 p-3 rounded-xl bg-primary-foreground/10 backdrop-blur-sm">
                    <Icon className="w-5 h-5 text-gold shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-primary-foreground">{item.label}</p>
                      <p className="text-xs text-primary-foreground/60">{item.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="container py-12 sm:py-24">
        <div className="text-center mb-8 sm:mb-12 px-4">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">Testimonials</span>
          <h3 className="text-2xl sm:text-3xl font-display font-bold mt-2">Loved by Our Community</h3>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <Card key={i} className="shadow-card border-border/50 animate-slide-up" style={{ animationDelay: `${i * 0.15}s` }}>
              <CardContent className="p-6">
                <div className="flex gap-1 mb-4">
                  {[1,2,3,4,5].map(s => <Star key={s} className="w-4 h-4 text-gold fill-gold" />)}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed italic">"{t.text}"</p>
                <div className="flex items-center gap-3 mt-5 pt-4 border-t border-border">
                  <div className="w-10 h-10 rounded-full gradient-hero flex items-center justify-center text-primary-foreground font-bold text-sm">
                    {t.name.split(" ").map(n => n[0]).join("")}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.chapter}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-12 sm:py-20 overflow-hidden">
        <div className="absolute inset-0 gradient-hero" />
        <img src={patternOrnament} alt="" className="absolute right-0 top-1/2 -translate-y-1/2 w-60 sm:w-96 h-60 sm:h-96 opacity-10" />
        <div className="container relative z-10 text-center px-4">
          <h3 className="text-2xl sm:text-4xl font-display font-bold text-primary-foreground">
            Ready to Join Your Family?
          </h3>
          <p className="text-primary-foreground/80 mt-3 max-w-lg mx-auto text-lg">
            Create your account, complete your profile, and connect with the Khadayata family worldwide.
          </p>
          <Button asChild size="lg" className="mt-8 h-14 px-10 text-base bg-primary-foreground text-foreground hover:bg-primary-foreground/90 shadow-elevated">
            <Link to="/auth">Create Your Account <ArrowRight className="w-5 h-5 ml-2" /></Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 bg-card">
        <div className="container">
          <div className="grid gap-8 md:grid-cols-4">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-3">
                <img src={patternOrnament} alt="" className="w-6 h-6 opacity-80" />
                <span className="font-display font-bold text-gradient-hero">KhadayataOnline</span>
              </div>
              <p className="text-sm text-muted-foreground max-w-sm">
                Preserving heritage. Empowering community. Connecting generations across the globe.
              </p>
            </div>
            <div>
              <h4 className="font-display font-semibold text-sm mb-3">Platform</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/directory" className="hover:text-primary transition-colors">Directory</Link></li>
                <li><Link to="/events" className="hover:text-primary transition-colors">Events</Link></li>
                <li><Link to="/business" className="hover:text-primary transition-colors">Business</Link></li>
                <li><Link to="/matrimonial" className="hover:text-primary transition-colors">Matrimonial</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-display font-semibold text-sm mb-3">Heritage</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/temple" className="hover:text-primary transition-colors">Kotyark Temple</Link></li>
                <li><Link to="/archives" className="hover:text-primary transition-colors">Archives</Link></li>
                <li><Link to="/news" className="hover:text-primary transition-colors">News</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border mt-8 pt-8 text-center text-xs text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} KhadayataOnline. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
