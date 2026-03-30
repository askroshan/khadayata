import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useMember } from "@/hooks/useMember";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Users, MapPin, Plus, CreditCard as Edit, Circle as XCircle, Copy, TrendingUp, ChartBar as BarChart3, Eye, Check } from "lucide-react";
import { format } from "date-fns";
import { useCountries, useStates, useCities, useHasStates, useCitiesByCountry, useChapters } from "@/hooks/useMember";

const EVENT_CATEGORIES = ["Cultural", "Religious", "Social", "Sports", "Educational", "Business", "Charity", "Youth", "Senior", "Samooha Bhojan", "Satsang", "Mahotsav", "Other"];
const EVENT_TYPES = [
  { value: "in_person", label: "In Person" },
  { value: "virtual", label: "Virtual" },
  { value: "hybrid", label: "Hybrid" },
];

interface EventsTabProps {
  myChapterId: string | null;
}

const EMPTY_EVENT = {
  name: "", description: "", venue: "", virtual_url: "", starts_at: "", ends_at: "",
  consent_required: false, category: "", event_type: "in_person",
  max_capacity: "", fee_amount: "", fee_currency: "INR",
  contact_email: "", contact_phone: "", organizer_name: "",
  address_line1: "", registration_deadline: "", tags: "",
  country_id: "", state_id: "", city_id: "", cover_image_url: "", chapter_id: "",
};

