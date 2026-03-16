import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMember } from "@/hooks/useMember";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Tag, Plus, Check } from "lucide-react";

interface HeritageTaggingProps {
  entityType: string;
  entityId: string;
}

export function HeritageTagging({ entityType, entityId }: HeritageTaggingProps) {
  const { member } = useMember();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newTag, setNewTag] = useState("");
  const [showInput, setShowInput] = useState(false);

  const { data: tags } = useQuery({
    queryKey: ["heritage-tags", entityType, entityId],
    queryFn: async () => {
      const { data } = await supabase
        .from("heritage_tags")
        .select("*, tagger:members!heritage_tags_tagged_by_fkey(first_name, last_name)")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const addTag = useMutation({
    mutationFn: async () => {
      if (!member || !newTag.trim()) throw new Error("Not ready");
      const { error } = await supabase.from("heritage_tags").insert({
        entity_type: entityType,
        entity_id: entityId,
        tag: newTag.trim().toLowerCase(),
        tagged_by: member.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewTag("");
      setShowInput(false);
      toast({ title: "Tag added! It will appear once approved." });
      queryClient.invalidateQueries({ queryKey: ["heritage-tags", entityType, entityId] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const approvedTags = tags?.filter((t) => t.approved) ?? [];
  const pendingTags = tags?.filter((t) => !t.approved) ?? [];

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Tag className="w-3 h-3" />
        <span>Community Tags</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {approvedTags.map((t) => (
          <Badge key={t.id} variant="secondary" className="text-xs">
            {t.tag}
          </Badge>
        ))}
        {pendingTags.map((t) => (
          <Badge key={t.id} variant="outline" className="text-xs opacity-60">
            {t.tag} <span className="ml-1 text-[10px]">(pending)</span>
          </Badge>
        ))}
        {member && !showInput && (
          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setShowInput(true)}>
            <Plus className="w-3 h-3 mr-0.5" />Add
          </Button>
        )}
      </div>
      {showInput && (
        <div className="flex gap-2">
          <Input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            placeholder="e.g. migration, customs"
            className="h-8 text-xs"
            maxLength={50}
            onKeyDown={(e) => e.key === "Enter" && addTag.mutate()}
          />
          <Button size="sm" className="h-8" onClick={() => addTag.mutate()} disabled={!newTag.trim() || addTag.isPending}>
            <Check className="w-3 h-3" />
          </Button>
        </div>
      )}
    </div>
  );
}
