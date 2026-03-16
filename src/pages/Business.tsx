import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useMember, useCountries, useStates, useCities } from "@/hooks/useMember";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Building2, MapPin, Plus, ExternalLink, CircleCheck as CheckCircle, Briefcase, TrendingUp, Phone, Mail, Globe, Clock, DollarSign, Users, GraduationCap, Search } from "lucide-react";
import { ReportDialog } from "@/components/ReportDialog";
import { L2GateButton } from "@/components/verification/VerificationGate";
import businessHero from "@/assets/business-hero.jpg";

const SECTORS = ["Healthcare", "Technology", "Education", "Finance", "Real Estate", "Retail", "Manufacturing", "Hospitality", "Legal", "Construction", "Textile", "Diamond & Jewellery", "Food & Beverage", "Transport & Logistics", "Agriculture", "Other"];
const EMPLOYEE_RANGES = ["1-5", "6-10", "11-50", "51-200", "201-500", "500+"];
const EMPLOYMENT_TYPES = [
  { value: "full_time", label: "Full Time" }, { value: "part_time", label: "Part Time" },
  { value: "contract", label: "Contract" }, { value: "internship", label: "Internship" },
  { value: "freelance", label: "Freelance" }, { value: "volunteer", label: "Volunteer" },
];
const SALARY_PERIODS = ["hourly", "monthly", "annual"];

