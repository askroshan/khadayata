import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Trash2, Calendar, Building2, Briefcase, Newspaper, Heart, BookOpen } from "lucide-react";
import { format } from "date-fns";

type ContentType = "events" | "businesses" | "jobs" | "content_news" | "matrimonial_profiles" | "oral_histories";

const CONTENT_CONFIG: Record<ContentType, { label: string; icon: typeof Calendar; nameField: string; searchFields: string[]; queryKey: string }> = {
  events: { label: "Events", icon: Calendar, nameField: "name", searchFields: ["name"], queryKey: "bulk-events" },
  businesses: { label: "Businesses", icon: Building2, nameField: "name", searchFields: ["name", "sector"], queryKey: "bulk-businesses" },
  jobs: { label: "Jobs", icon: Briefcase, nameField: "title", searchFields: ["title", "location"], queryKey: "bulk-jobs" },
  content_news: { label: "News Articles", icon: Newspaper, nameField: "title", searchFields: ["title"], queryKey: "bulk-news" },
  matrimonial_profiles: { label: "Matrimonial Profiles", icon: Heart, nameField: "id", searchFields: [], queryKey: "bulk-matrimonial" },
  oral_histories: { label: "Oral Histories", icon: BookOpen, nameField: "title", searchFields: ["title"], queryKey: "bulk-oral-histories" },
};

interface ContentItem {
  id: string;
  name: string;
  subtitle?: string;
  created_at: string;
  status?: string;
}

function useContentQuery(type: ContentType, search: string) {
  return useQuery({
    queryKey: [CONTENT_CONFIG[type].queryKey, search],
    queryFn: async (): Promise<ContentItem[]> => {
      const config = CONTENT_CONFIG[type];
      let q = supabase
        .from(type)
        .select("id, created_at" + (type === "matrimonial_profiles" ? ", members!matrimonial_profiles_member_id_fkey(first_name, last_name)" : type === "events" ? ", name, status" : type === "businesses" ? ", name, sector, verified" : type === "jobs" ? ", title, status, location" : type === "content_news" ? ", title, status" : ", title, status"))
        .order("created_at", { ascending: false })
        .limit(200);

      if (search.trim() && config.searchFields.length > 0) {
        const filters = config.searchFields.map(f => `${f}.ilike.%${search}%`).join(",");
        q = q.or(filters);
      }

      const { data } = await q;
      if (!data) return [];

      return (data as unknown as Record<string, unknown>[]).map((item) => {
        let name = "";
        let subtitle = "";
        let status = "";

        if (type === "matrimonial_profiles") {
          const member = item.members as { first_name: string; last_name: string } | null;
          name = member ? `${member.first_name} ${member.last_name}` : (item.id as string).slice(0, 8);
          status = (item as Record<string, unknown>).status as string ?? "";
        } else if (type === "events") {
          name = item.name as string;
          status = item.status as string ?? "";
        } else if (type === "businesses") {
          name = item.name as string;
          subtitle = item.sector as string ?? "";
          status = (item as Record<string, unknown>).verified ? "verified" : "unverified";
        } else if (type === "jobs") {
          name = item.title as string;
          subtitle = item.location as string ?? "";
          status = item.status as string ?? "";
        } else if (type === "content_news") {
          name = item.title as string;
          status = item.status as string ?? "";
        } else {
          name = item.title as string ?? (item.id as string).slice(0, 8);
          status = item.status as string ?? "";
        }

        return {
          id: item.id as string,
          name,
          subtitle,
          created_at: item.created_at as string,
          status,
        };
      });
    },
  });
}

