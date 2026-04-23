"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { PIPELINE_STAGES, type PipelineStage } from "@/lib/types";

const stageLabel: Record<PipelineStage, string> = {
  aderente: "Aderente",
  triagem: "Triagem",
  entrevista_inicial: "Entrevista inicial",
  entrevista_tecnica: "Entrevista tecnica",
  contratado: "Contratado",
};

export function StageSelect(props: {
  candidateId: string;
  jobId: string;
  value: PipelineStage;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleChange(nextStage: PipelineStage) {
    setLoading(true);
    await fetch(`/api/candidates/${props.candidateId}/stage`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jobId: props.jobId,
        stage: nextStage,
      }),
    });

    startTransition(() => {
      router.refresh();
    });
    setLoading(false);
  }

  return (
    <select
      value={props.value}
      disabled={loading}
      onChange={(event) => handleChange(event.target.value as PipelineStage)}
      className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
    >
      {PIPELINE_STAGES.map((stage) => (
        <option key={stage} value={stage}>
          {stageLabel[stage]}
        </option>
      ))}
    </select>
  );
}
