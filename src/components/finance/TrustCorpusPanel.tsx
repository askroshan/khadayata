import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Landmark } from "lucide-react";
import { formatCurrency, getCampaignProgress } from "@/lib/finance-utils";

interface TrustCorpusPanelProps {
  myChapterId: string | null;
}

export function TrustCorpusPanel({ myChapterId }: TrustCorpusPanelProps) {
  const { data: funds } = useQuery({
    queryKey: ["trust-corpus-funds", myChapterId],
    queryFn: async () => {
      let q = supabase.from("funds").select("*").eq("active", true).ilike("name", "%corpus%");
      if (myChapterId) q = q.or(`chapter_id.eq.${myChapterId},scope.eq.global`);
      const { data } = await q;
      return data ?? [];
    },
  });

  const { data: donations } = useQuery({
    queryKey: ["trust-corpus-donations"],
    queryFn: async () => {
      if (!funds || funds.length === 0) return [];
      const fundIds = funds.map(f => f.id);
      const { data } = await supabase
        .from("donations")
        .select("fund_id, amount, currency, status")
        .in("fund_id", fundIds)
        .eq("status", "succeeded");
      return data ?? [];
    },
    enabled: !!funds && funds.length > 0,
  });

  if (!funds || funds.length === 0) {
    return (
      <Card className="shadow-card">
        <CardContent className="p-6 text-center">
          <Landmark className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            No Trust Corpus funds configured. Create a fund with "Corpus" in the name to track here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="font-display font-semibold flex items-center gap-2">
        <Landmark className="w-4.5 h-4.5 text-primary" />
        Trust Corpus Fund
      </h3>
      <div className="grid gap-4 sm:grid-cols-2">
        {funds.map((fund) => {
          const fundDonations = (donations ?? []).filter(d => d.fund_id === fund.id);
          const totalRaised = fundDonations.reduce((sum, d) => sum + Number(d.amount), 0);
          const goalAmount = Number((fund as Record<string, unknown>).goal_amount ?? 0) || 1000000;
          const progress = getCampaignProgress(totalRaised, goalAmount);

          return (
            <Card key={fund.id} className="shadow-card border-primary/10">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-medium text-sm">{fund.name}</h4>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Badge variant="outline" className="text-[10px] capitalize">{fund.scope}</Badge>
                      <Badge variant="outline" className="text-[10px]">{fund.currency}</Badge>
                    </div>
                  </div>
                  <Landmark className="w-5 h-5 text-primary/40" />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-semibold">{formatCurrency(totalRaised, fund.currency)}</span>
                    <span className="text-muted-foreground">Target: {formatCurrency(goalAmount, fund.currency)}</span>
                  </div>
                  <Progress value={progress} className="h-2.5" />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {progress}% of corpus goal | {fundDonations.length} contributions
                  </p>
                </div>

                <div className="text-xs text-muted-foreground border-t pt-2">
                  <p>Interest earned on corpus supports community programs.</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
