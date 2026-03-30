import { useParams, Link } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users, Newspaper, Calendar, Briefcase, Camera, MapPin, Building2,
  ArrowLeft, Shield, Clock, ExternalLink, ChevronRight, Mail, Phone, Globe
} from "lucide-react";
import {
  useChapterBySlug, useChapterMemberCount, useChapterMembers,
  useChapterCommittee, useChapterPastCommittee, useChapterEvents,
  useChapterNews, useChapterBusinesses, useChapterJobs, useChapterGallery,
} from "@/hooks/useChapter";
import SEOMeta from "@/components/SEOMeta";
import patternOrnament from "@/assets/pattern-ornament.png";
import { format } from "date-fns";

const BASE_URL = "https://khadayataonline.com";

function initials(first?: string | null, last?: string | null) {
  return `${(first || "?")[0]}${(last || "")[0] || ""}`.toUpperCase();
}

function buildChapterSchema(
  chapterName: string,
  slug: string,
  city: string | undefined,
  state: string | undefined,
  stateCode: string | undefined,
  country: string | undefined,
  countryCode: string | undefined,
  memberCount: number,
  upcomingEventCount: number
) {
  const locationStr = [city, state, country].filter(Boolean).join(", ");
  const chapterUrl = BASE_URL + "/chapters/" + slug;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": ["Organization", "CivicStructure"],
        "@id": chapterUrl + "/#organization",
        name: chapterName + " — Khadayata Community",
        alternateName: chapterName,
        url: chapterUrl,
        description:
          "The Khadayata community chapter in " + (locationStr || "India") +
          ". Connecting " + memberCount + " verified Khadayata community members through events, business networking, and cultural heritage programs.",
        logo: { "@type": "ImageObject", url: BASE_URL + "/Screenshot_2026-03-16_at_9.18.14_AM.png" },
        parentOrganization: {
          "@type": "Organization",
          "@id": BASE_URL + "/#organization",
          name: "Khadayata Online",
          url: BASE_URL,
        },
        address: {
          "@type": "PostalAddress",
          ...(city ? { addressLocality: city } : {}),
          ...(stateCode ? { addressRegion: stateCode } : state ? { addressRegion: state } : {}),
          ...(countryCode ? { addressCountry: countryCode } : country ? { addressCountry: country } : {}),
        },
        areaServed: { "@type": "Place", name: locationStr || "India" },
        knowsAbout: [
          "Khadayata community",
          "Gujarati Hindu community",
          "Kotyark Temple",
          "Indian diaspora " + (country || ""),
          "Community events " + (city || ""),
        ],
      },
      {
        "@type": "WebPage",
        "@id": chapterUrl + "/#webpage",
        url: chapterUrl,
        name: chapterName + " | Khadayata Community Chapter",
        description:
          "Khadayata community chapter in " + (locationStr || "India") +
          ". " + memberCount + " members, " + upcomingEventCount + " upcoming events.",
        isPartOf: { "@id": BASE_URL + "/#website" },
        breadcrumb: {
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
            { "@type": "ListItem", position: 2, name: "Chapters", item: BASE_URL + "/chapters" },
            { "@type": "ListItem", position: 3, name: chapterName, item: chapterUrl },
          ],
        },
        inLanguage: "en-US",
      },
    ],
  };
}

