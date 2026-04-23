import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";

type StatCardProps = {
  label: string;
  value: string | number;
  hint?: string;
  icon?: ReactNode;
};

export function StatCard({ label, value, hint, icon }: StatCardProps) {
  return (
    <Card className="bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(244,239,229,0.88))]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-3 text-4xl font-semibold tracking-tight text-[#163f35]">
            {value}
          </p>
          {hint ? <p className="mt-3 text-sm text-slate-600">{hint}</p> : null}
        </div>
        <div className="rounded-2xl bg-[#163f35] p-3 text-[#f4d8b4]">{icon}</div>
      </div>
    </Card>
  );
}
