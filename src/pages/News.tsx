import { useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useMember, useCountries, useStates, useCities, useHasStates, useCitiesByCountry } from "@/hooks/useMember";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Newspaper, Plus, Clock, Eye, MapPin, User, Globe, Star, CreditCard as Edit, Trash2, BookOpen, Pin, Search } from "lucide-react";
import { format } from "date-fns";
import { ReportDialog } from "@/components/ReportDialog";
import { usePermissions } from "@/hooks/useRoles";

const NEWS_CATEGORIES = [
  "Announcements", "Community News", "Education", "Religion & Culture",
  "Events", "Obituaries", "Platform Updates",
  "Achievement", "Business", "Health", "Sports", "Technology", "Other"
];

const ARTICLE_TYPES = [
  { value: "article", label: "Article" },
  { value: "breaking", label: "Breaking News" },
  { value: "obituary", label: "Shok Sandesh (Obituary)" },
];

const SCOPE_OPTIONS = [
  { value: "chapter", label: "My Chapter only" },
  { value: "global", label: "All Chapters (Global)" },
];

const PIN_EXPIRY_OPTIONS = [
  { value: "24", label: "24 hours" },
  { value: "48", label: "48 hours" },
  { value: "72", label: "72 hours" },
  { value: "168", label: "7 days" },
];

function estimateReadTime(text: string): number {
  return Math.max(1, Math.round(text.trim().split(/\s+/).length / 200));
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  review: "bg-gold/20 text-gold-foreground",
  published: "bg-success/20 text-success",
  archived: "bg-muted text-muted-foreground",
};

const TYPE_BADGE: Record<string, { label: string; className: string }> = {
  breaking: { label: "Breaking", className: "bg-destructive text-destructive-foreground" },
  obituary: { label: "Shok Sandesh", className: "bg-foreground/80 text-background" },
};

