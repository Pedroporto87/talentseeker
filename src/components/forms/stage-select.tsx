"use client";

import { startTransition, useOptimistic, useState } from "react";
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
  const [error, setError] = useState<string | null>(null);
  const [optimisticStage, setOptimisticStage] = useOptimistic<
    PipelineStage,
    PipelineStage
  >(props.value, (_, nextStage) => nextStage);

  async function handleChange(nextStage: PipelineStage) {
    const previousStage = props.value;
    startTransition(() => {
      setOptimisticStage(nextStage);
    });
    setLoading(true);
    setError(null);

    const response = await fetch(`/api/candidates/${props.candidateId}/stage`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jobId: props.jobId,
        stage: nextStage,
      }),
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      startTransition(() => {
        setOptimisticStage(previousStage);
      });
      setError(data?.error ?? "Nao foi possivel atualizar a etapa.");
      setLoading(false);
      return;
    }

    startTransition(() => {
      router.refresh();
    });
    setLoading(false);
  }

  return (
    <div className="space-y-2">
      <select
        value={optimisticStage}
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
      {error ? <p className="text-xs text-rose-700">{error}</p> : null}
    </div>
  );
}
