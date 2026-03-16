import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMember } from "@/hooks/useMember";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Camera, Upload, X, Tag, Check, CircleAlert as AlertCircle } from "lucide-react";

interface EventGalleryProps {
  eventId: string;
  eventName: string;
}

export function EventGallery({ eventId, eventName }: EventGalleryProps) {
  const { member } = useMember();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [tagMemberSearch, setTagMemberSearch] = useState("");

  const { data: photos } = useQuery({
    queryKey: ["event-photos", eventId],
    queryFn: async () => {
      const { data } = await supabase
        .from("event_photos")
        .select("*, uploader:members!event_photos_uploaded_by_fkey(first_name, last_name), photo_tags(id, member_id, consent_status, tagged_member:members!photo_tags_member_id_fkey(first_name, last_name))")
        .eq("event_id", eventId)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!eventId,
  });

  const { data: searchResults } = useQuery({
    queryKey: ["member-search-tag", tagMemberSearch],
    queryFn: async () => {
      if (!tagMemberSearch.trim()) return [];
      const { data } = await supabase
        .from("members")
        .select("id, first_name, last_name")
        .or(`first_name.ilike.%${tagMemberSearch}%,last_name.ilike.%${tagMemberSearch}%`)
        .limit(5);
      return data ?? [];
    },
    enabled: tagMemberSearch.length >= 2,
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !member) return;

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${member.user_id}/${eventId}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("event-photos")
        .upload(path, file, { contentType: file.type });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("event-photos")
        .getPublicUrl(path);

      const { error: dbError } = await supabase.from("event_photos").insert({
        event_id: eventId,
        uploaded_by: member.id,
        url: publicUrl,
      });
      if (dbError) throw dbError;

      toast({ title: "Photo uploaded!" });
      queryClient.invalidateQueries({ queryKey: ["event-photos", eventId] });
    } catch (err) {
      toast({ title: "Upload failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const tagMember = useMutation({
    mutationFn: async ({ photoId, memberId }: { photoId: string; memberId: string }) => {
      if (!member) throw new Error("Not a member");
      const { error } = await supabase.from("photo_tags").insert({
        photo_id: photoId,
        member_id: memberId,
        tagged_by: member.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Member tagged!" });
      setTagMemberSearch("");
      queryClient.invalidateQueries({ queryKey: ["event-photos", eventId] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateTagConsent = useMutation({
    mutationFn: async ({ tagId, status }: { tagId: string; status: string }) => {
      const { error } = await supabase.from("photo_tags").update({ consent_status: status }).eq("id", tagId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event-photos", eventId] });
    },
  });

  const deletePhoto = useMutation({
    mutationFn: async (photoId: string) => {
      const { error } = await supabase.from("event_photos").delete().eq("id", photoId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Photo removed" });
      queryClient.invalidateQueries({ queryKey: ["event-photos", eventId] });
    },
  });

  const fileInputId = `gallery-upload-${eventId}`;

  if (!photos || photos.length === 0) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold flex items-center gap-1.5"><Camera className="w-4 h-4 text-primary" />Gallery</h4>
          <div>
            <input id={fileInputId} type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
            <Button size="sm" variant="outline" disabled={uploading} onClick={() => document.getElementById(fileInputId)?.click()}>
              <Upload className="w-3.5 h-3.5 mr-1" />{uploading ? "Uploading..." : "Add Photo"}
            </Button>
          </div>
        </div>
        <div className="text-center py-6 text-sm text-muted-foreground">
          <Camera className="w-8 h-8 mx-auto mb-2 opacity-30" />
          No photos yet. Be the first to share!
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold flex items-center gap-1.5"><Camera className="w-4 h-4 text-primary" />Gallery ({photos.length})</h4>
        <div>
          <input id={fileInputId} type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
          <Button size="sm" variant="outline" disabled={uploading} onClick={() => document.getElementById(fileInputId)?.click()}>
            <Upload className="w-3.5 h-3.5 mr-1" />{uploading ? "Uploading..." : "Add Photo"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {photos.map((photo) => (
          <Dialog key={photo.id}>
            <DialogTrigger asChild>
              <button className="relative aspect-square rounded-lg overflow-hidden group cursor-pointer border border-border hover:border-primary/50 transition-all">
                <img src={photo.url} alt="" className="w-full h-full object-cover" />
                {(photo.photo_tags as unknown[])?.length > 0 && (
                  <div className="absolute bottom-1 right-1 bg-foreground/70 rounded-full p-1">
                    <Tag className="w-3 h-3 text-primary-foreground" />
                  </div>
                )}
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-sm">Photo by {(photo.uploader as { first_name: string; last_name: string } | null)?.first_name}</DialogTitle>
              </DialogHeader>
              <img src={photo.url} alt="" className="w-full rounded-lg" />

              {/* Tags */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tagged Members</p>
                <div className="flex flex-wrap gap-1.5">
                  {(photo.photo_tags as { id: string; member_id: string; consent_status: string; tagged_member: { first_name: string; last_name: string } | null }[])?.map((tag) => (
                    <Badge key={tag.id} variant={tag.consent_status === "approved" ? "default" : "outline"} className="text-xs">
                      {tag.tagged_member?.first_name} {tag.tagged_member?.last_name}
                      {tag.consent_status === "pending" && <AlertCircle className="w-3 h-3 ml-1 text-warning" />}
                      {tag.member_id === member?.id && tag.consent_status === "pending" && (
                        <button onClick={() => updateTagConsent.mutate({ tagId: tag.id, status: "approved" })} className="ml-1">
                          <Check className="w-3 h-3 text-success" />
                        </button>
                      )}
                    </Badge>
                  ))}
                </div>

                {/* Tag someone */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Search member to tag..."
                    value={tagMemberSearch}
                    onChange={(e) => setTagMemberSearch(e.target.value)}
                    className="h-8 text-sm"
                    maxLength={100}
                  />
                </div>
                {searchResults && searchResults.length > 0 && (
                  <div className="border border-border rounded-lg divide-y divide-border">
                    {searchResults.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => tagMember.mutate({ photoId: photo.id, memberId: m.id })}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
                      >
                        {m.first_name} {m.last_name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Delete own photo */}
              {(photo.uploaded_by as string) === member?.id && (
                <Button variant="destructive" size="sm" onClick={() => deletePhoto.mutate(photo.id)}>
                  <X className="w-3.5 h-3.5 mr-1" />Remove Photo
                </Button>
              )}
            </DialogContent>
          </Dialog>
        ))}
      </div>
    </div>
  );
}
