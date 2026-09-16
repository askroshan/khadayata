import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useMember } from "@/hooks/useMember";
import { Button } from "@/components/ui/button";
import { Shield, Lock } from "lucide-react";

interface VerificationGateProps {
  requiredLevel: number;
  children: ReactNode;
  featureName?: string;
  fallback?: ReactNode;
}

export function VerificationGate({ requiredLevel, children, featureName, fallback }: VerificationGateProps) {
  const { member } = useMember();
  const level = member?.verification_level ?? 0;

  if (level >= requiredLevel) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <div className="flex items-center gap-2 text-muted-foreground text-sm bg-muted/40 border border-border rounded-lg px-3 py-2">
      <Lock className="w-4 h-4 shrink-0 text-amber-500" />
      <span>
        {featureName ? `${featureName} requires` : "Requires"} L{requiredLevel} verification.{" "}
        <Link to="/settings" className="text-primary underline underline-offset-2 hover:no-underline font-medium">
          Upgrade now
        </Link>
      </span>
    </div>
  );
}

interface L2GateButtonProps {
  featureName: string;
  children?: ReactNode;
}

export function L2GateButton({ featureName, children }: L2GateButtonProps) {
  const { member } = useMember();
  const level = member?.verification_level ?? 0;

  if (level >= 2) {
    return <>{children}</>;
  }

  return (
    <Button variant="outline" disabled className="gap-1.5 opacity-70 cursor-not-allowed" title={`${featureName} requires L2 verification`}>
      <Shield className="w-4 h-4 text-amber-500" />
      {featureName}
      <span className="ml-1 text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 px-1.5 py-0.5 rounded-full font-semibold">L2</span>
    </Button>
  );
}
