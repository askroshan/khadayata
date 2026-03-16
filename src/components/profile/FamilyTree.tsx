import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";

interface FamilyMember {
  id: string;
  relation: string;
  related: { id: string; first_name: string; last_name: string; verification_level: number } | null;
}

const RELATION_ORDER = [
  "spouse", "father", "mother", "son", "daughter", "brother", "sister",
  "grandfather", "grandmother", "uncle", "aunt", "nephew", "niece", "cousin",
];

function RelationGroup({ label, members }: { label: string; members: FamilyMember[] }) {
  if (!members.length) return null;
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
      <div className="flex flex-wrap gap-2">
        {members.map((fl) => (
          <Link key={fl.id} to={`/member/${fl.related?.id}`}>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 hover:bg-muted border border-border hover:border-primary/30 transition-all group text-sm">
              <div className="w-6 h-6 rounded-full gradient-hero flex items-center justify-center text-primary-foreground text-[10px] font-bold shrink-0">
                {fl.related?.first_name?.[0]}{fl.related?.last_name?.[0]}
              </div>
              <span className="font-medium group-hover:text-primary transition-colors">
                {fl.related?.first_name} {fl.related?.last_name}
              </span>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">L{fl.related?.verification_level ?? 0}</Badge>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function FamilyTree({ memberId }: { memberId: string }) {
  const { data: links, isLoading } = useQuery({
    queryKey: ["family-tree", memberId],
    queryFn: async () => {
      const { data } = await supabase
        .from("family_links")
        .select("id, relation, related:members!family_links_related_member_id_fkey(id, first_name, last_name, verification_level)")
        .eq("member_id", memberId)
        .not("related_member_id", "is", null);
      return (data ?? []) as FamilyMember[];
    },
    enabled: !!memberId,
  });

  if (isLoading) return <div className="animate-pulse h-12 bg-muted rounded-lg" />;
  if (!links?.length) return null;

  const grouped = RELATION_ORDER.reduce<Record<string, FamilyMember[]>>((acc, rel) => {
    const matches = links.filter((l) => l.relation?.toLowerCase() === rel);
    if (matches.length) acc[rel] = matches;
    return acc;
  }, {});

  const unclassified = links.filter(
    (l) => !RELATION_ORDER.includes(l.relation?.toLowerCase() ?? "")
  );
  if (unclassified.length) grouped["other"] = unclassified;

  const labelMap: Record<string, string> = {
    spouse: "Spouse", father: "Father", mother: "Mother",
    son: "Son(s)", daughter: "Daughter(s)", brother: "Brother(s)", sister: "Sister(s)",
    grandfather: "Grandfather", grandmother: "Grandmother",
    uncle: "Uncle(s)", aunt: "Aunt(s)", nephew: "Nephew(s)", niece: "Niece(s)",
    cousin: "Cousin(s)", other: "Other Relations",
  };

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
        <Users className="w-3.5 h-3.5" /> Family Connections
      </p>
      {Object.entries(grouped).map(([rel, members]) => (
        <RelationGroup key={rel} label={labelMap[rel] ?? rel} members={members} />
      ))}
    </div>
  );
}
