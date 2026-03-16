import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { ChevronUp, ChevronDown, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

interface Member {
  id: string;
  first_name: string;
  last_name: string;
  verification_level: number;
  onboarding_completed: boolean;
  chapter_id: string | null;
  chapters: { name: string } | null;
}

interface MembersTabProps {
  members: Member[] | undefined;
  myChapterId: string | null;
}

const LEVEL_LABELS: Record<number, string> = { 0: "Basic", 1: "Verified", 2: "Trusted", 3: "Senior", 4: "Elder", 5: "Patron" };

export default function MembersTab({ members, myChapterId }: MembersTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateLevel = useMutation({
    mutationFn: async ({ memberId, level }: { memberId: string; level: number }) => {
      const { error } = await supabase.from("members").update({ verification_level: level }).eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Verification level updated" });
      queryClient.invalidateQueries({ queryKey: ["admin-members"] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  return (
    <TooltipProvider>
      <Card className="shadow-card">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/50">
                <tr>
                  <th className="p-3 text-left font-medium">Name</th>
                  <th className="p-3 text-left font-medium">Chapter</th>
                  <th className="p-3 text-left font-medium">Level</th>
                  <th className="p-3 text-left font-medium">Status</th>
                  <th className="p-3 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {members?.map((m) => {
                  const inScope = !myChapterId || m.chapter_id === myChapterId;
                  return (
                    <tr key={m.id} className={`border-b border-border last:border-0 hover:bg-muted/30 ${!inScope ? "opacity-60" : ""}`}>
                      <td className="p-3">{m.first_name} {m.last_name}</td>
                      <td className="p-3 text-muted-foreground">{(m.chapters as { name: string } | null)?.name ?? "—"}</td>
                      <td className="p-3">
                        <Badge variant="outline">L{m.verification_level} — {LEVEL_LABELS[m.verification_level] ?? "Unknown"}</Badge>
                      </td>
                      <td className="p-3">
                        {m.onboarding_completed
                          ? <Badge className="bg-success/20 text-success">Complete</Badge>
                          : (
                            <Link to={`/member/${m.id}?verify=1`} aria-label="Review pending member">
                              <Badge variant="secondary" className="cursor-pointer hover:bg-amber-100 hover:text-amber-800 transition-colors">Pending</Badge>
                            </Link>
                          )
                        }
                      </td>
                      <td className="p-3">
                        <div className="flex gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7"
                                  disabled={!inScope || m.verification_level >= 5 || updateLevel.isPending}
                                  onClick={() => updateLevel.mutate({ memberId: m.id, level: m.verification_level + 1 })}
                                  aria-label="Upgrade verification level"
                                >
                                  <ChevronUp className="w-4 h-4" />
                                </Button>
                              </span>
                            </TooltipTrigger>
                            {!inScope && <TooltipContent>Cannot change level: member belongs to a different chapter</TooltipContent>}
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7"
                                  disabled={!inScope || m.verification_level <= 0 || updateLevel.isPending}
                                  onClick={() => updateLevel.mutate({ memberId: m.id, level: m.verification_level - 1 })}
                                  aria-label="Downgrade verification level"
                                >
                                  <ChevronDown className="w-4 h-4" />
                                </Button>
                              </span>
                            </TooltipTrigger>
                            {!inScope && <TooltipContent>Cannot change level: member belongs to a different chapter</TooltipContent>}
                          </Tooltip>
                          <Button size="icon" variant="ghost" className="h-7 w-7" asChild title="View profile">
                            <Link to={`/member/${m.id}`} aria-label="View member profile">
                              <ExternalLink className="w-4 h-4" />
                            </Link>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!members?.length && (
                  <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No members found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
