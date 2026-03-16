import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Globe, Users, Shield, BookOpen, Building2, Briefcase,
  ArrowRight, Heart, Calendar, Star, Search, MapPin,
  Music, ChevronRight, Newspaper, UserCheck, Sparkles,
} from "lucide-react";
import { useTotalMemberCount, useTotalChapterCount, useTotalBusinessCount } from "@/hooks/useChapter";
import khadayataLogo from "/image.png";
import heroTemple from "@/assets/hero-temple.jpg";
import communityGathering from "@/assets/community-gathering.jpg";
import eventsHero from "@/assets/events-hero.jpg";
import businessHero from "@/assets/business-hero.jpg";

const FEATURES = [
  {
    icon: Globe,
    title: "Global Identity",
    desc: "One verified GlobalID across all chapters worldwide",
    color: "#F39C12",
    border: "border-l-[#F39C12]",
  },
  {
    icon: Users,
    title: "Community Directory",
    desc: "Find and connect with members in your chapter and beyond",
    color: "#43A047",
    border: "border-l-[#43A047]",
  },
  {
    icon: Shield,
    title: "Privacy First",
    desc: "Field-level controls over who sees your information",
    color: "#1E88E5",
    border: "border-l-[#1E88E5]",
  },
  {
    icon: Briefcase,
    title: "Business & Jobs",
    desc: "Post listings, find opportunities, grow together",
    color: "#E91E63",
    border: "border-l-[#E91E63]",
  },
  {
    icon: BookOpen,
    title: "Heritage Archives",
    desc: "Khadayata Jyoti magazine and community history digitized",
    color: "#F4B400",
    border: "border-l-[#F4B400]",
  },
  {
    icon: Building2,
    title: "Kotyark Temple",
    desc: "Donate, view live Aarti, and support sacred heritage",
    color: "#43A047",
    border: "border-l-[#43A047]",
  },
];

const EVENTS = [
  {
    title: "Garba Night",
    type: "Cultural",
    date: "Oct 14",
    time: "7:00 PM",
    location: "Ahmedabad",
    color: "#F39C12",
    icon: Music,
    img: "https://images.pexels.com/photos/1157255/pexels-photo-1157255.jpeg?auto=compress&cs=tinysrgb&w=400",
  },
  {
    title: "Community Meetup",
    type: "Social",
    date: "Nov 2",
    time: "11:00 AM",
    location: "Houston",
    color: "#43A047",
    icon: Users,
    img: "https://images.pexels.com/photos/1395967/pexels-photo-1395967.jpeg?auto=compress&cs=tinysrgb&w=400",
  },
  {
    title: "Temple Visit",
    type: "Religious",
    date: "Oct 21",
    time: "10:00 AM",
    location: "Vadodara",
    color: "#1E88E5",
    icon: Building2,
    img: "https://images.pexels.com/photos/3408354/pexels-photo-3408354.jpeg?auto=compress&cs=tinysrgb&w=400",
  },
  {
    title: "Youth Networking",
    type: "Professional",
    date: "Nov 10",
    time: "6:00 PM",
    location: "London",
    color: "#E91E63",
    icon: UserCheck,
    img: "https://images.pexels.com/photos/1181396/pexels-photo-1181396.jpeg?auto=compress&cs=tinysrgb&w=400",
  },
];

const TESTIMONIALS = [
  {
    name: "Rajesh Khadayata",
    chapter: "Ahmedabad Chapter",
    text: "KhadayataOnline helped me reconnect with relatives I hadn't spoken to in decades. The directory is simply amazing.",
    avatar: "RK",
  },
  {
    name: "Priya Shah",
    chapter: "Houston Chapter",
    text: "The matrimonial feature is safe and verified. Found a wonderful match through proper community introductions.",
    avatar: "PS",
  },
  {
    name: "Amit Khadayata",
    chapter: "Mumbai Chapter",
    text: "As a business owner, the Business Directory brought me clients from within our own community. Incredible platform!",
    avatar: "AK",
  },
];