export default function Business() {
  const { user, loading } = useAuth();
  const { member } = useMember();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("businesses");
  const [searchBiz, setSearchBiz] = useState("");
  const [searchJob, setSearchJob] = useState("");
  const [sectorFilter, setSectorFilter] = useState("");
  const [verifiedFilter, setVerifiedFilter] = useState<"all" | "verified" | "unverified">("all");
  const [jobTypeFilter, setJobTypeFilter] = useState("");
  const [jobLocationFilter, setJobLocationFilter] = useState("");

  // Business form
  const [biz, setBiz] = useState({
    name: "", sector: "", description: "", website: "", phone: "", email: "",
    address_line1: "", address_line2: "", postal_code: "",
    country_id: "", state_id: "", city_id: "",
    founded_year: "", employee_count: "", gst_number: "", license_number: "",
    tags: "",
  });

  // Job form
  const [job, setJob] = useState({
    title: "", description: "", location: "", remote: false,
    employment_type: "full_time", salary_min: "", salary_max: "", salary_currency: "INR", salary_period: "annual",
    experience_min: "", experience_max: "", education_required: "",
    skills_required: "", benefits: "", positions_available: "1",
    contact_email: "", contact_phone: "", application_url: "",
    country_id: "", state_id: "", city_id: "",
  });

  const { data: countries } = useCountries();
  const { data: bizStates } = useStates(biz.country_id || undefined);
  const { data: bizCities } = useCities(biz.state_id || undefined);
  const { data: jobStates } = useStates(job.country_id || undefined);
  const { data: jobCities } = useCities(job.state_id || undefined);

  const { data: businesses } = useQuery({
    queryKey: ["businesses", searchBiz, sectorFilter, verifiedFilter],
    queryFn: async () => {
      let q = supabase.from("businesses").select("*, members:owner_member_id(first_name, last_name), chapters(name), countries(name), states(name), cities(name)").order("created_at", { ascending: false });
      if (searchBiz.trim()) q = q.or(`name.ilike.%${searchBiz}%,sector.ilike.%${searchBiz}%,description.ilike.%${searchBiz}%`);
      if (sectorFilter) q = q.eq("sector", sectorFilter);
      if (verifiedFilter === "verified") q = q.eq("verified", true);
      if (verifiedFilter === "unverified") q = q.eq("verified", false);
      const { data } = await q.limit(50);
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: jobs } = useQuery({
    queryKey: ["jobs", searchJob, jobTypeFilter, jobLocationFilter],
    queryFn: async () => {
      let q = supabase.from("jobs").select("*, businesses:employer_business_id(name), members:employer_member_id(first_name, last_name), countries(name), states(name), cities(name)").eq("status", "open").order("created_at", { ascending: false });
      if (searchJob.trim()) q = q.or(`title.ilike.%${searchJob}%,description.ilike.%${searchJob}%,location.ilike.%${searchJob}%`);
      if (jobTypeFilter) q = q.eq("employment_type", jobTypeFilter);
      if (jobLocationFilter.trim()) q = q.ilike("location", `%${jobLocationFilter}%`);
      const { data } = await q.limit(50);
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: myApplications } = useQuery({
    queryKey: ["my-applications"],
    queryFn: async () => { if (!member) return []; const { data } = await supabase.from("job_applications").select("job_id, status").eq("member_id", member.id); return data ?? []; },
    enabled: !!member,
  });

  const createBiz = useMutation({
    mutationFn: async () => {
      if (!member) throw new Error("Not a member");
      const { error } = await supabase.from("businesses").insert({
        owner_member_id: member.id, chapter_id: member.chapter_id,
        name: biz.name.trim(), sector: biz.sector || null, description: biz.description.trim() || null,
        website: biz.website.trim() || null, phone: biz.phone.trim() || null, email: biz.email.trim() || null,
        address_line1: biz.address_line1.trim() || null, address_line2: biz.address_line2.trim() || null,
        postal_code: biz.postal_code.trim() || null,
        country_id: biz.country_id || null, state_id: biz.state_id || null, city_id: biz.city_id || null,
        founded_year: biz.founded_year ? Number(biz.founded_year) : null,
        employee_count: biz.employee_count || null, gst_number: biz.gst_number.trim() || null,
        license_number: biz.license_number.trim() || null,
        tags: biz.tags.split(",").map(t => t.trim()).filter(Boolean),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Business listed!" });
      setBiz({ name: "", sector: "", description: "", website: "", phone: "", email: "", address_line1: "", address_line2: "", postal_code: "", country_id: "", state_id: "", city_id: "", founded_year: "", employee_count: "", gst_number: "", license_number: "", tags: "" });
      queryClient.invalidateQueries({ queryKey: ["businesses"] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const createJob = useMutation({
    mutationFn: async () => {
      if (!member) throw new Error("Not a member");
      const { error } = await supabase.from("jobs").insert({
        employer_member_id: member.id, chapter_id: member.chapter_id,
        title: job.title.trim(), description: job.description.trim() || null,
        location: job.location.trim() || null, remote: job.remote,
        employment_type: job.employment_type,
        salary_min: job.salary_min ? Number(job.salary_min) : null,
        salary_max: job.salary_max ? Number(job.salary_max) : null,
        salary_currency: job.salary_currency, salary_period: job.salary_period,
        experience_min: job.experience_min ? Number(job.experience_min) : null,
        experience_max: job.experience_max ? Number(job.experience_max) : null,
        education_required: job.education_required || null,
        skills_required: job.skills_required.split(",").map(s => s.trim()).filter(Boolean),
        benefits: job.benefits.split(",").map(b => b.trim()).filter(Boolean),
        positions_available: Number(job.positions_available) || 1,
        contact_email: job.contact_email.trim() || null,
        contact_phone: job.contact_phone.trim() || null,
        application_url: job.application_url.trim() || null,
        country_id: job.country_id || null, state_id: job.state_id || null, city_id: job.city_id || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Job posted!" });
      setJob({ title: "", description: "", location: "", remote: false, employment_type: "full_time", salary_min: "", salary_max: "", salary_currency: "INR", salary_period: "annual", experience_min: "", experience_max: "", education_required: "", skills_required: "", benefits: "", positions_available: "1", contact_email: "", contact_phone: "", application_url: "", country_id: "", state_id: "", city_id: "" });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const applyJob = useMutation({
    mutationFn: async (jobId: string) => { if (!member) throw new Error("Not a member"); const { error } = await supabase.from("job_applications").insert({ job_id: jobId, member_id: member.id }); if (error) throw error; },
    onSuccess: () => { toast({ title: "Application submitted!" }); queryClient.invalidateQueries({ queryKey: ["my-applications"] }); },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  if (loading) return <div className="flex min-h-screen items-center justify-center"><div className="animate-pulse text-muted-foreground">Loading...</div></div>;
  if (!user) return <Navigate to="/auth" replace />;

  const locationStr = (item: Record<string, unknown>) => {
    const parts = [
      (item.cities as { name: string } | null)?.name,
      (item.states as { name: string } | null)?.name,
      (item.countries as { name: string } | null)?.name,
    ].filter(Boolean);
    return parts.join(", ");
  };

  return (
    <AppLayout title="Business & Jobs">
      <div className="space-y-6">
        <div className="relative h-48 overflow-hidden">
          <img src={businessHero} alt="Business networking" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-foreground/85 to-foreground/40" />
          <div className="absolute inset-0 flex items-center p-4 sm:p-8">
            <div>
              <h1 className="text-xl sm:text-3xl font-display font-bold text-primary-foreground flex items-center gap-2">
                <TrendingUp className="w-5 sm:w-7 h-5 sm:h-7 text-gold" /> Business & Jobs
              </h1>
              <p className="text-primary-foreground/70 mt-1 text-sm sm:text-base">Community directory with comprehensive business profiles and job opportunities</p>
            </div>
          </div>
        </div>

        <div className="px-3 sm:px-6 pb-6 space-y-4">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="businesses"><Building2 className="w-3.5 h-3.5 mr-1" />Businesses ({businesses?.length ?? 0})</TabsTrigger>
              <TabsTrigger value="jobs"><Briefcase className="w-3.5 h-3.5 mr-1" />Jobs ({jobs?.length ?? 0})</TabsTrigger>
            </TabsList>

            {/* ===== BUSINESSES TAB ===== */}
            <TabsContent value="businesses" className="space-y-4 mt-4">
              <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
                <div className="relative flex-1 min-w-48">
                  <label htmlFor="biz-search" className="sr-only">Search businesses</label>
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
                  <Input id="biz-search" placeholder="Search businesses..." value={searchBiz} onChange={(e) => setSearchBiz(e.target.value)} className="pl-10" />
                </div>
                <Select value={sectorFilter || "__all__"} onValueChange={v => setSectorFilter(v === "__all__" ? "" : v)}>
                  <SelectTrigger className="w-44" aria-label="Filter by sector"><SelectValue placeholder="All Sectors" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All Sectors</SelectItem>
                    {SECTORS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={verifiedFilter} onValueChange={v => setVerifiedFilter(v as "all" | "verified" | "unverified")}>
                  <SelectTrigger className="w-40" aria-label="Filter by verification"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Listings</SelectItem>
                    <SelectItem value="verified">Verified Only</SelectItem>
                    <SelectItem value="unverified">Unverified</SelectItem>
                  </SelectContent>
                </Select>
                {(member?.verification_level ?? 0) < 2 ? (
                  <L2GateButton featureName="List Business" />
                ) : (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="gradient-hero text-primary-foreground shrink-0"><Plus className="w-4 h-4 mr-1" />List Business</Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>List Your Business</DialogTitle>
                      <DialogDescription>Add your business to the community directory with complete details.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="sm:col-span-2"><Label>Business Name *</Label><Input value={biz.name} onChange={e => setBiz({...biz, name: e.target.value})} maxLength={200} /></div>
                      <div><Label>Sector</Label>
                        <Select value={biz.sector || "__none__"} onValueChange={v => setBiz({...biz, sector: v === "__none__" ? "" : v})}>
                          <SelectTrigger><SelectValue placeholder="Select sector" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">Select sector</SelectItem>
                            {SECTORS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div><Label>Founded Year</Label><Input type="number" value={biz.founded_year} onChange={e => setBiz({...biz, founded_year: e.target.value})} placeholder="e.g. 2015" /></div>
                      <div className="sm:col-span-2"><Label>Description</Label><Textarea value={biz.description} onChange={e => setBiz({...biz, description: e.target.value})} maxLength={2000} rows={3} /></div>
                      <div><Label>Phone</Label><Input value={biz.phone} onChange={e => setBiz({...biz, phone: e.target.value})} placeholder="+91..." /></div>
                      <div><Label>Email</Label><Input type="email" value={biz.email} onChange={e => setBiz({...biz, email: e.target.value})} /></div>
                      <div><Label>Website</Label><Input value={biz.website} onChange={e => setBiz({...biz, website: e.target.value})} placeholder="https://..." /></div>
                      <div><Label>Employees</Label>
                        <Select value={biz.employee_count} onValueChange={v => setBiz({...biz, employee_count: v})}>
                          <SelectTrigger><SelectValue placeholder="Select range" /></SelectTrigger>
                          <SelectContent>{EMPLOYEE_RANGES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="sm:col-span-2"><Label>Address Line 1</Label><Input value={biz.address_line1} onChange={e => setBiz({...biz, address_line1: e.target.value})} /></div>
                      <div><Label>Address Line 2</Label><Input value={biz.address_line2} onChange={e => setBiz({...biz, address_line2: e.target.value})} /></div>
                      <div><Label>Postal Code</Label><Input value={biz.postal_code} onChange={e => setBiz({...biz, postal_code: e.target.value})} /></div>
                      <div><Label>Country</Label>
                        <Select value={biz.country_id} onValueChange={v => setBiz({...biz, country_id: v, state_id: "", city_id: ""})}>
                          <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
                          <SelectContent>{countries?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div><Label>State</Label>
                        <Select value={biz.state_id} onValueChange={v => setBiz({...biz, state_id: v, city_id: ""})} disabled={!biz.country_id}>
                          <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                          <SelectContent>{bizStates?.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div><Label>City</Label>
                        <Select value={biz.city_id} onValueChange={v => setBiz({...biz, city_id: v})} disabled={!biz.state_id}>
                          <SelectTrigger><SelectValue placeholder="Select city" /></SelectTrigger>
                          <SelectContent>{bizCities?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div><Label>GST Number</Label><Input value={biz.gst_number} onChange={e => setBiz({...biz, gst_number: e.target.value})} /></div>
                      <div><Label>License Number</Label><Input value={biz.license_number} onChange={e => setBiz({...biz, license_number: e.target.value})} /></div>
                      <div className="sm:col-span-2"><Label>Tags (comma-separated)</Label><Input value={biz.tags} onChange={e => setBiz({...biz, tags: e.target.value})} placeholder="wholesale, import, export" /></div>
                      <div className="sm:col-span-2">
                        <Button onClick={() => createBiz.mutate()} disabled={!biz.name.trim() || createBiz.isPending} className="w-full gradient-warm text-primary-foreground">Submit Business</Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                )}
              </div>

              {businesses?.length === 0 && <div className="text-center py-16"><Building2 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" /><p className="text-muted-foreground">No businesses found</p></div>}
              <div className="grid gap-4 sm:grid-cols-2">
                {businesses?.map((b) => (
                  <Card key={b.id} className="shadow-card hover:shadow-elevated transition-all group overflow-hidden">
                    <div className="h-1.5 gradient-warm" />
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-display font-bold flex items-center gap-1.5 group-hover:text-primary transition-colors truncate">
                            {b.name} {b.verified && <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />}
                          </h3>
                          {b.sector && <Badge variant="secondary" className="text-xs mt-1">{b.sector}</Badge>}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <ReportDialog entityType="business" entityId={b.id} entityName={b.name} variant="icon" />
                          {b.website && <a href={b.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 p-2 rounded-lg hover:bg-muted transition-colors"><ExternalLink className="w-4 h-4" /></a>}
                        </div>
                      </div>
                      {b.description && <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{b.description}</p>}
                      <div className="flex flex-wrap gap-2 mt-3 text-xs text-muted-foreground">
                        {locationStr(b) && <span className="flex items-center gap-1 bg-muted/50 px-2 py-1 rounded-full"><MapPin className="w-3 h-3" />{locationStr(b)}</span>}
                        {b.phone && <span className="flex items-center gap-1 bg-muted/50 px-2 py-1 rounded-full"><Phone className="w-3 h-3" />{b.phone}</span>}
                        {b.employee_count && <span className="flex items-center gap-1 bg-muted/50 px-2 py-1 rounded-full"><Users className="w-3 h-3" />{b.employee_count}</span>}
                        {b.founded_year && <span className="bg-muted/50 px-2 py-1 rounded-full">Est. {b.founded_year}</span>}
                      </div>
                      {(b.tags as string[])?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {(b.tags as string[]).map(t => <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>)}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground mt-3">by {(b.members as { first_name: string; last_name: string } | null)?.first_name} {(b.members as { first_name: string; last_name: string } | null)?.last_name}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* ===== JOBS TAB ===== */}
            <TabsContent value="jobs" className="space-y-4 mt-4">
              <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
                <div className="relative flex-1 min-w-48">
                  <label htmlFor="job-search" className="sr-only">Search jobs by title, skill or location</label>
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
                  <Input id="job-search" placeholder="Search jobs by title, skill, location..." value={searchJob} onChange={(e) => setSearchJob(e.target.value)} className="pl-10" />
                </div>
                <Select value={jobTypeFilter || "__all__"} onValueChange={v => setJobTypeFilter(v === "__all__" ? "" : v)}>
                  <SelectTrigger className="w-40" aria-label="Filter by employment type"><SelectValue placeholder="All Types" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All Types</SelectItem>
                    {EMPLOYMENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <div className="relative w-full sm:w-44">
                  <label htmlFor="job-location-filter" className="sr-only">Filter by location</label>
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
                  <Input id="job-location-filter" placeholder="Location..." value={jobLocationFilter} onChange={e => setJobLocationFilter(e.target.value)} className="pl-9" />
                </div>
                {(member?.verification_level ?? 0) >= 2 ? (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="gradient-hero text-primary-foreground shrink-0"><Plus className="w-4 h-4 mr-1" />Post Job</Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Post a Job</DialogTitle>
                      <DialogDescription>Create a comprehensive job listing for community members.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="sm:col-span-2"><Label>Job Title *</Label><Input value={job.title} onChange={e => setJob({...job, title: e.target.value})} maxLength={200} /></div>
                      <div className="sm:col-span-2"><Label>Description</Label><Textarea value={job.description} onChange={e => setJob({...job, description: e.target.value})} maxLength={5000} rows={4} /></div>
                      <div><Label>Employment Type</Label>
                        <Select value={job.employment_type} onValueChange={v => setJob({...job, employment_type: v})}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{EMPLOYMENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div><Label>Positions Available</Label><Input type="number" value={job.positions_available} onChange={e => setJob({...job, positions_available: e.target.value})} min={1} /></div>
                      <div><Label>Salary Min</Label><Input type="number" value={job.salary_min} onChange={e => setJob({...job, salary_min: e.target.value})} placeholder="e.g. 300000" /></div>
                      <div><Label>Salary Max</Label><Input type="number" value={job.salary_max} onChange={e => setJob({...job, salary_max: e.target.value})} /></div>
                      <div><Label>Currency</Label>
                        <Select value={job.salary_currency} onValueChange={v => setJob({...job, salary_currency: v})}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{["INR", "USD", "GBP", "KES", "AED"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div><Label>Period</Label>
                        <Select value={job.salary_period} onValueChange={v => setJob({...job, salary_period: v})}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{SALARY_PERIODS.map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div><Label>Experience Min (years)</Label><Input type="number" value={job.experience_min} onChange={e => setJob({...job, experience_min: e.target.value})} /></div>
                      <div><Label>Experience Max (years)</Label><Input type="number" value={job.experience_max} onChange={e => setJob({...job, experience_max: e.target.value})} /></div>
                      <div><Label>Education Required</Label><Input value={job.education_required} onChange={e => setJob({...job, education_required: e.target.value})} placeholder="e.g. B.Com, MBA" /></div>
                      <div><Label>Location</Label><Input value={job.location} onChange={e => setJob({...job, location: e.target.value})} /></div>
                      <div><Label>Country</Label>
                        <Select value={job.country_id} onValueChange={v => setJob({...job, country_id: v, state_id: "", city_id: ""})}>
                          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>{countries?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div><Label>State</Label>
                        <Select value={job.state_id} onValueChange={v => setJob({...job, state_id: v, city_id: ""})} disabled={!job.country_id}>
                          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>{jobStates?.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div><Label>City</Label>
                        <Select value={job.city_id} onValueChange={v => setJob({...job, city_id: v})} disabled={!job.state_id}>
                          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>{jobCities?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={job.remote} onChange={e => setJob({...job, remote: e.target.checked})} className="rounded" />Remote allowed</label>
                      <div className="sm:col-span-2"><Label>Required Skills (comma-separated)</Label><Input value={job.skills_required} onChange={e => setJob({...job, skills_required: e.target.value})} placeholder="React, Accounting, Sales" /></div>
                      <div className="sm:col-span-2"><Label>Benefits (comma-separated)</Label><Input value={job.benefits} onChange={e => setJob({...job, benefits: e.target.value})} placeholder="Health insurance, PF, Flexible hours" /></div>
                      <div><Label>Contact Email</Label><Input type="email" value={job.contact_email} onChange={e => setJob({...job, contact_email: e.target.value})} /></div>
                      <div><Label>Contact Phone</Label><Input value={job.contact_phone} onChange={e => setJob({...job, contact_phone: e.target.value})} /></div>
                      <div className="sm:col-span-2"><Label>Application URL</Label><Input value={job.application_url} onChange={e => setJob({...job, application_url: e.target.value})} placeholder="https://..." /></div>
                      <div className="sm:col-span-2">
                        <Button onClick={() => createJob.mutate()} disabled={!job.title.trim() || createJob.isPending} className="w-full gradient-warm text-primary-foreground">Post Job</Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                ) : (
                  <L2GateButton featureName="Post Job" />
                )}
              </div>

              {!jobs?.length && <div className="text-center py-16"><Briefcase className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" /><p className="text-muted-foreground">No open jobs</p></div>}
              <div className="space-y-4">
                {jobs?.map((j) => {
                  const applied = myApplications?.some(a => a.job_id === j.id);
                  const loc = locationStr(j);
                  const salaryStr = j.salary_min || j.salary_max
                    ? `${j.salary_currency ?? "INR"} ${j.salary_min ? Number(j.salary_min).toLocaleString() : ""}${j.salary_min && j.salary_max ? " - " : ""}${j.salary_max ? Number(j.salary_max).toLocaleString() : ""} / ${j.salary_period ?? "annual"}`
                    : null;
                  return (
                    <Card key={j.id} className="shadow-card hover:shadow-elevated transition-all overflow-hidden group">
                      <div className="flex items-stretch">
                        <div className="w-1.5 gradient-jewel shrink-0" />
                        <CardContent className="p-5 flex-1">
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-display font-bold group-hover:text-primary transition-colors">{j.title}</h3>
                                <Badge variant="outline" className="text-xs capitalize">{(j.employment_type ?? "full_time").replace("_", " ")}</Badge>
                                {j.positions_available && j.positions_available > 1 && <Badge variant="secondary" className="text-xs">{j.positions_available} positions</Badge>}
                              </div>
                              {(j.businesses as { name: string } | null)?.name && <p className="text-sm text-muted-foreground">{(j.businesses as { name: string } | null)?.name}</p>}
                              {j.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{j.description}</p>}
                              <div className="flex flex-wrap gap-2 mt-2 text-xs text-muted-foreground">
                                {(j.location || loc) && <span className="flex items-center gap-1 bg-muted/50 px-2 py-1 rounded-full"><MapPin className="w-3 h-3" />{j.location || loc}</span>}
                                {j.remote && <Badge variant="outline" className="text-xs">🏠 Remote</Badge>}
                                {salaryStr && <span className="flex items-center gap-1 bg-muted/50 px-2 py-1 rounded-full"><DollarSign className="w-3 h-3" />{salaryStr}</span>}
                                {(j.experience_min || j.experience_max) && <span className="flex items-center gap-1 bg-muted/50 px-2 py-1 rounded-full"><Clock className="w-3 h-3" />{j.experience_min ?? 0}-{j.experience_max ?? "∞"} yrs</span>}
                                {j.education_required && <span className="flex items-center gap-1 bg-muted/50 px-2 py-1 rounded-full"><GraduationCap className="w-3 h-3" />{j.education_required}</span>}
                              </div>
                              {(j.skills_required as string[])?.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {(j.skills_required as string[]).map(s => <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>)}
                                </div>
                              )}
                              {(j.benefits as string[])?.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {(j.benefits as string[]).map(b => <span key={b} className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">✓ {b}</span>)}
                                </div>
                              )}
                            </div>
                            <div className="shrink-0 flex flex-col gap-2 items-end">
                              <ReportDialog entityType="job" entityId={j.id} entityName={j.title} variant="icon" />
                              {applied ? (
                                <Badge className="bg-emerald-500/20 text-emerald-700 h-9 px-4"><CheckCircle className="w-3.5 h-3.5 mr-1" />Applied</Badge>
                              ) : (
                                <Button size="sm" className="gradient-warm text-primary-foreground h-9" onClick={() => applyJob.mutate(j.id)}>Apply Now</Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppLayout>
  );
}
