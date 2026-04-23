import type { ResumeIngestStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const tone: Record<ResumeIngestStatus, string> = {
  uploaded: "bg-slate-100 text-slate-700",
  parsing: "bg-amber-100 text-amber-800",
  indexed: "bg-emerald-100 text-emerald-800",
  failed: "bg-rose-100 text-rose-800",
  needs_review: "bg-orange-100 text-orange-800",
};

const label: Record<ResumeIngestStatus, string> = {
  uploaded: "Recebido",
  parsing: "Processando",
  indexed: "Indexado",
  failed: "Falhou",
  needs_review: "Revisão manual",
};

export function StatusBadge({ status }: { status: ResumeIngestStatus }) {
  return (
    <span className={cn("rounded-full px-3 py-1 text-xs font-medium", tone[status])}>
      {label[status]}
    </span>
  );
}