function ContentSection({ type }: { type: ContentType }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const { data: items, isLoading } = useContentQuery(type, search);
  const config = CONTENT_CONFIG[type];

  const bulkDelete = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from(type).delete().in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: `${selected.size} ${config.label.toLowerCase()} deleted` });
      setSelected(new Set());
      setDeleteConfirm(false);
      queryClient.invalidateQueries({ queryKey: [config.queryKey] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const toggleItem = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (!items) return;
    if (selected.size === items.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(items.map(i => i.id)));
    }
  };

  const statusColor = (s: string) => {
    if (["published", "open", "verified"].includes(s)) return "bg-emerald-100 text-emerald-700 border-0";
    if (["draft", "pending", "unverified"].includes(s)) return "bg-amber-100 text-amber-700 border-0";
    if (["cancelled", "closed", "suspended"].includes(s)) return "bg-red-100 text-red-700 border-0";
    return "bg-muted text-muted-foreground border-0";
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={`Search ${config.label.toLowerCase()}...`}
            value={search}
            onChange={e => { setSearch(e.target.value); setSelected(new Set()); }}
            className="pl-10"
          />
        </div>
        {selected.size > 0 && (
          <Button
            variant="destructive" size="sm"
            onClick={() => setDeleteConfirm(true)}
            className="gap-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete {selected.size} Selected
          </Button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {items?.length ?? 0} record{items?.length !== 1 ? "s" : ""} found
        {selected.size > 0 && ` -- ${selected.size} selected`}
      </p>

      <Card className="shadow-card">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/50">
                <tr>
                  <th className="p-3 w-10">
                    <input
                      type="checkbox"
                      checked={!!items?.length && selected.size === items.length}
                      onChange={toggleAll}
                      className="h-4 w-4 rounded border-border"
                    />
                  </th>
                  <th className="p-3 text-left font-medium">Name</th>
                  <th className="p-3 text-left font-medium">Status</th>
                  <th className="p-3 text-left font-medium">Created</th>
                  <th className="p-3 text-left font-medium w-20">Action</th>
                </tr>
              </thead>
              <tbody>
                {items?.map(item => (
                  <tr key={item.id} className={`border-b border-border last:border-0 hover:bg-muted/30 ${selected.has(item.id) ? "bg-destructive/5" : ""}`}>
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={selected.has(item.id)}
                        onChange={() => toggleItem(item.id)}
                        className="h-4 w-4 rounded border-border"
                      />
                    </td>
                    <td className="p-3">
                      <div>
                        <span className="font-medium">{item.name}</span>
                        {item.subtitle && <span className="text-xs text-muted-foreground ml-2">{item.subtitle}</span>}
                      </div>
                    </td>
                    <td className="p-3">
                      {item.status && <Badge className={`text-[10px] ${statusColor(item.status)}`}>{item.status}</Badge>}
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">
                      {format(new Date(item.created_at), "dd MMM yyyy")}
                    </td>
                    <td className="p-3">
                      <Button
                        size="icon" variant="ghost"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => {
                          setSelected(new Set([item.id]));
                          setDeleteConfirm(true);
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {!items?.length && !isLoading && (
                  <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No records found</td></tr>
                )}
                {isLoading && (
                  <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Loading...</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={deleteConfirm} onOpenChange={setDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selected.size} {config.label}</AlertDialogTitle>
            <AlertDialogDescription>
              Permanently delete {selected.size} selected {config.label.toLowerCase()} record{selected.size !== 1 ? "s" : ""}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => bulkDelete.mutate(Array.from(selected))}
              disabled={bulkDelete.isPending}
            >
              Delete {selected.size} Record{selected.size !== 1 ? "s" : ""}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function BulkContentTab() {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Bulk Content Management</h3>
        <p className="text-sm text-muted-foreground">Select and delete multiple records across different content types. Global Admin only.</p>
      </div>

      <Tabs defaultValue="events">
        <TabsList className="flex w-max">
          {(Object.entries(CONTENT_CONFIG) as [ContentType, typeof CONTENT_CONFIG[ContentType]][]).map(([key, config]) => {
            const Icon = config.icon;
            return (
              <TabsTrigger key={key} value={key} className="gap-1 text-xs">
                <Icon className="w-3.5 h-3.5" />
                {config.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {(Object.keys(CONTENT_CONFIG) as ContentType[]).map(type => (
          <TabsContent key={type} value={type} className="mt-4">
            <ContentSection type={type} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
