"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";

export function RunMatchButton({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    const response = await fetch(`/api/jobs/${jobId}/match`, {
      method: "POST",
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      setError(data?.error ?? "Não foi possível executar o ranking.");
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
      <p className="text-sm font-medium text-[#163f35]">
        Encontre o candidato aderente a vaga aqui com IA.
      </p>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="rounded-full bg-[#163f35] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0f3028] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Executando matching..." : "Rodar matching"}
      </button>
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
    </div>
  );
}
