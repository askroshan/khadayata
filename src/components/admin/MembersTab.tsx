import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { ChevronUp, ChevronDown, ExternalLink, Search, Download, X } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";

interface Member {
  id: string;
  first_name: string;
  last_name: string;
  verification_level: number;
  onboarding_completed: boolean;
  chapter_id: string | null;
  created_at?: string;
  chapters: { name: string } | null;
}

interface MembersTabProps {
  members: Member[] | undefined;
  myChapterId: string | null;
}

const LEVEL_LABELS: Record<number, string> = { 0: "Basic", 1: "Verified", 2: "Trusted", 3: "Senior", 4: "Elder", 5: "Patron" };
const PAGE_SIZE = 25;

function exportCSV(members: Member[]) {
  const header = ["Name", "Chapter", "Verification Level", "Onboarding", "Joined"].join(",");
  const rows = members.map((m) =>
    [
      `"${m.first_name} ${m.last_name}"`,
      `"${(m.chapters as { name: string } | null)?.name ?? ""}"`,
      `L${m.verification_level} — ${LEVEL_LABELS[m.verification_level] ?? "Unknown"}`,
      m.onboarding_completed ? "Complete" : "Pending",
      m.created_at ? format(new Date(m.created_at), "yyyy-MM-dd") : "",
    ].join(",")
  );
  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `members-${format(new Date(), "yyyy-MM-dd")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function MembersTab({ members, myChapterId }: MembersTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterLevel, setFilterLevel] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [page, setPage] = useState(1);

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

  const filtered = useMemo(() => {
    if (!members) return [];
    let list = [...members];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((m) =>
        `${m.first_name} ${m.last_name}`.toLowerCase().includes(q) ||
        (m.chapters as { name: string } | null)?.name?.toLowerCase().includes(q)
      );
    }
    if (filterLevel !== "" && filterLevel !== "all") {
      list = list.filter((m) => m.verification_level === Number(filterLevel));
    }
    if (filterStatus === "complete") list = list.filter((m) => m.onboarding_completed);
    if (filterStatus === "pending") list = list.filter((m) => !m.onboarding_completed);
    return list;
  }, [members, search, filterLevel, filterStatus]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const hasFilters = search || (filterLevel && filterLevel !== "all") || (filterStatus && filterStatus !== "all");

  const clearFilters = () => { setSearch(""); setFilterLevel(""); setFilterStatus(""); setPage(1); };

  return (
    <TooltipProvider>
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or chapter..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9 h-9 text-sm"
            />
          </div>
          <Select value={filterLevel} onValueChange={(v) => { setFilterLevel(v); setPage(1); }}>
            <SelectTrigger className="h-9 w-40 text-sm"><SelectValue placeholder="All Levels" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              {[0, 1, 2, 3, 4, 5].map((l) => <SelectItem key={l} value={String(l)}>L{l} — {LEVEL_LABELS[l]}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setPage(1); }}>
            <SelectTrigger className="h-9 w-36 text-sm"><SelectValue placeholder="All Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="complete">Complete</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 text-xs text-destructive">
              <X className="w-3 h-3 mr-1" /> Clear
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => exportCSV(filtered)} className="h-9 text-xs ml-auto">
            <Download className="w-3.5 h-3.5 mr-1" /> Export CSV
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">{filtered.length} member{filtered.length !== 1 ? "s" : ""} found</p>

        <Card className="shadow-card">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/50">
                  <tr>
                    <th className="p-3 text-left font-medium">Name</th>
                    <th className="p-3 text-left font-medium">Chapter</th>
                    <th className="p-3 text-left font-medium">Level</th>
                    <th className="p-3 text-left font-medium">Joined</th>
                    <th className="p-3 text-left font-medium">Status</th>
                    <th className="p-3 text-left font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((m) => {
                    const inScope = !myChapterId || m.chapter_id === myChapterId;
                    return (
                      <tr key={m.id} className={`border-b border-border last:border-0 hover:bg-muted/30 ${!inScope ? "opacity-60" : ""}`}>
                        <td className="p-3 font-medium">{m.first_name} {m.last_name}</td>
                        <td className="p-3 text-muted-foreground">{(m.chapters as { name: string } | null)?.name ?? "—"}</td>
                        <td className="p-3">
                          <Badge variant="outline">L{m.verification_level} — {LEVEL_LABELS[m.verification_level] ?? "Unknown"}</Badge>
                        </td>
                        <td className="p-3 text-muted-foreground text-xs">
                          {m.created_at ? format(new Date(m.created_at), "dd MMM yyyy") : "—"}
                        </td>
                        <td className="p-3">
                          {m.onboarding_completed
                            ? <Badge className="bg-success/20 text-success border-0">Complete</Badge>
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
                  {!paginated.length && (
                    <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No members found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {totalPages > 1 && (
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Page {page} of {totalPages}</span>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" className="h-7 text-xs" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
              <Button variant="outline" size="sm" className="h-7 text-xs" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