const BUSINESS_CATEGORIES = [
  { label: "Restaurants", icon: "🍛" },
  { label: "Doctors", icon: "🩺" },
  { label: "Lawyers", icon: "⚖️" },
  { label: "Consultants", icon: "💼" },
  { label: "Retail", icon: "🛍️" },
  { label: "Real Estate", icon: "🏠" },
];

export default function Index() {
  const { user } = useAuth();
  const { data: totalMembers } = useTotalMemberCount();
  const { data: totalChapters } = useTotalChapterCount();
  const { data: totalBusinesses } = useTotalBusinessCount();

  const STATS = [
    { value: totalMembers ? totalMembers.toLocaleString() : "50,000+", label: "Members" },
    { value: totalChapters ? totalChapters.toLocaleString() : "67", label: "Chapters" },
    { value: "28", label: "Countries" },
    { value: totalBusinesses ? totalBusinesses.toLocaleString() : "315", label: "Businesses" },
  ];

  return (
    <div className="min-h-screen bg-[#FFF7E6] overflow-hidden">

      {/* ── Navigation ── */}
      <nav className="border-b border-[#E8A317]/30 bg-[#FFF7E6]/90 backdrop-blur-md sticky top-0 z-50 shadow-sm">
        <div className="container flex items-center justify-between py-3">
          <Link to="/" className="flex items-center gap-2 min-w-0">
            <img src={khadayataLogo} alt="Khadayata" className="h-10 w-auto" />
          </Link>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-[#2E2E2E]">
            <Link to="/events" className="hover:text-[#F39C12] transition-colors">Events</Link>
            <Link to="/directory" className="hover:text-[#F39C12] transition-colors">Directory</Link>
            <Link to="/business" className="hover:text-[#F39C12] transition-colors">Business</Link>
            <Link to="/chapters" className="hover:text-[#F39C12] transition-colors">Chapters</Link>
            <Link to="/news" className="hover:text-[#F39C12] transition-colors">News</Link>
          </div>
          <div className="flex gap-2 shrink-0">
            {user ? (
              <Button asChild size="sm" style={{ background: "linear-gradient(135deg,#F39C12,#E91E63)" }} className="text-white border-0 shadow-sm">
                <Link to="/dashboard">Dashboard <ArrowRight className="w-4 h-4 ml-1" /></Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="outline" size="sm" className="border-[#E8A317] text-[#2E2E2E] hover:bg-[#FDEBD0]">
                  <Link to="/auth">Sign In</Link>
                </Button>
                <Button asChild size="sm" style={{ background: "linear-gradient(135deg,#F39C12,#E91E63)" }} className="text-white border-0 shadow-glow">
                  <Link to="/auth">Join Now</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero Section ── */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden">
        {/* Mandala background */}
        <div className="absolute inset-0 bg-[#FFF7E6] mandala-bg" />
        {/* Decorative circles */}
        <div className="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full opacity-10" style={{ background: "radial-gradient(circle,#F39C12,#E91E63)" }} />
        <div className="absolute -bottom-20 -left-20 w-[400px] h-[400px] rounded-full opacity-8" style={{ background: "radial-gradient(circle,#1E88E5,#43A047)" }} />

        <div className="container relative z-10 py-16 grid lg:grid-cols-2 gap-12 items-center">
          <div className="animate-fade-in">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold border mb-6" style={{ background: "#FFF7E6", borderColor: "#E8A317", color: "#F39C12" }}>
              <Sparkles className="w-3.5 h-3.5" />
              Connecting Khadayata Community Worldwide
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-extrabold leading-[1.1] text-[#2E2E2E]">
              Khadayata
              <br />
              <span className="text-gradient-festival">One Community.</span>
              <br />
              <span style={{ color: "#1E88E5" }}>One Identity.</span>
            </h1>
            <p className="mt-5 text-base sm:text-lg text-[#2E2E2E]/70 max-w-lg leading-relaxed">
              Your verified global identity connecting chapters across 28 countries —
              for social bonds, economic growth, and cultural preservation.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" style={{ background: "linear-gradient(135deg,#F39C12,#E91E63)" }} className="text-white h-13 px-8 text-base shadow-glow border-0 hover:opacity-90">
                <Link to="/auth">Join Community <ArrowRight className="w-5 h-5 ml-2" /></Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-13 px-8 text-base border-2 border-[#1E88E5] text-[#1E88E5] hover:bg-[#1E88E5]/10">
                <Link to="/events">Explore Events</Link>
              </Button>
            </div>
          </div>

          {/* Hero image card */}
          <div className="relative hidden lg:block">
            <div className="relative rounded-3xl overflow-hidden shadow-elevated" style={{ border: "3px solid #E8A317" }}>
              <img src={heroTemple} alt="Khadayata Temple" className="w-full h-[480px] object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#2E2E2E]/60 via-transparent to-transparent" />
              <div className="absolute bottom-6 left-6 right-6">
                <div className="rounded-2xl p-4 backdrop-blur-md bg-white/90 shadow-lg">
                  <p className="text-xs font-semibold text-[#F39C12] uppercase tracking-wide">Kotyark Temple</p>
                  <p className="text-sm font-bold text-[#2E2E2E] mt-0.5">Sacred Heritage of the Khadayata Community</p>
                </div>
              </div>
            </div>
            {/* Floating badge */}
            <div className="absolute -top-4 -left-4 rounded-2xl px-4 py-3 shadow-elevated text-white text-sm font-bold" style={{ background: "linear-gradient(135deg,#43A047,#1E88E5)" }}>
              {totalMembers ? totalMembers.toLocaleString() : "50,000+"}
              <p className="text-xs font-normal opacity-80">Members Worldwide</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats Bar ── */}
      <section className="py-6 relative overflow-hidden" style={{ background: "linear-gradient(90deg,#F39C12,#E91E63,#1E88E5,#43A047)" }}>
        <div className="container grid grid-cols-2 md:grid-cols-4 gap-6 relative z-10">
          {STATS.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-3xl font-display font-extrabold text-white">{stat.value}</p>
              <p className="text-xs text-white/75 mt-1 font-medium">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Community Highlights ── */}
      <section className="container py-16 sm:py-24">
        <div className="text-center mb-12">
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#F39C12" }}>Community Hub</span>
          <h2 className="text-3xl sm:text-4xl font-display font-bold mt-2 text-[#2E2E2E]">Everything in One Place</h2>
          <p className="text-[#2E2E2E]/60 mt-3 max-w-md mx-auto">A comprehensive platform covering every aspect of Khadayata community life.</p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <Card
                key={f.title}
                className={`shadow-card hover:shadow-elevated transition-all group bg-white border-l-4 ${f.border} hover:-translate-y-1 animate-slide-up overflow-hidden`}
                style={{ animationDelay: `${i * 0.08}s` }}
              >
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform" style={{ background: `${f.color}18` }}>
                    <Icon className="w-6 h-6" style={{ color: f.color }} />
                  </div>
                  <h4 className="font-display font-bold text-lg text-[#2E2E2E]">{f.title}</h4>
                  <p className="text-sm text-[#2E2E2E]/60 mt-1.5 leading-relaxed">{f.desc}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* ── Upcoming Events ── */}
      <section className="py-16 sm:py-20 mandala-bg" style={{ backgroundColor: "#FDEBD0" }}>
        <div className="container">
          <div className="flex items-end justify-between mb-10">
            <div>
              <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#E91E63" }}>What's On</span>
              <h2 className="text-3xl sm:text-4xl font-display font-bold mt-1 text-[#2E2E2E]">Upcoming Events</h2>
            </div>
            <Button asChild variant="outline" className="hidden sm:flex border-[#F39C12] text-[#F39C12] hover:bg-[#F39C12]/10">
              <Link to="/events">View All <ChevronRight className="w-4 h-4 ml-1" /></Link>
            </Button>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {EVENTS.map((ev, i) => {
              const Icon = ev.icon;
              return (
                <Card key={ev.title} className="overflow-hidden bg-white shadow-card hover:shadow-elevated transition-all hover:-translate-y-1 group animate-slide-up" style={{ animationDelay: `${i * 0.1}s` }}>
                  <div className="relative h-44 overflow-hidden">
                    <img src={ev.img} alt={ev.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <span className="absolute top-3 left-3 text-xs font-semibold px-2.5 py-1 rounded-full text-white" style={{ background: ev.color }}>
                      {ev.type}
                    </span>
                  </div>
                  <CardContent className="p-4">
                    <h4 className="font-display font-bold text-[#2E2E2E]">{ev.title}</h4>
                    <div className="flex items-center gap-3 mt-2 text-xs text-[#2E2E2E]/60">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{ev.date}</span>
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{ev.location}</span>
                    </div>
                    <Button asChild size="sm" className="w-full mt-4 text-white border-0" style={{ background: ev.color }}>
                      <Link to="/events">View Details</Link>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <div className="mt-8 text-center sm:hidden">
            <Button asChild style={{ background: "linear-gradient(135deg,#F39C12,#E91E63)" }} className="text-white border-0">
              <Link to="/events">View All Events <ArrowRight className="w-4 h-4 ml-1" /></Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── Community Directory Search ── */}
      <section className="container py-16 sm:py-24">
        <div className="text-center mb-10">
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#1E88E5" }}>Find Your People</span>
          <h2 className="text-3xl sm:text-4xl font-display font-bold mt-1 text-[#2E2E2E]">Community Directory</h2>
          <p className="text-[#2E2E2E]/60 mt-3 max-w-md mx-auto">Search across members, businesses, and organizations in the Khadayata network.</p>
        </div>
        <div className="max-w-2xl mx-auto">
          <div className="flex gap-3 p-2 rounded-2xl bg-white shadow-elevated border border-[#E8A317]/40">
            <Search className="w-5 h-5 ml-3 my-auto text-[#2E2E2E]/40 shrink-0" />
            <input
              className="flex-1 bg-transparent outline-none text-[#2E2E2E] placeholder-[#2E2E2E]/40 text-sm py-2"
              placeholder="Search members, businesses, chapters..."
              onFocus={(e) => { window.location.href = "/directory"; }}
              readOnly
            />
            <Button asChild style={{ background: "linear-gradient(135deg,#F39C12,#E91E63)" }} className="text-white border-0 rounded-xl">
              <Link to="/directory">Search</Link>
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-5">
            {[
              { label: "Find Members", link: "/directory", color: "#F39C12" },
              { label: "Find Businesses", link: "/business", color: "#43A047" },
              { label: "Find Chapters", link: "/chapters", color: "#1E88E5" },
            ].map((item) => (
              <Link key={item.label} to={item.link} className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold border-2 transition-all hover:-translate-y-0.5" style={{ borderColor: item.color, color: item.color, background: `${item.color}10` }}>
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Business categories */}
        <div className="mt-12">
          <p className="text-center text-sm font-semibold text-[#2E2E2E]/60 mb-5">Popular Business Categories</p>
          <div className="flex flex-wrap justify-center gap-3">
            {BUSINESS_CATEGORIES.map((cat) => (
              <Link key={cat.label} to="/business" className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white shadow-card border border-[#E8A317]/30 text-sm font-medium text-[#2E2E2E] hover:border-[#F39C12] hover:shadow-elevated transition-all">
                <span>{cat.icon}</span> {cat.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Cultural Heritage ── */}
      <section className="relative py-20 overflow-hidden mandala-bg" style={{ backgroundColor: "#FDEBD0" }}>
        <div className="container relative z-10 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#43A047" }}>Our Roots</span>
            <h2 className="text-3xl sm:text-4xl font-display font-bold mt-2 text-[#2E2E2E]">
              A Family That Spans<br />
              <span style={{ color: "#F39C12" }}>Continents</span>
            </h2>
            <p className="text-[#2E2E2E]/70 mt-4 leading-relaxed">
              From Ahmedabad to Houston, Mumbai to London — the Khadayata community thrives across borders.
              Our platform keeps traditions alive while embracing the future.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-4">
              {[
                { icon: Users, label: "Member Directory", desc: "Search & connect", color: "#F39C12" },
                { icon: Heart, label: "Matrimonial", desc: "Safe matchmaking", color: "#E91E63" },
                { icon: Calendar, label: "Events", desc: "Stay connected", color: "#1E88E5" },
                { icon: Building2, label: "Temple", desc: "Sacred heritage", color: "#43A047" },
                { icon: Newspaper, label: "News & Archives", desc: "Community stories", color: "#F4B400" },
                { icon: BookOpen, label: "Oral History", desc: "Living traditions", color: "#1E88E5" },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="flex items-start gap-3 p-3 rounded-xl bg-white/70 backdrop-blur-sm border border-[#E8A317]/30 hover:border-[#F39C12]/50 transition-all">
                    <Icon className="w-5 h-5 shrink-0 mt-0.5" style={{ color: item.color }} />
                    <div>
                      <p className="text-sm font-semibold text-[#2E2E2E]">{item.label}</p>
                      <p className="text-xs text-[#2E2E2E]/55">{item.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="relative hidden lg:block">
            <div className="rounded-3xl overflow-hidden shadow-elevated" style={{ border: "3px solid #E8A317" }}>
              <img src={communityGathering} alt="Community gathering" className="w-full h-[500px] object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#2E2E2E]/50 to-transparent" />
            </div>
          </div>
        </div>
      </section>

      {/* ── Support Businesses ── */}
      <section className="container py-16 sm:py-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="relative hidden lg:block">
            <div className="rounded-3xl overflow-hidden shadow-elevated" style={{ border: "3px solid #43A047" }}>
              <img src={businessHero} alt="Khadayata Business" className="w-full h-[420px] object-cover" />
            </div>
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#43A047" }}>Business Network</span>
            <h2 className="text-3xl sm:text-4xl font-display font-bold mt-2 text-[#2E2E2E]">
              Support <span style={{ color: "#F39C12" }}>Khadayata</span> Businesses
            </h2>
            <p className="text-[#2E2E2E]/70 mt-4 leading-relaxed">
              Discover and support businesses owned by your community members. From restaurants to professional services — grow together.
            </p>
            <div className="mt-6 space-y-3">
              {[
                { icon: Globe, text: "Join any chapter worldwide", color: "#F39C12" },
                { icon: Calendar, text: "Attend exclusive events", color: "#E91E63" },
                { icon: Briefcase, text: "Expand your business network", color: "#43A047" },
                { icon: Heart, text: "Enrol in volunteer programs", color: "#1E88E5" },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.text} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${item.color}18` }}>
                      <Icon className="w-4 h-4" style={{ color: item.color }} />
                    </div>
                    <span className="text-sm text-[#2E2E2E]/80">{item.text}</span>
                  </div>
                );
              })}
            </div>
            <Button asChild size="lg" className="mt-8 text-white border-0" style={{ background: "linear-gradient(135deg,#43A047,#1E88E5)" }}>
              <Link to="/business">Browse Businesses <ArrowRight className="w-5 h-5 ml-2" /></Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="py-16 sm:py-20 mandala-bg" style={{ backgroundColor: "#FDEBD0" }}>
        <div className="container">
          <div className="text-center mb-10">
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#E91E63" }}>Testimonials</span>
            <h2 className="text-3xl font-display font-bold mt-2 text-[#2E2E2E]">Loved by Our Community</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {TESTIMONIALS.map((t, i) => (
              <Card key={i} className="bg-white shadow-card border border-[#E8A317]/30 animate-slide-up hover:shadow-elevated transition-all" style={{ animationDelay: `${i * 0.15}s` }}>
                <CardContent className="p-6">
                  <div className="flex gap-1 mb-4">
                    {[1,2,3,4,5].map(s => <Star key={s} className="w-4 h-4 fill-[#F4B400] text-[#F4B400]" />)}
                  </div>
                  <p className="text-sm text-[#2E2E2E]/70 leading-relaxed italic">"{t.text}"</p>
                  <div className="flex items-center gap-3 mt-5 pt-4 border-t border-[#E8A317]/30">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ background: "linear-gradient(135deg,#F39C12,#E91E63)" }}>
                      {t.avatar}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#2E2E2E]">{t.name}</p>
                      <p className="text-xs text-[#2E2E2E]/55">{t.chapter}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative py-16 sm:py-24 overflow-hidden">
        <div className="absolute inset-0" style={{ background: "linear-gradient(135deg,#F4B400 0%,#E8A317 40%,#F39C12 100%)" }} />
        <div className="absolute inset-0 mandala-bg opacity-30" />
        <div className="container relative z-10 text-center px-4">
          <Sparkles className="w-8 h-8 mx-auto mb-4 text-white opacity-80" />
          <h2 className="text-3xl sm:text-5xl font-display font-extrabold text-white">
            Join 50,000+ Khadayata<br />Members Worldwide
          </h2>
          <p className="text-white/80 mt-4 max-w-lg mx-auto text-lg">
            Create your account, complete your profile, and connect with the Khadayata family worldwide.
          </p>
          <Button asChild size="lg" className="mt-10 h-14 px-10 text-base bg-white text-[#F39C12] font-bold hover:bg-white/90 shadow-elevated border-0 rounded-xl">
            <Link to="/auth">Register Free <ArrowRight className="w-5 h-5 ml-2" /></Link>
          </Button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-[#2E2E2E] text-white pt-12 pb-0">
        <div className="container">
          <div className="grid gap-8 md:grid-cols-4 pb-10">
            <div className="md:col-span-1">
              <img src={khadayataLogo} alt="Khadayata" className="h-12 w-auto mb-4 brightness-[10] opacity-90" />
              <p className="text-sm text-white/60 mb-4 leading-relaxed">
                Preserving heritage. Empowering community. Connecting generations across the globe.
              </p>
              <div className="text-xs text-white/50 space-y-1">
                <p>1320 Pepperhill Ln, Fort Worth, TX 76131</p>
                <a href="tel:+16824329400" className="hover:text-[#F4B400] transition-colors block">+1 (682) 432-9400</a>
                <a href="mailto:support@khadayataonline.com" className="hover:text-[#F4B400] transition-colors block">support@khadayataonline.com</a>
              </div>
            </div>
            <div>
              <h4 className="font-display font-semibold text-sm mb-3 text-white/80">Platform</h4>
              <ul className="space-y-2 text-sm text-white/50">
                <li><Link to="/directory" className="hover:text-[#F39C12] transition-colors">Directory</Link></li>
                <li><Link to="/events" className="hover:text-[#F39C12] transition-colors">Events</Link></li>
                <li><Link to="/business" className="hover:text-[#F39C12] transition-colors">Business</Link></li>
                <li><Link to="/matrimonial" className="hover:text-[#F39C12] transition-colors">Matrimonial</Link></li>
                <li><Link to="/contact" className="hover:text-[#F39C12] transition-colors">Contact Us</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-display font-semibold text-sm mb-3 text-white/80">Heritage</h4>
              <ul className="space-y-2 text-sm text-white/50">
                <li><Link to="/temple" className="hover:text-[#F39C12] transition-colors">Kotyark Temple</Link></li>
                <li><Link to="/archives" className="hover:text-[#F39C12] transition-colors">Archives</Link></li>
                <li><Link to="/news" className="hover:text-[#F39C12] transition-colors">News</Link></li>
                <li><Link to="/oral-history" className="hover:text-[#F39C12] transition-colors">Oral History</Link></li>
                <li><Link to="/elders-council" className="hover:text-[#F39C12] transition-colors">Elders Council</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-display font-semibold text-sm mb-3 text-white/80">Legal</h4>
              <ul className="space-y-2 text-sm text-white/50">
                <li><Link to="/terms" className="hover:text-[#F39C12] transition-colors">Terms of Use</Link></li>
                <li><Link to="/privacy" className="hover:text-[#F39C12] transition-colors">Privacy Policy</Link></li>
                <li><Link to="/accessibility" className="hover:text-[#F39C12] transition-colors">Accessibility</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 py-6 text-center text-xs text-white/40">
            <p>&copy; {new Date().getFullYear()} Khadayata. All rights reserved. &bull; Jai Jai Khadayata</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