export default function EventsTab({ myChapterId }: EventsTabProps) {
  const { user } = useAuth();
  const { member } = useMember();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", description: "", venue: "", starts_at: "", ends_at: "", status: "published" });
  const [evt, setEvt] = useState({ ...EMPTY_EVENT });
  const [search, setSearch] = useState("");
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const { data: countries } = useCountries();
  const { data: chapters } = useChapters();
  const { data: evtHasStates } = useHasStates(evt.country_id || undefined);
  const { data: evtStates } = useStates(evt.country_id && evtHasStates ? evt.country_id : undefined);
  const { data: evtCitiesByState } = useCities(evt.state_id || undefined);
  const { data: evtCitiesByCountry } = useCitiesByCountry(evt.country_id && evtHasStates === false ? evt.country_id : undefined);
  const evtCities = evtHasStates ? evtCitiesByState : evtCitiesByCountry;

  const { data: events, isLoading } = useQuery({
    queryKey: ["admin-events", myChapterId, search],
    queryFn: async () => {
      let q = supabase
        .from("events")
        .select("*, chapters(name), event_rsvps(id, member_id, status)")
        .order("starts_at", { ascending: false })
        .limit(100);
      if (myChapterId) q = q.eq("chapter_id", myChapterId);
      if (search.trim()) q = q.ilike("name", `%${search}%`);
      const { data } = await q;
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: rsvpList } = useQuery({
    queryKey: ["admin-event-rsvps", selectedEventId],
    queryFn: async () => {
      if (!selectedEventId) return [];
      const { data } = await supabase
        .from("event_rsvps")
        .select("id, status, created_at, members(first_name, last_name, global_id, chapters(name))")
        .eq("event_id", selectedEventId)
        .order("created_at");
      return data ?? [];
    },
    enabled: !!selectedEventId,
  });

  const createEvent = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("events").insert({
        name: evt.name.trim(), description: evt.description.trim() || null,
        venue: evt.venue.trim() || null, virtual_url: evt.virtual_url.trim() || null,
        starts_at: evt.starts_at, ends_at: evt.ends_at,
        consent_required: evt.consent_required, status: "published", created_by: user!.id,
        chapter_id: evt.chapter_id || member?.chapter_id,
        category: evt.category || null, event_type: evt.event_type || null,
        max_capacity: evt.max_capacity ? Number(evt.max_capacity) : null,
        fee_amount: evt.fee_amount ? Number(evt.fee_amount) : null,
        fee_currency: evt.fee_currency || "INR",
        contact_email: evt.contact_email.trim() || null,
        contact_phone: evt.contact_phone.trim() || null,
        organizer_name: evt.organizer_name.trim() || null,
        address_line1: evt.address_line1.trim() || null,
        registration_deadline: evt.registration_deadline || null,
        tags: evt.tags.split(",").map(t => t.trim()).filter(Boolean),
        country_id: evt.country_id || null, state_id: evt.state_id || null, city_id: evt.city_id || null,
        cover_image_url: evt.cover_image_url.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Event created!" });
      setEvt({ ...EMPTY_EVENT });
      setCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin-events"] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateEvent = useMutation({
    mutationFn: async () => {
      if (!editId) return;
      const { error } = await supabase.from("events").update({
        name: editForm.name.trim(),
        description: editForm.description.trim() || null,
        venue: editForm.venue.trim() || null,
        starts_at: editForm.starts_at,
        ends_at: editForm.ends_at,
        status: editForm.status,
      }).eq("id", editId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Event updated" });
      setEditOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin-events"] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const duplicateEvent = useMutation({
    mutationFn: async (eventId: string) => {
      const event = events?.find(e => e.id === eventId);
      if (!event) throw new Error("Event not found");
      const { error } = await supabase.from("events").insert({
        name: `${event.name} (Copy)`,
        description: event.description,
        venue: event.venue,
        virtual_url: event.virtual_url,
        starts_at: event.starts_at,
        ends_at: event.ends_at,
        consent_required: event.consent_required,
        status: "draft",
        created_by: user!.id,
        chapter_id: event.chapter_id,
        category: event.category,
        event_type: event.event_type,
        max_capacity: event.max_capacity,
        fee_amount: event.fee_amount,
        fee_currency: event.fee_currency,
        contact_email: event.contact_email,
        contact_phone: event.contact_phone,
        organizer_name: event.organizer_name,
        address_line1: event.address_line1,
        tags: event.tags,
        country_id: event.country_id,
        state_id: event.state_id,
        city_id: event.city_id,
        cover_image_url: event.cover_image_url,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Event duplicated as Draft" });
      queryClient.invalidateQueries({ queryKey: ["admin-events"] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const cancelEvent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("events").update({ status: "cancelled" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Event cancelled" });
      queryClient.invalidateQueries({ queryKey: ["admin-events"] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const published = events?.filter(e => e.status === "published") ?? [];
  const draft = events?.filter(e => e.status === "draft") ?? [];
  const cancelled = events?.filter(e => e.status === "cancelled") ?? [];

  const statusColor = (s: string) => {
    if (s === "published") return "bg-emerald-100 text-emerald-700 border-0";
    if (s === "draft") return "bg-amber-100 text-amber-700 border-0";
    return "bg-muted text-muted-foreground border-0";
  };

  const EventCard = ({ event }: { event: typeof events extends (infer T)[] | undefined ? T : never }) => {
    const rsvpCount = (event.event_rsvps as { status: string }[])?.filter(r => r.status === "going").length ?? 0;
    return (
      <Card className="shadow-card">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-semibold text-sm truncate">{event.name}</h4>
                <Badge className={`text-[10px] ${statusColor(event.status)}`}>{event.status}</Badge>
                {event.category && <Badge variant="outline" className="text-[10px]">{event.category}</Badge>}
              </div>
              <div className="flex flex-wrap gap-2 mt-1.5 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{format(new Date(event.starts_at), "PPp")}</span>
                {event.venue && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{event.venue}</span>}
                <span className="flex items-center gap-1"><Users className="w-3 h-3" />{rsvpCount} RSVPs{event.max_capacity ? ` / ${event.max_capacity}` : ""}</span>
              </div>
            </div>
            <div className="flex gap-1 shrink-0 items-center">
              <Button
                size="icon" variant="ghost" className="h-7 w-7" aria-label="View RSVPs"
                onClick={() => setSelectedEventId(selectedEventId === event.id ? null : event.id)}
              >
                <Eye className="w-3.5 h-3.5" />
              </Button>
              <Button
                size="icon" variant="ghost" className="h-7 w-7" aria-label="Edit event"
                onClick={() => {
                  setEditId(event.id);
                  setEditForm({ name: event.name, description: event.description ?? "", venue: event.venue ?? "", starts_at: event.starts_at.slice(0, 16), ends_at: event.ends_at?.slice(0, 16) ?? "", status: event.status });
                  setEditOpen(true);
                }}
              >
                <Edit className="w-3.5 h-3.5" />
              </Button>
              <Button
                size="icon" variant="ghost" className="h-7 w-7" aria-label="Duplicate event"
                onClick={() => duplicateEvent.mutate(event.id)}
                disabled={duplicateEvent.isPending}
              >
                <Copy className="w-3.5 h-3.5" />
              </Button>
              {event.status === "published" && (
                <Button
                  size="icon" variant="ghost" className="h-7 w-7 text-amber-600" aria-label="Cancel event"
                  onClick={() => cancelEvent.mutate(event.id)}
                  disabled={cancelEvent.isPending}
                >
                  <XCircle className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>

          {/* RSVP list panel */}
          {selectedEventId === event.id && (
            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-xs font-semibold text-muted-foreground mb-2">RSVP List ({rsvpList?.length ?? 0})</p>
              {!rsvpList?.length ? (
                <p className="text-xs text-muted-foreground">No RSVPs yet</p>
              ) : (
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {rsvpList.map((r) => {
                    const m = r.members as { first_name: string; last_name: string; global_id: string | null; chapters: { name: string } | null } | null;
                    return (
                      <div key={r.id} className="flex items-center justify-between text-xs px-2 py-1 rounded bg-muted/40">
                        <span className="font-medium">{m?.first_name} {m?.last_name}</span>
                        <div className="flex items-center gap-2">
                          {m?.global_id && <span className="text-muted-foreground font-mono">{m.global_id}</span>}
                          <Badge className={`text-[9px] h-4 px-1.5 ${r.status === "going" ? "bg-emerald-100 text-emerald-700 border-0" : "bg-muted text-muted-foreground border-0"}`}>
                            {r.status === "going" && <Check className="w-2.5 h-2.5 mr-0.5" />}{r.status}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="shadow-card"><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-emerald-600">{published.length}</p><p className="text-xs text-muted-foreground mt-1">Published</p></CardContent></Card>
        <Card className="shadow-card"><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-amber-600">{draft.length}</p><p className="text-xs text-muted-foreground mt-1">Drafts</p></CardContent></Card>
        <Card className="shadow-card"><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-muted-foreground">{cancelled.length}</p><p className="text-xs text-muted-foreground mt-1">Cancelled</p></CardContent></Card>
        <Card className="shadow-card"><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-primary">
            {events?.reduce((acc, e) => acc + ((e.event_rsvps as { status: string }[])?.filter(r => r.status === "going").length ?? 0), 0) ?? 0}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Total RSVPs</p>
        </CardContent></Card>
      </div>

      {/* Toolbar */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 min-w-48">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search events..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Button className="gradient-hero text-primary-foreground shrink-0" onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-1" /> Create Event
        </Button>
      </div>

      {/* Events tabs */}
      <Tabs defaultValue="published">
        <TabsList>
          <TabsTrigger value="published">Published ({published.length})</TabsTrigger>
          <TabsTrigger value="draft">Drafts ({draft.length})</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled ({cancelled.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="published" className="mt-4 space-y-3">
          {published.length === 0 && <div className="text-center py-10 text-muted-foreground"><Calendar className="w-10 h-10 mx-auto mb-2 opacity-30" /><p className="text-sm">No published events</p></div>}
          {published.map(e => <EventCard key={e.id} event={e} />)}
        </TabsContent>
        <TabsContent value="draft" className="mt-4 space-y-3">
          {draft.length === 0 && <div className="text-center py-10 text-muted-foreground"><Calendar className="w-10 h-10 mx-auto mb-2 opacity-30" /><p className="text-sm">No draft events</p></div>}
          {draft.map(e => <EventCard key={e.id} event={e} />)}
        </TabsContent>
        <TabsContent value="cancelled" className="mt-4 space-y-3">
          {cancelled.length === 0 && <div className="text-center py-10 text-muted-foreground"><p className="text-sm text-muted-foreground">No cancelled events</p></div>}
          {cancelled.map(e => <EventCard key={e.id} event={e} />)}
        </TabsContent>
      </Tabs>

      {/* Create Event Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Event</DialogTitle>
            <DialogDescription>Add a new event for your chapter community.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2"><Label>Event Name *</Label><Input value={evt.name} onChange={e => setEvt({...evt, name: e.target.value})} maxLength={200} /></div>
            <div><Label>Category</Label>
              <Select value={evt.category || "__none__"} onValueChange={v => setEvt({...evt, category: v === "__none__" ? "" : v})}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {EVENT_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Event Type</Label>
              <Select value={evt.event_type} onValueChange={v => setEvt({...evt, event_type: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{EVENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2"><Label>Description</Label><Textarea value={evt.description} onChange={e => setEvt({...evt, description: e.target.value})} maxLength={5000} rows={3} /></div>
            <div><Label>Organizer Name</Label><Input value={evt.organizer_name} onChange={e => setEvt({...evt, organizer_name: e.target.value})} /></div>
            <div><Label>Max Capacity</Label><Input type="number" value={evt.max_capacity} onChange={e => setEvt({...evt, max_capacity: e.target.value})} placeholder="e.g. 200" /></div>
            <div><Label>Starts At *</Label><Input type="datetime-local" value={evt.starts_at} onChange={e => setEvt({...evt, starts_at: e.target.value})} /></div>
            <div><Label>Ends At *</Label><Input type="datetime-local" value={evt.ends_at} onChange={e => setEvt({...evt, ends_at: e.target.value})} /></div>
            <div><Label>Registration Deadline</Label><Input type="datetime-local" value={evt.registration_deadline} onChange={e => setEvt({...evt, registration_deadline: e.target.value})} /></div>
            <div><Label>Fee Amount</Label><Input type="number" value={evt.fee_amount} onChange={e => setEvt({...evt, fee_amount: e.target.value})} placeholder="0 = free" /></div>
            <div><Label>Fee Currency</Label>
              <Select value={evt.fee_currency} onValueChange={v => setEvt({...evt, fee_currency: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["INR", "USD", "GBP", "KES", "AED"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Venue</Label><Input value={evt.venue} onChange={e => setEvt({...evt, venue: e.target.value})} /></div>
            <div><Label>Address</Label><Input value={evt.address_line1} onChange={e => setEvt({...evt, address_line1: e.target.value})} /></div>
            <div><Label>Virtual URL</Label><Input value={evt.virtual_url} onChange={e => setEvt({...evt, virtual_url: e.target.value})} placeholder="https://zoom.us/..." /></div>
            <div><Label>Cover Image URL</Label><Input value={evt.cover_image_url} onChange={e => setEvt({...evt, cover_image_url: e.target.value})} placeholder="https://..." /></div>
            <div><Label>Country</Label>
              <Select value={evt.country_id || "__none__"} onValueChange={v => setEvt({...evt, country_id: v === "__none__" ? "" : v, state_id: "", city_id: ""})}>
                <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {countries?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {evtHasStates !== false && (
            <div><Label>State</Label>
              <Select value={evt.state_id || "__none__"} onValueChange={v => setEvt({...evt, state_id: v === "__none__" ? "" : v, city_id: ""})} disabled={!evt.country_id || !evtHasStates}>
                <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {evtStates?.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            )}
            <div><Label>Contact Email</Label><Input type="email" value={evt.contact_email} onChange={e => setEvt({...evt, contact_email: e.target.value})} /></div>
            <div><Label>Contact Phone</Label><Input value={evt.contact_phone} onChange={e => setEvt({...evt, contact_phone: e.target.value})} /></div>
            <div className="sm:col-span-2"><Label>Tags (comma-separated)</Label><Input value={evt.tags} onChange={e => setEvt({...evt, tags: e.target.value})} placeholder="diwali, cultural, family" /></div>
            <div className="sm:col-span-2"><Label>Chapter</Label>
              <Select value={evt.chapter_id || "__default__"} onValueChange={v => setEvt({...evt, chapter_id: v === "__default__" ? "" : v})}>
                <SelectTrigger><SelectValue placeholder="My chapter (default)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__default__">My chapter (default)</SelectItem>
                  {chapters?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={evt.consent_required} onChange={e => setEvt({...evt, consent_required: e.target.checked})} className="rounded" />Consent required for media</label>
            <div className="sm:col-span-2">
              <Button onClick={() => createEvent.mutate()} disabled={!evt.name.trim() || !evt.starts_at || !evt.ends_at || createEvent.isPending} className="w-full gradient-hero text-primary-foreground">Publish Event</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Event Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Event</DialogTitle>
            <DialogDescription>Update event details and status.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Event Name *</Label><Input value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} maxLength={200} /></div>
            <div><Label>Description</Label><Textarea value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} rows={3} maxLength={5000} /></div>
            <div><Label>Venue</Label><Input value={editForm.venue} onChange={e => setEditForm({...editForm, venue: e.target.value})} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Starts At</Label><Input type="datetime-local" value={editForm.starts_at} onChange={e => setEditForm({...editForm, starts_at: e.target.value})} /></div>
              <div><Label>Ends At</Label><Input type="datetime-local" value={editForm.ends_at} onChange={e => setEditForm({...editForm, ends_at: e.target.value})} /></div>
            </div>
            <div><Label>Status</Label>
              <Select value={editForm.status} onValueChange={v => setEditForm({...editForm, status: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => updateEvent.mutate()} disabled={!editForm.name.trim() || updateEvent.isPending} className="w-full gradient-hero text-primary-foreground">Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
