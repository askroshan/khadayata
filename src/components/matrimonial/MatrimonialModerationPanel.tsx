import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Shield, Check, Flag, Trash2, Eye } from "lucide-react";
import { ProfileDetailDialog } from "./ProfileDetailDialog";

interface MatrimonialProfile {
  id: string;
  verified: boolean;
  suspended: boolean;
  created_at: string;
  member: {
    id: string;
    first_name: string;
    last_name: string;
    gender: string | null;
    chapters: { name: string } | null;
  } | null;
}

export function MatrimonialModerationPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: allProfiles } = useQuery({
    queryKey: ["admin-matrimonial-profiles"],
    queryFn: async () => {
      const { data } = await supabase
        .from("matrimonial_profiles")
        .select("id, verified, suspended, created_at, member:members!matrimonial_profiles_member_id_fkey(id, first_name, last_name, gender, chapters(name))")
        .order("created_at", { ascending: false });
      return (data ?? []) as MatrimonialProfile[];
    },
  });

  const moderateProfile = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "verify" | "flag" | "delete" }) => {
      if (action === "delete") {
        const { error } = await supabase.from("matrimonial_profiles").delete().eq("id", id);
        if (error) throw error;
      } else {
        const update = action === "verify" ? { verified: true, suspended: false } : { verified: false, suspended: true };
        const { error } = await supabase.from("matrimonial_profiles").update(update).eq("id", id);
        if (error) throw error;
      }
    },
    onSuccess: (_, vars) => {
      toast({ title: vars.action === "delete" ? "Profile deleted" : vars.action === "verify" ? "Profile verified" : "Profile suspended" });
      queryClient.invalidateQueries({ queryKey: ["admin-matrimonial-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["matrimonial-profiles"] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const pending = allProfiles?.filter((p) => !p.verified && !p.suspended) ?? [];
  const verified = allProfiles?.filter((p) => p.verified) ?? [];
  const flagged = allProfiles?.filter((p) => p.suspended) ?? [];

  const ProfileRow = ({ p }: { p: MatrimonialProfile }) => (
    <tr key={p.id} className="border-b border-border last:border-0">
      <td className="p-3">
        <div>
          <p className="font-medium text-sm">{p.member?.first_name} {p.member?.last_name}</p>
          <p className="text-xs text-muted-foreground capitalize">{p.member?.gender}</p>
        </div>
      </td>
      <td className="p-3 text-sm text-muted-foreground">{(p.member?.chapters as { name: string } | null)?.name ?? "—"}</td>
      <td className="p-3">
        {p.verified
          ? <Badge className="bg-success/20 text-success border-0 text-xs">Verified</Badge>
          : p.suspended
          ? <Badge variant="destructive" className="text-xs">Suspended</Badge>
          : <Badge variant="outline" className="text-xs">Pending</Badge>
        }
      </td>
      <td className="p-3">
        <div className="flex items-center gap-1.5">
          <ProfileDetailDialog profile={p as never}>
            <Button size="sm" variant="outline" className="h-7 text-xs px-2" aria-label="View profile">
              <Eye className="w-3 h-3" />
            </Button>
          </ProfileDetailDialog>
          {!p.verified && (
            <Button
              size="sm"
              className="h-7 text-xs px-2 bg-success hover:bg-success/80 text-white"
              aria-label="Verify profile"
              onClick={() => moderateProfile.mutate({ id: p.id, action: "verify" })}
              disabled={moderateProfile.isPending}
            >
              <Check className="w-3 h-3" />
            </Button>
          )}
          {!p.suspended && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs px-2 text-amber-600 hover:text-amber-700"
              aria-label="Suspend profile"
              onClick={() => moderateProfile.mutate({ id: p.id, action: "flag" })}
              disabled={moderateProfile.isPending}
            >
              <Flag className="w-3 h-3" />
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs px-2 text-destructive hover:text-destructive border-destructive/30"
            aria-label="Delete profile"
            onClick={() => moderateProfile.mutate({ id: p.id, action: "delete" })}
            disabled={moderateProfile.isPending}
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </td>
    </tr>
  );

  const ProfileTable = ({ profiles }: { profiles: MatrimonialProfile[] }) => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-border bg-muted/50">
          <tr>
            <th className="p-3 text-left font-medium">Member</th>
            <th className="p-3 text-left font-medium">Chapter</th>
            <th className="p-3 text-left font-medium">Status</th>
            <th className="p-3 text-left font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {profiles.length === 0 && (
            <tr><td colSpan={4} className="p-6 text-center text-muted-foreground text-sm">No profiles</td></tr>
          )}
          {profiles.map((p) => <ProfileRow key={p.id} p={p} />)}
        </tbody>
      </table>
    </div>
  );

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="font-display flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" /> Matrimonial Moderation
        </CardTitle>
        <CardDescription>Review, verify, or suspend submitted matrimonial profiles</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs defaultValue="pending" className="px-4 pb-4 pt-2">
          <TabsList>
            <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
            <TabsTrigger value="verified">Verified ({verified.length})</TabsTrigger>
            <TabsTrigger value="flagged">Suspended ({flagged.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="pending" className="mt-3">
            <ProfileTable profiles={pending} />
          </TabsContent>
          <TabsContent value="verified" className="mt-3">
            <ProfileTable profiles={verified} />
          </TabsContent>
          <TabsContent value="flagged" className="mt-3">
            <ProfileTable profiles={flagged} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