export default function ChapterDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { data: chapter, isLoading } = useChapterBySlug(slug);
  const { data: memberCount } = useChapterMemberCount(chapter?.id);
  const { data: members } = useChapterMembers(chapter?.id);
  const { data: committee } = useChapterCommittee(chapter?.id);
  const { data: pastCommittee } = useChapterPastCommittee(chapter?.id);
  const { data: upcomingEvents } = useChapterEvents(chapter?.id, false);
  const { data: pastEvents } = useChapterEvents(chapter?.id, true);
  const { data: news } = useChapterNews(chapter?.id);
  const { data: businesses } = useChapterBusinesses(chapter?.id);
  const { data: jobs } = useChapterJobs(chapter?.id);
  const { data: gallery } = useChapterGallery(chapter?.id);

  if (isLoading) {
    return (
      <div className="container max-w-6xl py-8 space-y-6">
        <Skeleton className="h-48 w-full rounded-2xl" />
        <div className="grid grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!chapter) {
    return (
      <div className="container max-w-6xl py-20 text-center">
        <h2 className="text-2xl font-display font-bold">Chapter Not Found</h2>
        <p className="text-muted-foreground mt-2">The chapter you're looking for doesn't exist.</p>
        <Button asChild className="mt-6"><Link to="/directory">← Back to Directory</Link></Button>
      </div>
    );
  }

  const city = (chapter.cities as { name: string } | null)?.name;
  const state = (chapter.states as { name: string } | null)?.name;
  const stateCode = (chapter.states as { name: string; code?: string } | null)?.code;
  const country = (chapter.countries as { name: string } | null)?.name;
  const countryCode = (chapter.countries as { name: string; iso2?: string } | null)?.iso2;
  const locationStr = [city, state, country].filter(Boolean).join(", ");
  const count = memberCount ?? 0;
  const upcomingCount = upcomingEvents?.length ?? 0;

  const contact = (chapter.settings as { contact?: { email?: string; phone?: string; url?: string } } | null)?.contact;
  const contactEmail = contact?.email;
  const contactPhone = contact?.phone;
  const contactUrl = contact?.url;

  const seoTitle = chapter.name + (locationStr ? " — Khadayata Community in " + locationStr : " — Khadayata Community");
  const seoDescription =
    "Khadayata community chapter in " + (locationStr || "India") +
    ". " + count + " verified members, " + upcomingCount + " upcoming events, local businesses and news. " +
    "Join the Khadayata community in " + (city || country || "your area") + ".";
  const seoKeywords =
    "Khadayata " + (city || "") + ", Khadayata community " + (country || "India") +
    ", Gujarati community " + (city || "") + ", Indian community " + (city || "") +
    ", Khadayata chapter, Khadayata members, Hindu community " + (city || "");

  const stats = [
    { label: "Members", value: count, icon: Users },
    { label: "Businesses", value: businesses?.length ?? 0, icon: Building2 },
    { label: "Upcoming Events", value: upcomingCount, icon: Calendar },
    { label: "Open Jobs", value: jobs?.length ?? 0, icon: Briefcase },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEOMeta
        title={seoTitle}
        description={seoDescription}
        keywords={seoKeywords}
        url={"/chapters/" + slug}
        type="website"
        schema={buildChapterSchema(chapter.name, slug!, city, state, stateCode, country, countryCode, count, upcomingCount)}
      />
      {/* Hero */}
      <div className="relative gradient-hero py-10 sm:py-16">
        <img src={patternOrnament} alt="" className="absolute right-4 top-1/2 -translate-y-1/2 w-40 h-40 opacity-10" />
        <div className="container max-w-6xl relative z-10">
          <Link to="/directory" className="inline-flex items-center gap-1 text-primary-foreground/70 text-sm hover:text-primary-foreground mb-4">
            <ArrowLeft className="w-4 h-4" /> All Chapters
          </Link>
          <h1 className="text-3xl sm:text-5xl font-display font-extrabold text-primary-foreground">
            {chapter.name}
          </h1>
          {locationStr && (
            <p className="flex items-center gap-1.5 text-primary-foreground/80 mt-2 text-sm">
              <MapPin className="w-4 h-4 shrink-0" />
              {locationStr}
            </p>
          )}
          {(contactEmail || contactPhone || contactUrl) && (
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-3">
              {contactPhone && (
                <a
                  href={`tel:${contactPhone}`}
                  className="inline-flex items-center gap-1.5 text-primary-foreground/90 hover:text-primary-foreground text-sm transition-colors"
                >
                  <Phone className="w-4 h-4 shrink-0" />
                  {contactPhone}
                </a>
              )}
              {contactEmail && (
                <a
                  href={`mailto:${contactEmail}`}
                  className="inline-flex items-center gap-1.5 text-primary-foreground/90 hover:text-primary-foreground text-sm transition-colors"
                >
                  <Mail className="w-4 h-4 shrink-0" />
                  {contactEmail}
                </a>
              )}
              {contactUrl && (
                <a
                  href={contactUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-primary-foreground/90 hover:text-primary-foreground text-sm transition-colors"
                >
                  <Globe className="w-4 h-4 shrink-0" />
                  {contactUrl.replace(/^https?:\/\//, "")}
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="container max-w-6xl py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 -mt-12 relative z-20 mb-8">
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <Card key={s.label} className="shadow-card border-border/50">
                <CardContent className="p-5 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg gradient-warm flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="text-2xl font-display font-bold">{s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="committee" className="space-y-6">
          <TabsList className="flex flex-wrap gap-1 h-auto bg-muted/50 p-1 rounded-xl">
            <TabsTrigger value="committee" className="gap-1.5"><Shield className="w-3.5 h-3.5" /> Committee</TabsTrigger>
            <TabsTrigger value="members" className="gap-1.5"><Users className="w-3.5 h-3.5" /> Members</TabsTrigger>
            <TabsTrigger value="news" className="gap-1.5"><Newspaper className="w-3.5 h-3.5" /> News</TabsTrigger>
            <TabsTrigger value="events" className="gap-1.5"><Calendar className="w-3.5 h-3.5" /> Events</TabsTrigger>
            <TabsTrigger value="businesses" className="gap-1.5"><Building2 className="w-3.5 h-3.5" /> Businesses</TabsTrigger>
            <TabsTrigger value="jobs" className="gap-1.5"><Briefcase className="w-3.5 h-3.5" /> Jobs</TabsTrigger>
            <TabsTrigger value="gallery" className="gap-1.5"><Camera className="w-3.5 h-3.5" /> Gallery</TabsTrigger>
            <TabsTrigger value="history" className="gap-1.5"><Clock className="w-3.5 h-3.5" /> History</TabsTrigger>
          </TabsList>

          {/* Committee */}
          <TabsContent value="committee" className="space-y-6">
            <h2 className="text-xl font-display font-bold">Current Committee</h2>
            {committee && committee.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {committee.map((c) => {
                   const m = c.members as { id: string; first_name: string; last_name: string; photo_url: string | null; global_id: string | null } | null;
                  return (
                    <Card key={c.id} className="shadow-card hover:shadow-elevated transition-all">
                      <CardContent className="p-5 flex items-center gap-4">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={m?.photo_url ?? undefined} />
                          <AvatarFallback className="gradient-warm text-primary-foreground text-sm font-bold">
                            {initials(m?.first_name, m?.last_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <Link to={`/member/${m?.id}`} className="font-semibold text-sm hover:text-primary truncate block">
                            {m?.first_name} {m?.last_name}
                          </Link>
                          <Badge variant="secondary" className="mt-1 text-xs">
                            {(c.roles as { name: string } | null)?.name}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No committee members assigned yet.</p>
            )}
          </TabsContent>

          {/* Members */}
          <TabsContent value="members" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-display font-bold">Members ({count})</h2>
            </div>
            {members && members.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {members.map((m) => (
                  <Link key={m.id} to={`/member/${m.id}`} className="group">
                    <Card className="shadow-card hover:shadow-elevated transition-all group-hover:-translate-y-0.5">
                      <CardContent className="p-4 flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={m.photo_url ?? undefined} />
                          <AvatarFallback className="gradient-hero text-primary-foreground text-xs font-bold">
                            {initials(m.first_name, m.last_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm truncate">{m.first_name} {m.last_name}</p>
                          {m.global_id && <p className="text-xs text-muted-foreground">{m.global_id}</p>}
                        </div>
                        {m.verification_level && m.verification_level > 0 && (
                          <Shield className="w-4 h-4 text-success shrink-0" />
                        )}
                        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No members in this chapter yet.</p>
            )}
          </TabsContent>

          {/* News */}
          <TabsContent value="news" className="space-y-4">
            <h2 className="text-xl font-display font-bold">Chapter News</h2>
            {news && news.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {news.map((n) => (
                  <Card key={n.id} className="shadow-card overflow-hidden hover:shadow-elevated transition-all">
                    {n.cover_image_url && (
                      <img src={n.cover_image_url} alt={n.title} className="w-full h-40 object-cover" />
                    )}
                    <CardContent className="p-5">
                      <p className="font-display font-bold text-sm line-clamp-2">{n.title}</p>
                      {n.summary && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{n.summary}</p>}
                      <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                        {n.category && <Badge variant="outline" className="text-xs">{n.category}</Badge>}
                        {n.published_at && <span>{format(new Date(n.published_at), "MMM d, yyyy")}</span>}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No news articles yet.</p>
            )}
          </TabsContent>

          {/* Events */}
          <TabsContent value="events" className="space-y-6">
            <h2 className="text-xl font-display font-bold">Upcoming Events</h2>
            {upcomingEvents && upcomingEvents.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {upcomingEvents.map((e) => (
                  <Card key={e.id} className="shadow-card overflow-hidden hover:shadow-elevated transition-all">
                    {e.cover_image_url && <img src={e.cover_image_url} alt={e.name} className="w-full h-36 object-cover" />}
                    <CardContent className="p-5">
                      <p className="font-display font-bold">{e.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">{format(new Date(e.starts_at), "PPP 'at' p")}</p>
                      {e.venue && <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><MapPin className="w-3 h-3" /> {e.venue}</p>}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No upcoming events.</p>
            )}

            {pastEvents && pastEvents.length > 0 && (
              <>
                <h2 className="text-xl font-display font-bold pt-4">Past Events</h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {pastEvents.map((e) => (
                    <Card key={e.id} className="shadow-card opacity-80">
                      <CardContent className="p-4">
                        <p className="font-semibold text-sm">{e.name}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(e.starts_at), "PPP")}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </TabsContent>

          {/* Businesses */}
          <TabsContent value="businesses" className="space-y-4">
            <h2 className="text-xl font-display font-bold">Businesses ({businesses?.length ?? 0})</h2>
            {businesses && businesses.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {businesses.map((b) => (
                  <Card key={b.id} className="shadow-card hover:shadow-elevated transition-all">
                    <CardContent className="p-5 flex items-start gap-3">
                      {b.logo_url ? (
                        <img src={b.logo_url} alt={b.name} className="w-12 h-12 rounded-lg object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg gradient-jewel flex items-center justify-center shrink-0">
                          <Building2 className="w-6 h-6 text-primary-foreground" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{b.name}</p>
                        {b.sector && <Badge variant="outline" className="text-xs mt-1">{b.sector}</Badge>}
                        {b.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{b.description}</p>}
                        <div className="flex items-center gap-2 mt-2">
                          {b.verified && <Badge className="text-xs bg-success text-success-foreground">Verified</Badge>}
                          {b.website && (
                            <a href={b.website} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-0.5">
                              <ExternalLink className="w-3 h-3" /> Website
                            </a>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No businesses listed yet.</p>
            )}
          </TabsContent>

          {/* Jobs */}
          <TabsContent value="jobs" className="space-y-4">
            <h2 className="text-xl font-display font-bold">Open Jobs ({jobs?.length ?? 0})</h2>
            {jobs && jobs.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {jobs.map((j) => (
                  <Card key={j.id} className="shadow-card hover:shadow-elevated transition-all">
                    <CardContent className="p-5">
                      <p className="font-display font-bold text-sm">{j.title}</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {j.employment_type && <Badge variant="outline" className="text-xs">{j.employment_type.replace("_", " ")}</Badge>}
                        {j.remote && <Badge variant="outline" className="text-xs">Remote</Badge>}
                        {j.location && <span className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" /> {j.location}</span>}
                      </div>
                      {j.salary_min && j.salary_max && (
                        <p className="text-xs text-muted-foreground mt-2">
                          {j.salary_currency} {j.salary_min.toLocaleString()} – {j.salary_max.toLocaleString()}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No open jobs right now.</p>
            )}
          </TabsContent>

          {/* Gallery */}
          <TabsContent value="gallery" className="space-y-4">
            <h2 className="text-xl font-display font-bold">Photo Gallery</h2>
            {gallery && gallery.length > 0 ? (
              <div className="columns-2 sm:columns-3 lg:columns-4 gap-3 space-y-3">
                {gallery.map((p) => (
                  <div key={p.id} className="break-inside-avoid rounded-xl overflow-hidden shadow-card group">
                    <img src={p.url} alt={p.caption ?? "Event photo"} className="w-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    {p.caption && (
                      <div className="p-2 bg-card">
                        <p className="text-xs text-muted-foreground line-clamp-1">{p.caption}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No photos uploaded yet.</p>
            )}
          </TabsContent>

          {/* History (Past Committee + Past Events Gallery) */}
          <TabsContent value="history" className="space-y-8">
            <div>
              <h2 className="text-xl font-display font-bold">Past Committee Members</h2>
              {pastCommittee && pastCommittee.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mt-4">
                  {pastCommittee.map((c) => {
                    const m = c.members as { id: string; first_name: string; last_name: string; photo_url: string | null } | null;
                    return (
                      <Card key={c.id} className="shadow-card opacity-80">
                        <CardContent className="p-4 flex items-center gap-3">
                          <Avatar className="w-9 h-9">
                            <AvatarImage src={m?.photo_url ?? undefined} />
                            <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                              {initials(m?.first_name, m?.last_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm truncate">{m?.first_name} {m?.last_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {(c.roles as { name: string } | null)?.name}
                              {c.start_date && c.end_date && ` · ${c.start_date.slice(0, 4)}–${c.end_date.slice(0, 4)}`}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm mt-2">No past committee records.</p>
              )}
            </div>

            <div>
              <h2 className="text-xl font-display font-bold">Past Event Gallery</h2>
              {pastEvents && pastEvents.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-4">
                  {pastEvents.map((e) => (
                    <Card key={e.id} className="shadow-card overflow-hidden">
                      {e.cover_image_url && <img src={e.cover_image_url} alt={e.name} className="w-full h-32 object-cover" />}
                      <CardContent className="p-4">
                        <p className="font-semibold text-sm">{e.name}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(e.starts_at), "PPP")}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm mt-2">No past events recorded.</p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
