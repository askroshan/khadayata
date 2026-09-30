import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import PublicLayout from "@/components/PublicLayout";
import SEOMeta from "@/components/SEOMeta";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Search, MapPin, CircleCheck as CheckCircle, Briefcase, Users, Globe, ExternalLink, ArrowRight, TrendingUp, Clock, GraduationCap, DollarSign } from "lucide-react";
import LoginGate from "@/components/LoginGate";

const SECTORS = [
  "Healthcare", "Technology", "Education", "Finance", "Real Estate",
  "Retail", "Manufacturing", "Hospitality", "Legal", "Construction",
  "Textile", "Diamond & Jewellery", "Food & Beverage",
  "Transport & Logistics", "Agriculture", "Other",
];

const EMPLOYMENT_TYPES = [
  { value: "full_time", label: "Full Time" },
  { value: "part_time", label: "Part Time" },
  { value: "contract", label: "Contract" },
  { value: "internship", label: "Internship" },
  { value: "freelance", label: "Freelance" },
  { value: "volunteer", label: "Volunteer" },
];

export default function PublicBusiness() {
  const { user } = useAuth();
  const [tab, setTab] = useState("businesses");
  const [searchBiz, setSearchBiz] = useState("");
  const [searchJob, setSearchJob] = useState("");
  const [sectorFilter, setSectorFilter] = useState("__all__");
  const [verifiedFilter, setVerifiedFilter] = useState("all");
  const [jobTypeFilter, setJobTypeFilter] = useState("__all__");

  const { data: businesses, isLoading: bizLoading } = useQuery({
    queryKey: ["public-businesses", searchBiz, sectorFilter, verifiedFilter],
    queryFn: async () => {
      let q = supabase
        .from("businesses")
        .select("id, name, sector, description, website, employee_count, founded_year, tags, verified, countries(name), states(name), cities(name), chapters(name)")
        .order("verified", { ascending: false })
        .order("created_at", { ascending: false });
      if (searchBiz.trim()) q = q.or(`name.ilike.%${searchBiz}%,sector.ilike.%${searchBiz}%,description.ilike.%${searchBiz}%`);
      if (sectorFilter !== "__all__") q = q.eq("sector", sectorFilter);
      if (verifiedFilter === "verified") q = q.eq("verified", true);
      if (verifiedFilter === "unverified") q = q.eq("verified", false);
      const { data, error } = await q.limit(60);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: jobs, isLoading: jobLoading } = useQuery({
    queryKey: ["public-jobs", searchJob, jobTypeFilter],
    queryFn: async () => {
      let q = supabase
        .from("jobs")
        .select("id, title, description, location, remote, employment_type, salary_min, salary_max, salary_currency, salary_period, experience_min, experience_max, education_required, skills_required, benefits, positions_available, countries(name), states(name), cities(name), businesses:employer_business_id(name)")
        .eq("status", "open")
        .order("created_at", { ascending: false });
      if (searchJob.trim()) q = q.or(`title.ilike.%${searchJob}%,description.ilike.%${searchJob}%,location.ilike.%${searchJob}%`);
      if (jobTypeFilter !== "__all__") q = q.eq("employment_type", jobTypeFilter);
      const { data, error } = await q.limit(60);
      if (error) throw error;
      return data ?? [];
    },
  });

  const locationStr = (item: Record<string, unknown>) => {
    const parts = [
      (item.cities as { name: string } | null)?.name,
      (item.states as { name: string } | null)?.name,
      (item.countries as { name: string } | null)?.name,
    ].filter(Boolean);
    return parts.join(", ");
  };

  const formatSalary = (job: Record<string, unknown>) => {
    const min = job.salary_min as number | null;
    const max = job.salary_max as number | null;
    const cur = (job.salary_currency as string) ?? "INR";
    const per = (job.salary_period as string) ?? "annual";
    if (!min && !max) return null;
    const fmt = (n: number) => n >= 100000 ? `${(n / 100000).toFixed(n % 100000 === 0 ? 0 : 1)}L` : n >= 1000 ? `${(n / 1000).toFixed(0)}K` : `${n}`;
    const range = min && max ? `${fmt(min)}–${fmt(max)}` : min ? `${fmt(min)}+` : `up to ${fmt(max!)}`;
    return `${cur} ${range} / ${per}`;
  };

  return (
    <PublicLayout title="Business & Jobs">
      <SEOMeta
        title="Business & Jobs"
        description="Discover Khadayata community businesses and job opportunities. Browse the community business directory and open job listings across industries and locations worldwide."
        url="/business"
        keywords="Khadayata business directory, Khadayata jobs, Indian community businesses, Gujarati businesses, community job listings, Khadayata employment"
        schema={{
          "@type": "ItemList",
          name: "Khadayata Community Business Directory",
          description: "Browse businesses owned and operated by Khadayata community members worldwide",
          url: "https://khadayataonline.com/business",
        }}
      />

      <div style={{ fontFamily: "'Poppins', sans-serif", background: "#FFF7E6", minHeight: "60vh" }}>

        {/* Hero */}
        <div style={{
          background: "linear-gradient(135deg,#1a1a1a 0%,#2E2E2E 55%,rgba(67,160,71,0.18) 100%)",
          padding: "52px 24px 40px",
        }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
              <TrendingUp size={28} style={{ color: "#43A047" }} />
              <h1 style={{ fontSize: "clamp(1.8rem,3.5vw,2.6rem)", fontWeight: 800, color: "#fff", margin: 0 }}>
                Business & Jobs
              </h1>
            </div>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 15, maxWidth: 560, margin: 0 }}>
              Community business directory and open job opportunities. Support Khadayata businesses and find your next role.
            </p>
            {!user && (
              <div style={{ marginTop: 18, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.55)" }}>Want to list your business or post a job?</span>
                <Link to="/auth" style={{
                  padding: "8px 20px", borderRadius: 50, fontSize: 13, fontWeight: 700, color: "#2E2E2E",
                  background: "#F4B400", textDecoration: "none",
                }}>Join / Sign In</Link>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 24px" }}>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="businesses">
                <Building2 className="w-3.5 h-3.5 mr-1" />
                Businesses ({bizLoading ? "…" : businesses?.length ?? 0})
              </TabsTrigger>
              <TabsTrigger value="jobs">
                <Briefcase className="w-3.5 h-3.5 mr-1" />
                Jobs ({jobLoading ? "…" : jobs?.length ?? 0})
              </TabsTrigger>
            </TabsList>

            {/* ===== BUSINESSES ===== */}
            <TabsContent value="businesses" className="mt-6 space-y-5">
              {/* Filters */}
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
                  <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#757575" }} />
                  <Input placeholder="Search businesses..." value={searchBiz} onChange={e => setSearchBiz(e.target.value)} style={{ paddingLeft: 38 }} />
                </div>
                <Select value={sectorFilter} onValueChange={setSectorFilter}>
                  <SelectTrigger style={{ width: 180 }}><SelectValue placeholder="All Sectors" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All Sectors</SelectItem>
                    {SECTORS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={verifiedFilter} onValueChange={setVerifiedFilter}>
                  <SelectTrigger style={{ width: 170 }}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Listings</SelectItem>
                    <SelectItem value="verified">Verified Only</SelectItem>
                    <SelectItem value="unverified">Unverified</SelectItem>
                  </SelectContent>
                </Select>
                {user && (
                  <Link to="/business/manage" style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "9px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "#fff",
                    background: "linear-gradient(135deg,#327935,#186eb9)", textDecoration: "none",
                    whiteSpace: "nowrap",
                  }}>
                    Manage Listings <ArrowRight size={14} />
                  </Link>
                )}
              </div>

              {bizLoading && (
                <div style={{ textAlign: "center", padding: "60px 0", color: "rgba(46,46,46,0.75)" }}>
                  <Building2 size={40} style={{ margin: "0 auto 12px", opacity: 0.2, display: "block" }} />
                  <p>Loading businesses...</p>
                </div>
              )}
              {!bizLoading && businesses?.length === 0 && (
                <div style={{ textAlign: "center", padding: "60px 0" }}>
                  <Building2 size={48} style={{ margin: "0 auto 16px", color: "#2E2E2E30", display: "block" }} />
                  <p style={{ color: "rgba(46,46,46,0.75)" }}>No businesses found</p>
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: 20 }}>
                {businesses?.map((b) => {
                  const bRec = b as Record<string, unknown>;
                  const loc = locationStr(bRec);
                  return (
                    <article key={b.id} style={{
                      background: "#fff", borderRadius: 20, overflow: "hidden",
                      boxShadow: "0 4px 20px rgba(46,46,46,0.08)",
                      border: "1px solid rgba(232,163,23,0.15)",
                      transition: "transform .22s, box-shadow .22s",
                    }}
                      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 14px 36px rgba(46,46,46,0.14)"; }}
                      onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(46,46,46,0.08)"; }}
                    >
                      <div style={{ height: 4, background: b.verified ? "linear-gradient(90deg,#327935,#186eb9)" : "linear-gradient(90deg,#96600b,#F4B400)" }} />
                      <div style={{ padding: "18px 20px" }}>
                        {/* Header */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <h3 style={{ fontSize: 15, fontWeight: 700, color: "#2E2E2E", margin: "0 0 6px", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                              {b.name}
                              {b.verified && <CheckCircle size={15} style={{ color: "#327935", flexShrink: 0 }} />}
                            </h3>
                            {b.sector && (
                              <span style={{ padding: "3px 10px", borderRadius: 50, fontSize: 11, color: "rgba(46,46,46,0.75)", background: "#F0F0F0", display: "inline-block" }}>
                                {b.sector}
                              </span>
                            )}
                          </div>
                          {b.website && (
                            <a href={b.website as string} target="_blank" rel="noopener noreferrer" style={{ color: "#186eb9", padding: 6, borderRadius: 8, transition: "background .18s" }}
                              onMouseEnter={e => (e.currentTarget.style.background = "#E8F4FD")}
                              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                              title="Visit website">
                              <ExternalLink size={15} />
                            </a>
                          )}
                        </div>

                        {/* Description */}
                        {b.description && (
                          <p style={{ fontSize: 13, color: "rgba(46,46,46,0.75)", lineHeight: 1.6, margin: "0 0 12px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as React.CSSProperties}>
                            {b.description as string}
                          </p>
                        )}

                        {/* Meta chips */}
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, fontSize: 11, color: "rgba(46,46,46,0.75)" }}>
                          {loc && <span style={{ display: "flex", alignItems: "center", gap: 4, background: "#F5F5F5", padding: "4px 10px", borderRadius: 50 }}><MapPin size={10} />{loc}</span>}
                          {b.employee_count && <span style={{ display: "flex", alignItems: "center", gap: 4, background: "#F5F5F5", padding: "4px 10px", borderRadius: 50 }}><Users size={10} />{b.employee_count as string} emp.</span>}
                          {b.founded_year && <span style={{ background: "#F5F5F5", padding: "4px 10px", borderRadius: 50 }}>Est. {b.founded_year as number}</span>}
                        </div>

                        {/* Tags */}
                        {(b.tags as string[])?.length > 0 && (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 10 }}>
                            {(b.tags as string[]).slice(0, 4).map(t => (
                              <span key={t} style={{ padding: "3px 8px", borderRadius: 6, fontSize: 10, color: "rgba(46,46,46,0.75)", border: "1px solid rgba(232,163,23,0.35)", background: "rgba(232,163,23,0.06)" }}>{t}</span>
                            ))}
                          </div>
                        )}

                        {/* Login gate for contact */}
                        {!user ? (
                          <LoginGate title="Sign In Required" message="Sign in to view contact details and connect" ctaLabel="Sign in" />
                        ) : (
                          <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(232,163,23,0.15)", fontSize: 12, color: "rgba(46,46,46,0.75)" }}>
                            <Link to="/business/manage" style={{ color: "#327935", fontWeight: 600, textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
                              View full details <ArrowRight size={12} />
                            </Link>
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </TabsContent>

            {/* ===== JOBS ===== */}
            <TabsContent value="jobs" className="mt-6 space-y-5">
              {/* Filters */}
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
                  <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#757575" }} />
                  <Input placeholder="Search jobs..." value={searchJob} onChange={e => setSearchJob(e.target.value)} style={{ paddingLeft: 38 }} />
                </div>
                <Select value={jobTypeFilter} onValueChange={setJobTypeFilter}>
                  <SelectTrigger style={{ width: 180 }}><SelectValue placeholder="All Types" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All Types</SelectItem>
                    {EMPLOYMENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                {user && (
                  <Link to="/business/manage" style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "9px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "#fff",
                    background: "linear-gradient(135deg,#96600b,#cf1a58)", textDecoration: "none",
                    whiteSpace: "nowrap",
                  }}>
                    Post a Job <ArrowRight size={14} />
                  </Link>
                )}
              </div>

              {jobLoading && (
                <div style={{ textAlign: "center", padding: "60px 0", color: "rgba(46,46,46,0.75)" }}>
                  <Briefcase size={40} style={{ margin: "0 auto 12px", opacity: 0.2, display: "block" }} />
                  <p>Loading jobs...</p>
                </div>
              )}
              {!jobLoading && jobs?.length === 0 && (
                <div style={{ textAlign: "center", padding: "60px 0" }}>
                  <Briefcase size={48} style={{ margin: "0 auto 16px", color: "#2E2E2E30", display: "block" }} />
                  <p style={{ color: "rgba(46,46,46,0.75)" }}>No job listings found</p>
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {jobs?.map((j) => {
                  const jRec = j as Record<string, unknown>;
                  const loc = locationStr(jRec);
                  const salary = formatSalary(jRec);
                  const typeMeta = EMPLOYMENT_TYPES.find(t => t.value === j.employment_type);
                  const employer = (jRec.businesses as { name: string } | null)?.name;

                  return (
                    <article key={j.id} style={{
                      background: "#fff", borderRadius: 18,
                      boxShadow: "0 4px 20px rgba(46,46,46,0.07)",
                      border: "1px solid rgba(232,163,23,0.15)",
                      padding: "20px 24px",
                      transition: "transform .2s, box-shadow .2s",
                    }}
                      onMouseEnter={e => { e.currentTarget.style.transform = "translateX(4px)"; e.currentTarget.style.boxShadow = "0 8px 28px rgba(46,46,46,0.12)"; }}
                      onMouseLeave={e => { e.currentTarget.style.transform = "translateX(0)"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(46,46,46,0.07)"; }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
                        <div style={{ flex: 1, minWidth: 200 }}>
                          <h3 style={{ fontSize: 16, fontWeight: 700, color: "#2E2E2E", margin: "0 0 4px" }}>
                            {j.title}
                          </h3>
                          {employer && (
                            <p style={{ fontSize: 13, color: "#186eb9", fontWeight: 600, margin: "0 0 10px" }}>{employer}</p>
                          )}
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, fontSize: 12, color: "rgba(46,46,46,0.75)" }}>
                            {typeMeta && (
                              <span style={{ padding: "4px 10px", borderRadius: 50, background: "#E8F5E9", color: "#327935", fontWeight: 600 }}>
                                {typeMeta.label}
                              </span>
                            )}
                            {j.remote && (
                              <span style={{ padding: "4px 10px", borderRadius: 50, background: "#E3F2FD", color: "#186eb9", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                                <Globe size={10} /> Remote
                              </span>
                            )}
                            {loc && (
                              <span style={{ display: "flex", alignItems: "center", gap: 4, background: "#F5F5F5", padding: "4px 10px", borderRadius: 50 }}>
                                <MapPin size={10} />{loc}
                              </span>
                            )}
                            {salary && (
                              <span style={{ display: "flex", alignItems: "center", gap: 4, background: "#FFF8E1", color: "#96600b", padding: "4px 10px", borderRadius: 50, fontWeight: 600 }}>
                                <DollarSign size={10} />{salary}
                              </span>
                            )}
                          </div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, flexShrink: 0 }}>
                          {j.positions_available && (
                            <span style={{ fontSize: 11, color: "rgba(46,46,46,0.75)", background: "#F5F5F5", padding: "4px 10px", borderRadius: 50 }}>
                              {j.positions_available as number} position{(j.positions_available as number) > 1 ? "s" : ""}
                            </span>
                          )}
                        </div>
                      </div>

                      {j.description && (
                        <p style={{ fontSize: 13, color: "rgba(46,46,46,0.75)", lineHeight: 1.65, margin: "12px 0 0", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as React.CSSProperties}>
                          {j.description as string}
                        </p>
                      )}

                      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 10, fontSize: 11, color: "rgba(46,46,46,0.75)" }}>
                        {(j.experience_min || j.experience_max) && (
                          <span style={{ display: "flex", alignItems: "center", gap: 4, background: "#F5F5F5", padding: "3px 10px", borderRadius: 50 }}>
                            <Clock size={10} />
                            {j.experience_min && j.experience_max ? `${j.experience_min}–${j.experience_max} yrs exp` : j.experience_min ? `${j.experience_min}+ yrs exp` : `up to ${j.experience_max} yrs exp`}
                          </span>
                        )}
                        {j.education_required && (
                          <span style={{ display: "flex", alignItems: "center", gap: 4, background: "#F5F5F5", padding: "3px 10px", borderRadius: 50 }}>
                            <GraduationCap size={10} />{j.education_required as string}
                          </span>
                        )}
                        {(j.skills_required as string[])?.slice(0, 3).map(s => (
                          <span key={s} style={{ background: "#EDE7F6", color: "#5E35B1", padding: "3px 10px", borderRadius: 50, fontSize: 10 }}>{s}</span>
                        ))}
                      </div>

                      {/* Login gate for applying */}
                      {!user ? (
                        <LoginGate title="Sign In Required" message="Sign in to apply for this position and view contact details" ctaLabel="Sign in" />
                      ) : (
                        <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(232,163,23,0.15)" }}>
                          <Link to="/business/manage" style={{
                            display: "inline-flex", alignItems: "center", gap: 6,
                            padding: "9px 22px", borderRadius: 50, fontSize: 13, fontWeight: 700, color: "#fff",
                            background: "linear-gradient(135deg,#96600b,#cf1a58)", textDecoration: "none",
                          }}>
                            Apply Now <ArrowRight size={14} />
                          </Link>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </PublicLayout>
  );
}
