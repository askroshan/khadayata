import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";

interface Audit {
  id: string;
  actor_user_id: string | null;
  entity_type: string;
  entity_id: string | null;
  field: string | null;
  old_value: unknown;
  new_value: unknown;
  reason: string | null;
  created_at: string;
}

interface AuditsTabProps {
  audits: Audit[] | undefined;
}

const ENTITY_COLORS: Record<string, string> = {
  member: "bg-primary/15 text-primary",
  role_assignment: "bg-secondary/15 text-secondary-foreground",
  verification_request: "bg-gold/15 text-gold-foreground",
};

function shortId(id: string | null) {
  if (!id) return "—";
  return id.slice(0, 8) + "…";
}

function renderValue(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

export default function AuditsTab({ audits }: AuditsTabProps) {
  return (
    <Card className="shadow-card">
      <CardHeader className="pb-2">
        <CardTitle className="font-display text-base flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" /> Audit Log
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {(!audits || audits.length === 0) && (
          <p className="text-muted-foreground text-center py-8 text-sm">No audit entries yet. Changes to member levels, roles, and verification requests will appear here.</p>
        )}
        <div className="divide-y divide-border">
          {audits?.map((a) => (
            <div key={a.id} className="flex items-start gap-3 px-4 py-3 text-sm hover:bg-muted/30 transition-colors">
              <FileText className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={`text-xs capitalize border-0 ${ENTITY_COLORS[a.entity_type] ?? "bg-muted text-muted-foreground"}`}>
                    {a.entity_type.replace("_", " ")}
                  </Badge>
                  {a.field && <span className="font-medium text-foreground">{a.field}</span>}
                  {a.reason && <span className="text-muted-foreground">• {a.reason}</span>}
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground flex-wrap">
                  {(a.old_value !== null || a.new_value !== null) && (
                    <span>
                      <span className="line-through opacity-60">{renderValue(a.old_value)}</span>
                      {" → "}
                      <span className="text-foreground font-medium">{renderValue(a.new_value)}</span>
                    </span>
                  )}
                  <span>Entity: {shortId(a.entity_id)}</span>
                  {a.actor_user_id && <span>Actor: {shortId(a.actor_user_id)}</span>}
                  <span>{new Date(a.created_at).toLocaleString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
