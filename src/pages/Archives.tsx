import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppLayout from "@/components/AppLayout";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Search, BookOpen, FileText, Library, Mic, Upload, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { HeritageTagging } from "@/components/heritage/HeritageTagging";
import archivesHero from "@/assets/archives-hero.jpg";
import { usePermissions } from "@/hooks/useRoles";
import { useToast } from "@/hooks/use-toast";

export default function Archives() {
  const { user, loading } = useAuth();
  const { canManageOralHistories } = usePermissions();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [issueForm, setIssueForm] = useState({ title: "", volume: "", issue_date: "", pdf_url: "" });

  const createMagazine = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("magazine_issues").insert({
        title: issueForm.title.trim(),
        volume: issueForm.volume ? Number(issueForm.volume) : null,
        issue_date: issueForm.issue_date || null,
        pdf_url: issueForm.pdf_url.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Issue uploaded!" });
      setIssueForm({ title: "", volume: "", issue_date: "", pdf_url: "" });
      queryClient.invalidateQueries({ queryKey: ["magazines"] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const { data: magazines, isLoading: magazinesLoading, isError: magazinesError, refetch: refetchMagazines } = useQuery({
    queryKey: ["magazines", search],
    queryFn: async () => {
      let q = supabase.from("magazine_issues").select("*").order("issue_date", { ascending: false });
      if (search.trim()) q = q.ilike("title", `%${search}%`);
      const { data, error } = await q.limit(50);
      if (error) throw error;
      return data ?? [];
    },
    retry: 1,
    staleTime: 60_000,
  });

  const { data: bookPages, isLoading: bookPagesLoading, isError: bookPagesError, refetch: refetchBookPages } = useQuery({
    queryKey: ["book-pages", search],
    queryFn: async () => {
      let q = supabase.from("book_pages").select("*").order("page_number");
      if (search.trim()) q = q.ilike("ocr_text", `%${search}%`);
      const { data, error } = await q.limit(50);
      if (error) throw error;
      return data ?? [];
    },
    retry: 1,
    staleTime: 60_000,
  });

  if (loading) return <div className="flex min-h-screen items-center justify-center"><div className="animate-pulse text-muted-foreground">Loading...</div></div>;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <AppLayout title="Heritage Archives">
      <div className="space-y-6">
        <div className="relative h-56 overflow-hidden">
          <img src={archivesHero} alt="Heritage archives" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-foreground/90 to-foreground/50" />
          <div className="absolute inset-0 flex items-center p-4 sm:p-8">
            <div>
              <h1 className="text-xl sm:text-3xl font-display font-bold text-primary-foreground flex items-center gap-2">
                 <Library className="w-5 sm:w-7 h-5 sm:h-7 text-gold" /> Heritage Archives
               </h1>
               <p className="text-primary-foreground/70 mt-1 max-w-md text-sm sm:text-base">Preserving our history. Khadayata Jyoti magazines, community records, and oral histories.</p>
               <Link to="/oral-history" className="inline-flex items-center gap-1 mt-2 text-xs text-primary-foreground/80 hover:text-primary-foreground transition-colors">
                 <Mic className="w-3.5 h-3.5" /> Oral History Project →
               </Link>
            </div>
          </div>
        </div>

        <div className="px-3 sm:px-6 pb-4 sm:pb-6 space-y-4 sm:space-y-6">
          <div role="search" aria-label="Search heritage archives" className="relative">
            <label htmlFor="archives-search" className="sr-only">Search archives</label>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" aria-hidden="true" />
            <Input id="archives-search" placeholder="Search archives..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-11 h-12 text-base" maxLength={200} />
          </div>

          <Tabs defaultValue="magazines">
            <TabsList>
              <TabsTrigger value="magazines">Khadayata Jyoti ({magazines?.length ?? 0})</TabsTrigger>
              <TabsTrigger value="books">History Book ({bookPages?.length ?? 0})</TabsTrigger>
            </TabsList>

            <TabsContent value="magazines" className="space-y-4 mt-4">
              {canManageOralHistories && (
                <div className="flex justify-end">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button className="gradient-warm text-primary-foreground"><Upload className="w-4 h-4 mr-1" />Upload Issue</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Upload Magazine Issue</DialogTitle>
                        <DialogDescription>Add a new Khadayata Jyoti magazine issue to the archives.</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-3">
                        <div><Label>Title *</Label><Input value={issueForm.title} onChange={e => setIssueForm({...issueForm, title: e.target.value})} maxLength={200} placeholder="e.g. Khadayata Jyoti — Jan 2024" /></div>
                        <div className="grid grid-cols-2 gap-3">
                          <div><Label>Volume</Label><Input type="number" value={issueForm.volume} onChange={e => setIssueForm({...issueForm, volume: e.target.value})} placeholder="e.g. 12" /></div>
                          <div><Label>Issue Date</Label><Input type="date" value={issueForm.issue_date} onChange={e => setIssueForm({...issueForm, issue_date: e.target.value})} /></div>
                        </div>
                        <div><Label>PDF URL</Label><Input value={issueForm.pdf_url} onChange={e => setIssueForm({...issueForm, pdf_url: e.target.value})} placeholder="https://..." /></div>
                        <Button onClick={() => createMagazine.mutate()} disabled={!issueForm.title.trim() || createMagazine.isPending} className="w-full gradient-hero text-primary-foreground">
                          <Upload className="w-4 h-4 mr-1" />Upload Issue
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              )}

              {magazinesLoading && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="animate-pulse rounded-xl border border-border h-40 bg-muted/30" />
                  ))}
                </div>
              )}

              {magazinesError && !magazinesLoading && (
                <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive flex items-center justify-between gap-3">
                  <span>Unable to load magazines. Please try again.</span>
                  <Button size="sm" variant="outline" className="h-7 text-xs shrink-0" onClick={() => refetchMagazines()}>
                    <RefreshCw className="w-3 h-3 mr-1" /> Retry
                  </Button>
                </div>
              )}

              {!magazinesLoading && !magazinesError && magazines?.length === 0 && (
                <div className="text-center py-16">
                  <BookOpen className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">No magazine issues found</p>
                </div>
              )}

              {!magazinesLoading && !magazinesError && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {magazines?.map((m) => (
                    <Card key={m.id} className="shadow-card hover:shadow-elevated transition-all group overflow-hidden">
                      <div className="h-3 gradient-warm" />
                      <CardContent className="p-5">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg">
                          <BookOpen className="w-6 h-6 text-primary-foreground" />
                        </div>
                        <h3 className="font-display font-bold text-sm group-hover:text-primary transition-colors">{m.title}</h3>
                        <div className="flex gap-2 mt-2 text-xs text-muted-foreground">
                          {m.issue_date && <span>{new Date(m.issue_date).toLocaleDateString()}</span>}
                          {m.volume && <Badge variant="outline" className="text-xs">Vol. {m.volume}</Badge>}
                        </div>
                        {m.pdf_url && <a href={m.pdf_url} target="_blank" rel="noopener noreferrer" className="text-primary text-xs mt-3 inline-flex items-center gap-1 hover:underline font-medium"><FileText className="w-3 h-3" />Download PDF</a>}
                        <div className="mt-3 pt-3 border-t border-border">
                          <HeritageTagging entityType="magazine" entityId={m.id} />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="books" className="space-y-4 mt-4">
              {bookPagesLoading && (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="animate-pulse rounded-xl border border-border h-16 bg-muted/30" />
                  ))}
                </div>
              )}

              {bookPagesError && !bookPagesLoading && (
                <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive flex items-center justify-between gap-3">
                  <span>Unable to load history book. Please try again.</span>
                  <Button size="sm" variant="outline" className="h-7 text-xs shrink-0" onClick={() => refetchBookPages()}>
                    <RefreshCw className="w-3 h-3 mr-1" /> Retry
                  </Button>
                </div>
              )}

              {!bookPagesLoading && !bookPagesError && bookPages?.length === 0 && (
                <div className="text-center py-16">
                  <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">No book pages found</p>
                </div>
              )}

              {!bookPagesLoading && !bookPagesError && (
                <div className="space-y-3">
                  {bookPages?.map((p) => (
                    <Card key={p.id} className="shadow-card hover:shadow-elevated transition-all">
                      <CardContent className="p-4 flex items-start gap-4">
                        <div className="w-10 h-10 rounded-lg gradient-jewel flex items-center justify-center text-primary-foreground text-xs font-bold shrink-0">{p.page_number}</div>
                        <div><p className="text-sm font-medium">Page {p.page_number}</p>{p.ocr_text && <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{p.ocr_text}</p>}</div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppLayout>
  );
}
