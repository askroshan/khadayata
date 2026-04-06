import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, UserPlus, Trash2 } from "lucide-react";

interface RoleAssignment {
  id: string;
  start_date: string;
  members: unknown;
  roles: unknown;
  chapters: unknown;
}

interface RolesTabProps {
  roleAssignments: RoleAssignment[] | undefined;
  myChapterId: string | null;
}

const CHAPTER_ROLES = ["Chapter Admin", "Event Manager", "Moderator", "Publisher", "Finance Admin", "Directory Manager", "Data Steward", "Committee Chair", "Committee Secretary", "Committee Treasurer", "Committee Member"];

export default function RolesTab({ roleAssignments, myChapterId }: RolesTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignMemberId, setAssignMemberId] = useState("");
  const [assignRoleName, setAssignRoleName] = useState("");
  const [revokeTarget, setRevokeTarget] = useState<{ id: string; memberName: string; roleName: string } | null>(null);

  const { data: chapterMembers } = useQuery({
    queryKey: ["chapter-members-for-roles", myChapterId],
    queryFn: async () => {
      let q = supabase.from("members").select("id, first_name, last_name").order("first_name");
      if (myChapterId) q = q.eq("chapter_id", myChapterId);
      const { data } = await q.limit(200);
      return data ?? [];
    },
    enabled: assignOpen,
  });

  const { data: allRoles } = useQuery({
    queryKey: ["roles-list"],
    queryFn: async () => {
      const { data } = await supabase.from("roles").select("id, name, scope");
      return data ?? [];
    },
    enabled: assignOpen,
  });

  const assignRole = useMutation({
    mutationFn: async () => {
      if (!assignMemberId || !assignRoleName) throw new Error("Select member and role");
      const role = allRoles?.find((r) => r.name === assignRoleName);
      if (!role) throw new Error("Role not found");
      const { error } = await supabase.from("role_assignments").insert({
        member_id: assignMemberId,
        role_id: role.id,
        chapter_id: myChapterId ?? null,
        start_date: new Date().toISOString().split("T")[0],
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Role assigned!" });
      setAssignOpen(false);
      setAssignMemberId("");
      setAssignRoleName("");
      queryClient.invalidateQueries({ queryKey: ["admin-roles"] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const revokeRole = useMutation({
    mutationFn: async (assignmentId: string) => {
      const { error } = await supabase.from("role_assignments").delete().eq("id", assignmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Role revoked." });
      setRevokeTarget(null);
      queryClient.invalidateQueries({ queryKey: ["admin-roles"] });
      queryClient.invalidateQueries({ queryKey: ["admin-chapters"] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const availableRoleNames = myChapterId ? CHAPTER_ROLES : (allRoles?.map((r) => r.name) ?? []);

  return (
    <div className="space-y-4">
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Assign Role</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Member</Label>
              <Select value={assignMemberId} onValueChange={setAssignMemberId}>
                <SelectTrigger><SelectValue placeholder="Select member..." /></SelectTrigger>
                <SelectContent>
                  {chapterMembers?.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.first_name} {m.last_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Role</Label>
              <Select value={assignRoleName} onValueChange={setAssignRoleName}>
                <SelectTrigger><SelectValue placeholder="Select role..." /></SelectTrigger>
                <SelectContent>
                  {availableRoleNames.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={() => assignRole.mutate()}
              disabled={!assignMemberId || !assignRoleName || assignRole.isPending}
              className="w-full gradient-hero text-primary-foreground"
            >
              <UserPlus className="w-4 h-4 mr-1" />Assign Role
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!revokeTarget} onOpenChange={(open) => { if (!open) setRevokeTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Role</AlertDialogTitle>
            <AlertDialogDescription>
              Remove the <strong>{revokeTarget?.roleName}</strong> role from <strong>{revokeTarget?.memberName}</strong>? This will immediately revoke their access.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => revokeTarget && revokeRole.mutate(revokeTarget.id)}
              disabled={revokeRole.isPending}
            >
              Revoke Role
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex justify-end">
        <Button size="sm" onClick={() => setAssignOpen(true)} className="gradient-warm text-primary-foreground">
          <Plus className="w-3.5 h-3.5 mr-1" />Assign Role
        </Button>
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-display text-base">
            {myChapterId ? "Chapter Role Assignments" : "All Role Assignments"}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/50">
                <tr>
                  <th className="p-3 text-left font-medium">Member</th>
                  <th className="p-3 text-left font-medium">Role</th>
                  <th className="p-3 text-left font-medium">Scope</th>
                  <th className="p-3 text-left font-medium">Since</th>
                  <th className="p-3 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {roleAssignments?.map((ra) => {
                  const member = ra.members as { first_name: string; last_name: string } | null;
                  const role = ra.roles as { name: string; scope: string } | null;
                  const chapter = ra.chapters as { name: string } | null;
                  const scopeLabel = role?.scope === "chapter" ? (chapter?.name ?? "Chapter") : (role?.scope ?? "—");
                  const memberName = `${member?.first_name ?? ""} ${member?.last_name ?? ""}`.trim();
                  return (
                    <tr key={ra.id} className="border-b border-border last:border-0">
                      <td className="p-3">{memberName}</td>
                      <td className="p-3"><Badge variant="outline">{role?.name}</Badge></td>
                      <td className="p-3 text-muted-foreground capitalize">{scopeLabel}</td>
                      <td className="p-3 text-muted-foreground">{ra.start_date}</td>
                      <td className="p-3">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          aria-label={`Revoke ${role?.name} from ${memberName}`}
                          onClick={() => setRevokeTarget({ id: ra.id, memberName, roleName: role?.name ?? "role" })}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
                {!roleAssignments?.length && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No role assignments yet</td></tr>}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
