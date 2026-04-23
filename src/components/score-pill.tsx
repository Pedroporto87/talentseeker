import { formatPercent } from "@/lib/utils";

export function ScorePill({ score }: { score: number }) {
  return (
    <span className="rounded-full bg-[#163f35] px-3 py-1 text-sm font-semibold text-[#f7ead1]">
      {formatPercent(score * 100)}
    </span>
  );
}
