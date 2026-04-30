"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteJobButton({
  jobId,
  label = "Excluir vaga",
  redirectTo,
}: {
  jobId: string;
  label?: string;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    const confirmed = window.confirm(
      "Deseja realmente excluir esta vaga? O ranking e o pipeline associados tambem serao removidos.",
    );

    if (!confirmed) {
      return;
    }

    setLoading(true);
    setError(null);

    const response = await fetch(`/api/jobs/${jobId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      setError(data?.error ?? "Nao foi possivel excluir a vaga.");
      setLoading(false);
      return;
    }

    if (redirectTo) {
      router.replace(redirectTo);
      window.setTimeout(() => router.refresh(), 0);
    } else {
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Excluindo..." : label}
      </button>
      {error ? <p className="text-xs text-rose-700">{error}</p> : null}
    </div>
  );
}
