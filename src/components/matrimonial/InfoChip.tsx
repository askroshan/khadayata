import React from "react";

export function InfoChip({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="bg-muted/40 rounded-lg p-2.5 flex items-start gap-2">
      <Icon className="w-3.5 h-3.5 text-secondary mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className="text-xs font-medium truncate">{value}</p>
      </div>
    </div>
  );
}
