import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMember } from "@/hooks/useMember";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { FileText, Upload, Trash2, ExternalLink, Pencil, Check, X } from "lucide-react";

interface MatrimonialAdPdf {
  id: string;
  title: string;
  file_path: string;
  file_url: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

const BUCKET = "matrimonial-ad-pdfs";
const MAX_SIZE_BYTES = 100 * 1024 * 1024; // 100MB

export default function MatrimonialAdsTab() {
  const { member } = useMember();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [displayOrder, setDisplayOrder] = useState("0");
  const [file, setFile] = useState<File | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editOrder, setEditOrder] = useState("0");

  const { data: adPdfs = [], isLoading } = useQuery({
    queryKey: ["admin-matrimonial-ad-pdfs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matrimonial_ad_pdfs" as never)
        .select("*")
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as MatrimonialAdPdf[];
    },
  });

  const uploadAd = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Please select an A4 PDF file to upload.");
      if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
        throw new Error("Only PDF files (.pdf) are allowed.");
      }
      if (file.size > MAX_SIZE_BYTES) {
        throw new Error("PDF file size must be 100 MB or smaller.");
      }
      const cleanTitle = title.trim() || file.name.replace(/\.pdf$/i, "");
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const filePath = `${Date.now()}_${safeName}`;

      const { error: uploadErr } = await supabase.storage
        .from(BUCKET)
        .upload(filePath, file, { contentType: "application/pdf", upsert: false });
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
      const { error: dbErr } = await supabase.from("matrimonial_ad_pdfs" as never).insert({
        title: cleanTitle,
        file_path: filePath,
        file_url: urlData.publicUrl,
        display_order: Number(displayOrder) || 0,
        is_active: true,
        uploaded_by: member?.id ?? null,
      } as never);
      if (dbErr) throw dbErr;
    },
    onSuccess: () => {
      toast({ title: "Ad PDF uploaded", description: "It will be appended to the next monthly matrimonial PDFs." });
      setTitle("");
      setDisplayOrder("0");
      setFile(null);
      queryClient.invalidateQueries({ queryKey: ["admin-matrimonial-ad-pdfs"] });
    },
    onError: (err: Error) => {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    },
  });

  const updateAd = useMutation({
    mutationFn: async (vars: { id: string; title?: string; display_order?: number; is_active?: boolean }) => {
      const { id, ...fields } = vars;
      const { error } = await supabase
        .from("matrimonial_ad_pdfs" as never)
        .update({ ...fields, updated_at: new Date().toISOString() } as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ["admin-matrimonial-ad-pdfs"] });
      toast({ title: "Ad PDF updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    },
  });

  const deleteAd = useMutation({
    mutationFn: async (ad: MatrimonialAdPdf) => {
      await supabase.storage.from(BUCKET).remove([ad.file_path]);
      const { error } = await supabase.from("matrimonial_ad_pdfs" as never).delete().eq("id", ad.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-matrimonial-ad-pdfs"] });
      toast({ title: "Ad PDF deleted" });
    },
    onError: (err: Error) => {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    },
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Matrimonial Monthly PDF Ad Pages (A4)
          </CardTitle>
          <CardDescription>
            Upload A4-sized PDF advertisement pages. Active PDFs are automatically pulled in display order and appended to the 4 monthly matrimonial PDFs (NRI Boys, NRI Girls, India Boys, India Girls) generated on the 1st of every month.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="md:col-span-2 space-y-1.5">
              <Label htmlFor="ad-pdf-title">Ad Title</Label>
              <Input
                id="ad-pdf-title"
                placeholder="e.g., Sponsor Full-Page A4 Ad"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ad-pdf-order">Display Order</Label>
              <Input
                id="ad-pdf-order"
                type="number"
                value={displayOrder}
                onChange={(e) => setDisplayOrder(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ad-pdf-file">A4 PDF File (max 100 MB)</Label>
              <Input
                id="ad-pdf-file"
                type="file"
                accept="application/pdf,.pdf"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>
          <Button onClick={() => uploadAd.mutate()} disabled={uploadAd.isPending || !file}>
            <Upload className="w-4 h-4 mr-2" />
            {uploadAd.isPending ? "Uploading..." : "Add A4 Ad PDF"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-display">
            Configured Ad Pages ({adPdfs.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Loading ad pages...</p>
          ) : adPdfs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No A4 ad PDFs uploaded yet.
            </p>
          ) : (
            <div className="space-y-2">
              {adPdfs.map((ad) => {
                const isEditing = editingId === ad.id;
                return (
                  <div
                    key={ad.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border border-border bg-muted/20"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Badge variant="outline" className="font-mono shrink-0">
                        #{ad.display_order}
                      </Badge>
                      {isEditing ? (
                        <div className="flex items-center gap-2 flex-1">
                          <Input
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="h-8 text-sm"
                          />
                          <Input
                            type="number"
                            value={editOrder}
                            onChange={(e) => setEditOrder(e.target.value)}
                            className="h-8 w-20 text-sm"
                          />
                        </div>
                      ) : (
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{ad.title}</p>
                          <a
                            href={ad.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                          >
                            Preview PDF <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex items-center gap-1.5">
                        <Switch
                          checked={ad.is_active}
                          onCheckedChange={(checked) =>
                            updateAd.mutate({ id: ad.id, is_active: checked })
                          }
                          aria-label={`Toggle ${ad.title} active`}
                        />
                        <span className="text-xs text-muted-foreground">
                          {ad.is_active ? "Active" : "Paused"}
                        </span>
                      </div>

                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 px-2"
                            onClick={() =>
                              updateAd.mutate({
                                id: ad.id,
                                title: editTitle.trim() || ad.title,
                                display_order: Number(editOrder) || 0,
                              })
                            }
                          >
                            <Check className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2"
                            onClick={() => setEditingId(null)}
                          >
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-2"
                          onClick={() => {
                            setEditingId(ad.id);
                            setEditTitle(ad.title);
                            setEditOrder(String(ad.display_order));
                          }}
                          aria-label={`Edit ${ad.title}`}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-2 text-destructive border-destructive/30"
                        onClick={() => deleteAd.mutate(ad)}
                        disabled={deleteAd.isPending}
                        aria-label={`Delete ${ad.title}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
