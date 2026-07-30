import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useMember, useCountries, useStates, useCities, useHasStates, useCitiesByCountry, useChapters } from "@/hooks/useMember";
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Calendar, MapPin, Users, Plus, Check, Sparkles, Globe, DollarSign, CreditCard as Edit, Trash2, Circle as XCircle, Mail as MailIcon } from "lucide-react";
import { format } from "date-fns";
import eventsHero from "@/assets/events-hero.jpg";
import { EventGallery } from "@/components/events/EventGallery";
import { ReportDialog } from "@/components/ReportDialog";
import { usePermissions, useRoles } from "@/hooks/useRoles";

const EVENT_CATEGORIES = ["Cultural", "Religious", "Social", "Sports", "Educational", "Business", "Charity", "Youth", "Senior", "Samooha Bhojan", "Satsang", "Mahotsav", "Other"];
const EVENT_TYPES = [
  { value: "in_person", label: "In Person" },
  { value: "virtual", label: "Virtual" },
  { value: "hybrid", label: "Hybrid" },
];

export default function Events() {
  const { user, loading } = useAuth();
  const { member } = useMember();
  const { canManageEvents, canDeleteEvents } = usePermissions();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editEventId, setEditEventId] = useState<string | null>(null);
  const [editEventOpen, setEditEventOpen] = useState(false);
  const [editEventForm, setEditEventForm] = useState({ name: "", description: "", venue: "", starts_at: "", ends_at: "", status: "published" });

  const [evt, setEvt] = useState({
    name: "", description: "", venue: "", virtual_url: "", starts_at: "", ends_at: "",
    consent_required: false, category: "", event_type: "in_person",
    max_capacity: "", fee_amount: "", fee_currency: "INR",
    contact_email: "", contact_phone: "", organizer_name: "",
    address_line1: "", registration_deadline: "", tags: "",
    country_id: "", state_id: "", city_id: "",
    cover_image_url: "", chapter_id: "",
  });

  const { data: countries } = useCountries();
  const { data: chapters } = useChapters();
  const { data: evtHasStates } = useHasStates(evt.country_id || undefined);
  const { data: evtStates } = useStates(evt.country_id && evtHasStates ? evt.country_id : undefined);
  const { data: evtCitiesByState } = useCities(evt.state_id || undefined);
  const { data: evtCitiesByCountry } = useCitiesByCountry(evt.country_id && evtHasStates === false ? evt.country_id : undefined);
  const evtCities = evtHasStates ? evtCitiesByState : evtCitiesByCountry;

  const { data: events } = useQuery({
    queryKey: ["events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*, chapters(name), event_rsvps(id, member_id, status), countries(name), states(name), cities(name)")
        .eq("status", "published")
        .order("starts_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
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
      setEvt({ name: "", description: "", venue: "", virtual_url: "", starts_at: "", ends_at: "", consent_required: false, category: "", event_type: "in_person", max_capacity: "", fee_amount: "", fee_currency: "INR", contact_email: "", contact_phone: "", organizer_name: "", address_line1: "", registration_deadline: "", tags: "", country_id: "", state_id: "", city_id: "", cover_image_url: "", chapter_id: "" });
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const rsvpMutation = useMutation({
    mutationFn: async ({ eventId, status }: { eventId: string; status: string }) => {
      if (!member) throw new Error("Not a member");
      const { error } = await supabase.from("event_rsvps").upsert({ event_id: eventId, member_id: member.id, status }, { onConflict: "event_id,member_id" });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      toast({ title: vars.status === "going" ? "You're attending this event!" : "RSVP cancelled." });
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteEvent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast({ title: "Event deleted" }); queryClient.invalidateQueries({ queryKey: ["events"] }); },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const cancelEvent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("events").update({ status: "cancelled" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast({ title: "Event cancelled" }); queryClient.invalidateQueries({ queryKey: ["events"] }); },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateEvent = useMutation({
    mutationFn: async () => {
      if (!editEventId) return;
      const { error } = await supabase.from("events").update({
        name: editEventForm.name.trim(),
        description: editEventForm.description.trim() || null,
        venue: editEventForm.venue.trim() || null,
        starts_at: editEventForm.starts_at,
        ends_at: editEventForm.ends_at,
        status: editEventForm.status,
      }).eq("id", editEventId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Event updated" });
      setEditEventOpen(false);
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  if (loading) return <div className="flex min-h-screen items-center justify-center"><div className="animate-pulse text-muted-foreground">Loading...</div></div>;
  if (!user) return <Navigate to="/auth" replace />;

  const upcoming = events?.filter((e) => new Date(e.starts_at) >= new Date()) ?? [];
  const past = events?.filter((e) => new Date(e.starts_at) < new Date()) ?? [];

  const locationStr = (item: Record<string, unknown>) => [
    (item.cities as { name: string } | null)?.name,
    (item.states as { name: string } | null)?.name,
    (item.countries as { name: string } | null)?.name,
  ].filter(Boolean).join(", ");

  return (
    <AppLayout title="Events">
      <Dialog open={editEventOpen} onOpenChange={setEditEventOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Event</DialogTitle>
            <DialogDescription>Update event details and status.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Event Name *</Label><Input value={editEventForm.name} onChange={e => setEditEventForm({...editEventForm, name: e.target.value})} maxLength={200} /></div>
            <div><Label>Description</Label><Textarea value={editEventForm.description} onChange={e => setEditEventForm({...editEventForm, description: e.target.value})} rows={3} maxLength={5000} /></div>
            <div><Label>Venue</Label><Input value={editEventForm.venue} onChange={e => setEditEventForm({...editEventForm, venue: e.target.value})} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Starts At</Label><Input type="datetime-local" value={editEventForm.starts_at} onChange={e => setEditEventForm({...editEventForm, starts_at: e.target.value})} /></div>
              <div><Label>Ends At</Label><Input type="datetime-local" value={editEventForm.ends_at} onChange={e => setEditEventForm({...editEventForm, ends_at: e.target.value})} /></div>
            </div>
            <div><Label>Status</Label>
              <Select value={editEventForm.status} onValueChange={v => setEditEventForm({...editEventForm, status: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => updateEvent.mutate()} disabled={!editEventForm.name.trim() || updateEvent.isPending} className="w-full gradient-hero text-primary-foreground">Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>
      <div className="space-y-6">
        <div className="relative h-48 overflow-hidden">
          <img src={eventsHero} alt="Community events" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-foreground/80 to-foreground/40" />
          <div className="absolute inset-0 flex items-end sm:items-center p-4 sm:p-8 pb-14 sm:pb-8">
            <div>
              <h1 className="text-xl sm:text-3xl font-display font-bold text-primary-foreground flex items-center gap-2">
                <Sparkles className="w-5 sm:w-7 h-5 sm:h-7 text-gold" /> Community Events
              </h1>
              <p className="text-primary-foreground/70 mt-1 text-sm sm:text-base">Celebrations, gatherings & cultural events</p>
            </div>
          </div>
          {canManageEvents && <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" className="absolute right-3 sm:right-6 bottom-3 sm:bottom-6 gradient-hero text-primary-foreground shadow-glow">
                <Plus className="w-4 h-4 mr-1" /> Create
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Event</DialogTitle>
                <DialogDescription>Add a comprehensive event with all details for community members.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2"><Label>Event Name *</Label><Input value={evt.name} onChange={e => setEvt({...evt, name: e.target.value})} maxLength={200} /></div>
                <div><Label>Category</Label>
                  <Select value={evt.category} onValueChange={v => setEvt({...evt, category: v})}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>{EVENT_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
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
                <div className="space-y-1"><Label>Starts At *</Label><Input type="datetime-local" value={evt.starts_at} onChange={e => setEvt({...evt, starts_at: e.target.value})} /></div>
                <div className="space-y-1"><Label>Ends At *</Label><Input type="datetime-local" value={evt.ends_at} onChange={e => setEvt({...evt, ends_at: e.target.value})} /></div>
                <div className="space-y-1"><Label>Registration Deadline</Label><Input type="datetime-local" value={evt.registration_deadline} onChange={e => setEvt({...evt, registration_deadline: e.target.value})} /></div>
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
                  <Select value={evt.country_id} onValueChange={v => setEvt({...evt, country_id: v, state_id: "", city_id: ""})}>
                    <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
                    <SelectContent>{countries?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                {evtHasStates !== false && (
                <div><Label>State</Label>
                  <Select value={evt.state_id} onValueChange={v => setEvt({...evt, state_id: v, city_id: ""})} disabled={!evt.country_id || !evtHasStates}>
                    <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                    <SelectContent>{evtStates?.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                )}
                <div><Label>City</Label>
                  <Select value={evt.city_id} onValueChange={v => setEvt({...evt, city_id: v})} disabled={evtHasStates ? !evt.state_id : !evt.country_id}>
                    <SelectTrigger><SelectValue placeholder="Select city" /></SelectTrigger>
                    <SelectContent>{evtCities?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Contact Email</Label><Input type="email" value={evt.contact_email} onChange={e => setEvt({...evt, contact_email: e.target.value})} /></div>
                <div><Label>Contact Phone</Label><Input value={evt.contact_phone} onChange={e => setEvt({...evt, contact_phone: e.target.value})} /></div>
                <div className="sm:col-span-2"><Label>Tags (comma-separated)</Label><Input value={evt.tags} onChange={e => setEvt({...evt, tags: e.target.value})} placeholder="diwali, cultural, family" /></div>
                <div className="sm:col-span-2"><Label>Chapter</Label>
                  <Select value={evt.chapter_id || "__default__"} onValueChange={v => setEvt({...evt, chapter_id: v === "__default__" ? "" : v})}>
                    <SelectTrigger><SelectValue placeholder="Use my chapter (default)" /></SelectTrigger>
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
          </Dialog>}
        </div>

        <div className="px-3 sm:px-6 pb-4 sm:pb-6 space-y-4 sm:space-y-6">
          <Tabs defaultValue="upcoming">
            <TabsList>
              <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
              <TabsTrigger value="past">Past ({past.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="upcoming" className="space-y-4 mt-4">
              {upcoming.length === 0 && <div className="text-center py-16"><Calendar className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" /><p className="text-muted-foreground">No upcoming events</p></div>}
              {upcoming.map((event) => {
                const myRsvp = (event.event_rsvps as { member_id: string; status: string }[])?.find((r) => r.member_id === member?.id);
                const rsvpCount = (event.event_rsvps as { status: string }[])?.filter((r) => r.status === "going").length ?? 0;
                const loc = locationStr(event);
                return (
                  <Card key={event.id} className="shadow-card hover:shadow-elevated transition-all overflow-hidden group">
                    <div className="flex items-stretch">
                      <div className="w-1.5 gradient-warm shrink-0" />
                      <CardContent className="p-5 flex-1">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-display font-bold text-lg group-hover:text-primary transition-colors">{event.name}</h3>
                              {event.category && <Badge variant="outline" className="text-xs">{event.category}</Badge>}
                              {event.event_type && event.event_type !== "in_person" && <Badge variant="secondary" className="text-xs capitalize">{event.event_type.replace("_", " ")}</Badge>}
                            </div>
                            {event.description && <p className="text-sm text-muted-foreground line-clamp-2">{event.description}</p>}
                            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1 bg-muted/50 px-2 py-1 rounded-full"><Calendar className="w-3.5 h-3.5" />{format(new Date(event.starts_at), "PPp")}</span>
                              {event.venue && <span className="flex items-center gap-1 bg-muted/50 px-2 py-1 rounded-full"><MapPin className="w-3.5 h-3.5" />{event.venue}</span>}
                              {loc && <span className="flex items-center gap-1 bg-muted/50 px-2 py-1 rounded-full"><Globe className="w-3 h-3" />{loc}</span>}
                              <span className="flex items-center gap-1 bg-muted/50 px-2 py-1 rounded-full"><Users className="w-3.5 h-3.5" />{rsvpCount} going{event.max_capacity ? ` / ${event.max_capacity}` : ""}</span>
                              {event.fee_amount && Number(event.fee_amount) > 0 && <span className="flex items-center gap-1 bg-muted/50 px-2 py-1 rounded-full"><DollarSign className="w-3 h-3" />{event.fee_currency} {Number(event.fee_amount).toLocaleString()}</span>}
                              {event.organizer_name && <span className="bg-muted/50 px-2 py-1 rounded-full">by {event.organizer_name}</span>}
                            </div>
                            {event.contact_email && <span className="text-xs flex items-center gap-1 text-muted-foreground"><MailIcon className="w-3 h-3" />{event.contact_email}</span>}
                            {(event.tags as string[])?.length > 0 && (
                              <div className="flex gap-1 flex-wrap">
                                {(event.tags as string[]).map(t => <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>)}
                              </div>
                            )}
                            {event.consent_required && <Badge variant="outline" className="text-xs">📸 Media consent required</Badge>}
                          </div>
                          <div className="flex gap-2 shrink-0 items-center flex-wrap justify-end">
                            {canManageEvents && (
                              <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Edit event" onClick={() => {
                                setEditEventId(event.id);
                                setEditEventForm({ name: event.name, description: event.description ?? "", venue: event.venue ?? "", starts_at: event.starts_at.slice(0, 16), ends_at: event.ends_at?.slice(0, 16) ?? "", status: event.status });
                                setEditEventOpen(true);
                              }}>
                                <Edit className="w-4 h-4" />
                              </Button>
                            )}
                            {canManageEvents && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="icon" variant="ghost" className="h-8 w-8 text-amber-600 hover:text-amber-700" aria-label="Cancel event">
                                    <XCircle className="w-4 h-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Cancel Event</AlertDialogTitle>
                                    <AlertDialogDescription>Mark "{event.name}" as cancelled? Members will see it as cancelled.</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Back</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => cancelEvent.mutate(event.id)} className="bg-amber-600 text-white hover:bg-amber-700">Cancel Event</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                            {canDeleteEvents && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" aria-label="Delete event">
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Event</AlertDialogTitle>
                                    <AlertDialogDescription>Permanently delete "{event.name}"? This cannot be undone.</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => deleteEvent.mutate(event.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                            <ReportDialog entityType="event" entityId={event.id} entityName={event.name} variant="icon" />
                            {myRsvp?.status === "going" ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-9 text-success border-success/40 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/40 transition-colors"
                                onClick={() => rsvpMutation.mutate({ eventId: event.id, status: "not_going" })}
                                disabled={rsvpMutation.isPending}
                              >
                                <Check className="w-3.5 h-3.5 mr-1" />Going · Cancel
                              </Button>
                            ) : (
                              <Button size="sm" className="gradient-warm text-primary-foreground h-9" onClick={() => rsvpMutation.mutate({ eventId: event.id, status: "going" })} disabled={rsvpMutation.isPending}>RSVP Now</Button>
                            )}
                          </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-border">
                          <EventGallery eventId={event.id} eventName={event.name} />
                        </div>
                      </CardContent>
                    </div>
                  </Card>
                );
              })}
            </TabsContent>
            <TabsContent value="past" className="space-y-4 mt-4">
              {past.length === 0 && <p className="text-muted-foreground text-center py-8">No past events</p>}
              {past.map((event) => (
                <Card key={event.id} className="shadow-card">
                  <CardContent className="p-5">
                    <h3 className="font-display font-semibold">{event.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{format(new Date(event.starts_at), "PPp")} • {event.venue}</p>
                    <div className="mt-3 pt-3 border-t border-border">
                      <EventGallery eventId={event.id} eventName={event.name} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppLayout>
  );
}
