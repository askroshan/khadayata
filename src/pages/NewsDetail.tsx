import { useParams, Link, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Clock, User, MapPin, Globe, Eye, Star, Share2, Copy, BookOpen, Video } from "lucide-react";
import { format } from "date-fns";
import { ReportDialog } from "@/components/ReportDialog";
import SEOMeta from "@/components/SEOMeta";
import { VideoEmbed } from "@/components/VideoEmbed";

function estimateReadTime(text: string): number {
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

export default function NewsDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: article, isLoading } = useQuery({
    queryKey: ["news-article", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_news")
        .select("*, chapters(name), countries(name), states(name), cities(name)")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!user,
  });

  const incrementViews = useMutation({
    mutationFn: async () => {
      if (!article) return;
      await supabase
        .from("content_news")
        .update({ views_count: (article.views_count ?? 0) + 1 })
        .eq("id", article.id);
    },
  });

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({ title: "Link copied to clipboard" });
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(`${article?.title} — ${window.location.href}`);
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  if (loading || isLoading) return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="animate-pulse text-muted-foreground">Loading...</div>
    </div>
  );
  if (!user) return <Navigate to="/auth" replace />;
  if (!article) return (
    <AppLayout title="Article Not Found">
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
        <BookOpen className="w-12 h-12 text-muted-foreground/30 mb-4" />
        <h1 className="text-2xl font-display font-bold">Article not found</h1>
        <Link to="/news"><Button variant="outline" className="mt-4"><ArrowLeft className="w-4 h-4 mr-2" />Back to News</Button></Link>
      </div>
    </AppLayout>
  );

  const readTime = article.read_time_minutes ?? (article.body ? estimateReadTime(article.body) : 1);
  const locationParts = [
    (article.cities as { name: string } | null)?.name,
    (article.states as { name: string } | null)?.name,
    (article.countries as { name: string } | null)?.name,
  ].filter(Boolean);

  const TYPE_COLORS: Record<string, string> = {
    breaking: "bg-destructive text-destructive-foreground",
    obituary: "bg-foreground/80 text-background",
    article: "bg-primary/10 text-primary",
  };

  return (
    <AppLayout title={article.title}>
      <SEOMeta
        title={article.title}
        description={article.summary ?? article.title}
        keywords={[article.category, article.article_type, "Khadayata news", "community news"].filter(Boolean).join(", ")}
        image={article.cover_image_url ?? undefined}
        url={"/news/" + article.id}
        type="article"
        publishedAt={article.published_at ?? undefined}
        modifiedAt={article.updated_at ?? undefined}
        authorName={article.author_name ?? undefined}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "News", url: "/news" },
          { name: article.title, url: "/news/" + article.id },
        ]}
      />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <Link to="/news" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to News
        </Link>

        {article.cover_image_url && (
          <div className="rounded-xl overflow-hidden aspect-video">
            <img
              src={article.cover_image_url}
              alt={article.image_alt ?? article.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {article.video_url && (
          <div className="space-y-2">
            {article.video_title && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Video className="w-4 h-4" />
                <span className="font-medium">{article.video_title}</span>
              </div>
            )}
            <VideoEmbed url={article.video_url} title={article.video_title ?? article.title} className="shadow-lg" />
          </div>
        )}

        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            {article.article_type && article.article_type !== "article" && (
              <Badge className={`${TYPE_COLORS[article.article_type] ?? ""} text-xs uppercase tracking-wide`}>
                {article.article_type === "breaking" ? "Breaking News" : article.article_type === "obituary" ? "Shok Sandesh" : article.article_type}
              </Badge>
            )}
            {article.featured && (
              <Badge className="bg-gold/20 text-gold-foreground text-xs" aria-label="Featured article">
                <Star className="w-3 h-3 mr-0.5" aria-hidden="true" />Featured
              </Badge>
            )}
            {article.category && <Badge variant="outline" className="text-xs">{article.category}</Badge>}
          </div>

          <h1 className="text-2xl sm:text-3xl font-display font-bold leading-snug">{article.title}</h1>

          {article.summary && (
            <p className="text-base text-muted-foreground leading-relaxed">{article.summary}</p>
          )}

          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap pt-1">
            {article.author_name && (
              <span className="flex items-center gap-1.5 font-medium text-foreground/70">
                <User className="w-3.5 h-3.5" />{article.author_name}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {article.published_at ? format(new Date(article.published_at), "d MMM yyyy") : format(new Date(article.created_at), "d MMM yyyy")}
            </span>
            <span className="flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5" />{readTime} min read
            </span>
            {(article.chapters as { name: string } | null)?.name && (
              <span>{(article.chapters as { name: string } | null)?.name}</span>
            )}
            {locationParts.length > 0 && (
              <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{locationParts.join(", ")}</span>
            )}
            {article.views_count > 0 && (
              <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" />{article.views_count} views</span>
            )}
            {article.source_url && (
              <a href={article.source_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                <Globe className="w-3.5 h-3.5" />Source
              </a>
            )}
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Button size="sm" variant="outline" onClick={handleCopyLink} className="gap-1.5">
              <Copy className="w-3.5 h-3.5" />Copy Link
            </Button>
            <Button size="sm" variant="outline" onClick={handleWhatsAppShare} className="gap-1.5 text-emerald-700 border-emerald-200 hover:bg-emerald-50">
              <Share2 className="w-3.5 h-3.5" />Share on WhatsApp
            </Button>
            <ReportDialog entityType="news" entityId={article.id} entityName={article.title} variant="icon" />
          </div>
        </div>

        <div className="border-t border-border" />

        {article.body ? (
          <div className="prose prose-sm max-w-none text-foreground/90 leading-relaxed whitespace-pre-wrap">
            {article.body}
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-8">No article body available.</p>
        )}

        {article.tags && (article.tags as string[]).length > 0 && (
          <div className="pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">Tags</p>
            <div className="flex flex-wrap gap-1.5">
              {(article.tags as string[]).map(tag => (
                <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
              ))}
            </div>
          </div>
        )}

        {article.article_type === "obituary" && (
          <Card className="border-foreground/20 bg-foreground/5">
            <CardContent className="p-5 text-center space-y-2">
              <p className="text-2xl">🕯️</p>
              <p className="text-sm text-muted-foreground italic">
                May their soul rest in eternal peace.
              </p>
              <p className="text-xs text-muted-foreground">
                To leave a condolence message or share memories, please contact the chapter office.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
