import { Card, CardContent } from "@/components/ui/card";
import { Users, ChartBar as BarChart3, Shield, TrendingUp } from "lucide-react";

interface AdminStatsProps {
  members: Array<{ verification_level: number; onboarding_completed: boolean }> | undefined;
  isChapterScoped?: boolean;
}

export default function AdminStats({ members, isChapterScoped }: AdminStatsProps) {
  const total = members?.length ?? 0;
  const completed = members?.filter((m) => m.onboarding_completed).length ?? 0;
  const l1 = members?.filter((m) => m.verification_level === 1).length ?? 0;
  const l2plus = members?.filter((m) => m.verification_level >= 2).length ?? 0;
  const scopeLabel = isChapterScoped ? "Chapter" : "Global";

  const stats = [
    { label: `${scopeLabel} Members`, value: total, icon: Users },
    { label: "Profiles Completed", value: `${completed}/${total}`, icon: BarChart3 },
    { label: "L1 Verified", value: l1, icon: Shield },
    { label: "L2+ Verified", value: l2plus, icon: TrendingUp },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="shadow-card">
          <CardContent className="p-5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg gradient-warm flex items-center justify-center shrink-0">
              <stat.icon className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <p className="text-2xl font-display font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