export default function News() {
  const { user, loading } = useAuth();
  const { member } = useMember();
  const { canDeleteNews, canModerateNews, canPublishNews } = usePermissions();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("__all__");
  const [editArticleId, setEditArticleId] = useState<string | null>(null);
  const [editArticleOpen, setEditArticleOpen] = useState(false);
  const [editArticleForm, setEditArticleForm] = useState({
    title: "", summary: "", body: "", status: "published",
    article_type: "article", pinned: false, pinned_hours: "24",
  });
  const [article, setArticle] = useState({
    title: "", summary: "", body: "", tags: "",
    category: "", author_name: "", source_url: "",
    cover_image_url: "", image_alt: "", featured: false,
    country_id: "", state_id: "", city_id: "",
    article_type: "article", scope: "chapter",
    pinned: false, pinned_hours: "24",
  });

  const { data: countries } = useCountries();
  const { data: newsHasStates } = useHasStates(article.country_id || undefined);
  const { data: newsStates } = useStates(article.country_id && newsHasStates ? article.country_id : undefined);
  const { data: newsCitiesByState } = useCities(article.state_id || undefined);
  const { data: newsCitiesByCountry } = useCitiesByCountry(article.country_id && newsHasStates === false ? article.country_id : undefined);
  const newsCities = newsHasStates ? newsCitiesByState : newsCitiesByCountry;

  const { data: newsList } = useQuery({
    queryKey: ["news", search, categoryFilter],
    queryFn: async () => {
      let q = supabase
        .from("content_news")
        .select("*, chapters(name), countries(name), states(name), cities(name)")
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false });
      if (search.trim()) q = q.ilike("title", `%${search.trim()}%`);
      if (categoryFilter !== "__all__") q = q.eq("category", categoryFilter);
      const { data } = await q.limit(100);
      return data ?? [];
    },
    enabled: !!user,
  });

  const createNews = useMutation({
    mutationFn: async (asDraft: boolean) => {
      const pinnedUntil = article.pinned
        ? new Date(Date.now() + parseInt(article.pinned_hours) * 3600000).toISOString()
        : null;
      const { error } = await supabase.from("content_news").insert({
        title: article.title.trim(),
        summary: article.summary.trim() || null,
        body: article.body.trim() || null,
        tags: article.tags.split(",").map(t => t.trim()).filter(Boolean),
        category: article.category || null,
        author_name: article.author_name.trim() || null,
        source_url: article.source_url.trim() || null,
        cover_image_url: article.cover_image_url.trim() || null,
        image_alt: article.image_alt.trim() || null,
        featured: article.featured,
        article_type: article.article_type,
        scope: article.scope,
        pinned: article.pinned,
        pinned_until: pinnedUntil,
        country_id: article.country_id || null,
        state_id: article.state_id || null,
        city_id: article.city_id || null,
        status: asDraft ? "draft" : "published",
        published_at: asDraft ? null : new Date().toISOString(),
        created_by: user!.id,
        chapter_id: member?.chapter_id,
        read_time_minutes: article.body.trim() ? estimateReadTime(article.body) : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Article created!" });
      setArticle({
        title: "", summary: "", body: "", tags: "", category: "", author_name: "",
        source_url: "", cover_image_url: "", image_alt: "", featured: false,
        article_type: "article", scope: "chapter", pinned: false, pinned_hours: "24",
        country_id: "", state_id: "", city_id: "",
      });
      queryClient.invalidateQueries({ queryKey: ["news"] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteNews = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("content_news").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast({ title: "Article deleted" }); queryClient.invalidateQueries({ queryKey: ["news"] }); },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateNews = useMutation({
    mutationFn: async () => {
      if (!editArticleId) return;
      const pinnedUntil = editArticleForm.pinned
        ? new Date(Date.now() + parseInt(editArticleForm.pinned_hours) * 3600000).toISOString()
        : null;
      const { error } = await supabase.from("content_news").update({
        title: editArticleForm.title.trim(),
        summary: editArticleForm.summary.trim() || null,
        body: editArticleForm.body.trim() || null,
        status: editArticleForm.status,
        article_type: editArticleForm.article_type,
        pinned: editArticleForm.pinned,
        pinned_until: pinnedUntil,
        published_at: editArticleForm.status === "published" ? new Date().toISOString() : null,
      }).eq("id", editArticleId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Article updated" });
      setEditArticleOpen(false);
      queryClient.invalidateQueries({ queryKey: ["news"] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  if (loading) return <div className="flex min-h-screen items-center justify-center"><div className="animate-pulse text-muted-foreground">Loading...</div></div>;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <AppLayout title="News">
      <Dialog open={editArticleOpen} onOpenChange={setEditArticleOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Article</DialogTitle>
            <DialogDescription>Update the article content and publication settings.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Title *</Label><Input value={editArticleForm.title} onChange={e => setEditArticleForm({...editArticleForm, title: e.target.value})} maxLength={200} /></div>
            <div><Label>Summary</Label><Input value={editArticleForm.summary} onChange={e => setEditArticleForm({...editArticleForm, summary: e.target.value})} maxLength={500} /></div>
            <div><Label>Body</Label><Textarea value={editArticleForm.body} onChange={e => setEditArticleForm({...editArticleForm, body: e.target.value})} rows={6} maxLength={10000} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Article Type</Label>
                <Select value={editArticleForm.article_type} onValueChange={v => setEditArticleForm({...editArticleForm, article_type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ARTICLE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Status</Label>
                <Select value={editArticleForm.status} onValueChange={v => setEditArticleForm({...editArticleForm, status: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="review">Under Review</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40">
              <label className="flex items-center gap-2 text-sm cursor-pointer flex-1">
                <input type="checkbox" checked={editArticleForm.pinned} onChange={e => setEditArticleForm({...editArticleForm, pinned: e.target.checked})} className="rounded" />
                <Pin className="w-3.5 h-3.5 text-primary" />
                Pin as Breaking News
              </label>
              {editArticleForm.pinned && (
                <Select value={editArticleForm.pinned_hours} onValueChange={v => setEditArticleForm({...editArticleForm, pinned_hours: v})}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>{PIN_EXPIRY_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              )}
            </div>
            <Button onClick={() => updateNews.mutate()} disabled={!editArticleForm.title.trim() || updateNews.isPending} className="w-full gradient-hero text-primary-foreground">Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="p-4 sm:p-6 space-y-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-display font-bold">Community News</h1>
            <p className="text-sm text-muted-foreground">Chapter and global news articles</p>
          </div>
          {canPublishNews && (
            <Dialog>
              <DialogTrigger asChild>
                <Button className="gradient-hero text-primary-foreground"><Plus className="w-4 h-4 mr-1" /> Write Article</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>New Article</DialogTitle>
                  <DialogDescription>Create a news article with category, scope, and media.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2"><Label>Title *</Label><Input value={article.title} onChange={e => setArticle({...article, title: e.target.value})} maxLength={200} /></div>
                  <div><Label>Article Type</Label>
                    <Select value={article.article_type} onValueChange={v => setArticle({...article, article_type: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{ARTICLE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Category</Label>
                    <Select value={article.category || "__none__"} onValueChange={v => setArticle({...article, category: v === "__none__" ? "" : v})}>
                      <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">No category</SelectItem>
                        {NEWS_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Author Name</Label><Input value={article.author_name} onChange={e => setArticle({...article, author_name: e.target.value})} /></div>
                  <div><Label>Scope</Label>
                    <Select value={article.scope} onValueChange={v => setArticle({...article, scope: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{SCOPE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="sm:col-span-2"><Label>Summary (one line teaser)</Label><Input value={article.summary} onChange={e => setArticle({...article, summary: e.target.value})} maxLength={500} /></div>
                  <div className="sm:col-span-2"><Label>Full Article Body</Label><Textarea value={article.body} onChange={e => setArticle({...article, body: e.target.value})} rows={6} maxLength={10000} /></div>
                  <div><Label>Cover Image URL</Label><Input value={article.cover_image_url} onChange={e => setArticle({...article, cover_image_url: e.target.value})} placeholder="https://..." /></div>
                  <div><Label>Image Alt Text (WCAG)</Label><Input value={article.image_alt} onChange={e => setArticle({...article, image_alt: e.target.value})} placeholder="Describe the image" /></div>
                  <div><Label>Source URL</Label><Input value={article.source_url} onChange={e => setArticle({...article, source_url: e.target.value})} placeholder="https://..." /></div>
                  <div><Label>Country</Label>
                    <Select value={article.country_id || "__none__"} onValueChange={v => setArticle({...article, country_id: v === "__none__" ? "" : v, state_id: "", city_id: ""})}>
                      <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">No country</SelectItem>
                        {countries?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  {newsHasStates !== false && (
                  <div><Label>State</Label>
                    <Select value={article.state_id || "__none__"} onValueChange={v => setArticle({...article, state_id: v === "__none__" ? "" : v, city_id: ""})} disabled={!article.country_id || !newsHasStates}>
                      <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">No state</SelectItem>
                        {newsStates?.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  )}
                  <div><Label>Tags (comma-separated)</Label><Input value={article.tags} onChange={e => setArticle({...article, tags: e.target.value})} maxLength={200} /></div>
                  <div className="sm:col-span-2 flex items-center gap-3 p-3 rounded-lg bg-muted/40 flex-wrap">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={article.featured} onChange={e => setArticle({...article, featured: e.target.checked})} className="rounded" />
                      <Star className="w-3.5 h-3.5 text-gold-foreground" />Mark as Featured
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={article.pinned} onChange={e => setArticle({...article, pinned: e.target.checked})} className="rounded" />
                      <Pin className="w-3.5 h-3.5 text-primary" />Pin as Breaking News
                    </label>
                    {article.pinned && (
                      <Select value={article.pinned_hours} onValueChange={v => setArticle({...article, pinned_hours: v})}>
                        <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                        <SelectContent>{PIN_EXPIRY_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                      </Select>
                    )}
                  </div>
                  <div className="sm:col-span-2 flex gap-2">
                    <Button variant="outline" onClick={() => createNews.mutate(true)} disabled={!article.title.trim() || createNews.isPending}>Save as Draft</Button>
                    <Button onClick={() => createNews.mutate(false)} disabled={!article.title.trim() || createNews.isPending} className="gradient-hero text-primary-foreground flex-1">Publish</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search articles..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-48"><SelectValue placeholder="All Categories" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Categories</SelectItem>
              {NEWS_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {newsList?.length === 0 && (
            <div className="sm:col-span-2 lg:col-span-3 text-center py-16">
              <Newspaper className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No news articles found</p>
            </div>
          )}
          {newsList?.map((n) => {
            const readTime = (n as Record<string, unknown>).read_time_minutes as number | null
              ?? (n.body ? estimateReadTime(n.body) : 1);
            const typeMeta = TYPE_BADGE[(n as Record<string, unknown>).article_type as string];
            const isPinned = (n as Record<string, unknown>).pinned as boolean;

            return (
              <Card
                key={n.id}
                className={`shadow-card hover:shadow-elevated transition-all flex flex-col overflow-hidden group ${isPinned ? "ring-2 ring-destructive/40" : ""}`}
              >
                {n.cover_image_url && (
                  <Link to={`/news/${n.id}`} className="block">
                    <div className="h-36 overflow-hidden">
                      <img
                        src={n.cover_image_url}
                        alt={(n as Record<string, unknown>).image_alt as string ?? n.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  </Link>
                )}
                <CardContent className="p-4 flex flex-col flex-1 space-y-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {isPinned && (
                      <Badge className="bg-destructive/10 text-destructive text-[10px] px-1.5 py-0 h-4">
                        <Pin className="w-2.5 h-2.5 mr-0.5" aria-hidden="true" />Breaking
                      </Badge>
                    )}
                    {typeMeta && (
                      <Badge className={`${typeMeta.className} text-[10px] px-1.5 py-0 h-4`}>{typeMeta.label}</Badge>
                    )}
                    {n.status !== "published" && (
                      <Badge className={`${STATUS_COLORS[n.status] ?? ""} text-[10px] px-1.5 py-0 h-4 capitalize`}>{n.status}</Badge>
                    )}
                    {n.featured && (
                      <Badge className="bg-gold/20 text-gold-foreground text-[10px] px-1.5 py-0 h-4" aria-label="Featured article">
                        <Star className="w-2.5 h-2.5 mr-0.5" aria-hidden="true" />Featured
                      </Badge>
                    )}
                    {n.category && <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">{n.category}</Badge>}
                  </div>

                  <Link to={`/news/${n.id}`} className="flex-1">
                    <h3 className="font-display font-semibold text-sm leading-snug group-hover:text-primary transition-colors line-clamp-2">
                      {n.title}
                    </h3>
                    {n.summary && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{n.summary}</p>
                    )}
                  </Link>

                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground flex-wrap">
                    {n.author_name && <span className="flex items-center gap-0.5"><User className="w-3 h-3" />{n.author_name}</span>}
                    <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" />{format(new Date(n.created_at), "d MMM yy")}</span>
                    <span className="flex items-center gap-0.5"><BookOpen className="w-3 h-3" />{readTime}m</span>
                    {n.views_count > 0 && <span className="flex items-center gap-0.5"><Eye className="w-3 h-3" />{n.views_count}</span>}
                    {(n.chapters as { name: string } | null)?.name && (
                      <span className="text-[10px]">{(n.chapters as { name: string } | null)?.name}</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <Link to={`/news/${n.id}`}>
                      <Button size="sm" variant="ghost" className="h-7 text-xs px-2 text-primary">Read more →</Button>
                    </Link>
                    <div className="flex items-center gap-0.5">
                      {canModerateNews && (
                        <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Edit article" onClick={() => {
                          setEditArticleId(n.id);
                          setEditArticleForm({
                            title: n.title, summary: n.summary ?? "", body: n.body ?? "",
                            status: n.status,
                            article_type: ((n as Record<string, unknown>).article_type as string) ?? "article",
                            pinned: ((n as Record<string, unknown>).pinned as boolean) ?? false,
                            pinned_hours: "24",
                          });
                          setEditArticleOpen(true);
                        }}>
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      {canDeleteNews && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" aria-label="Delete article">
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Article</AlertDialogTitle>
                              <AlertDialogDescription>This will permanently delete "{n.title}".</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteNews.mutate(n.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                      <ReportDialog
                        entityType="news"
                        entityId={n.id}
                        entityName={n.title}
                        variant="icon"
                        className="h-7 w-7"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}
