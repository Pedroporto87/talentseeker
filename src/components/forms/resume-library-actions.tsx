"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";

type ActionState = "seed" | "attempts" | "all" | null;

export function ResumeLibraryActions() {
  const router = useRouter();
  const [loading, setLoading] = useState<ActionState>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSeed() {
    setLoading("seed");
    setError(null);
    setSuccess(null);

    const response = await fetch("/api/resumes/seed", {
      method: "POST",
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      setError(data?.error ?? "Nao foi possivel gerar a base demo.");
      setLoading(null);
      return;
    }

    const result = (await response.json().catch(() => null)) as
      | { createdCount?: number; totalSeedCandidates?: number }
      | null;

    setSuccess(
      result?.createdCount
        ? `${result.createdCount} curriculos demo preparados para teste.`
        : "Base demo gerada com sucesso.",
    );

    startTransition(() => {
      router.refresh();
    });
    setLoading(null);
  }

  async function handleClear(scope: "attempts" | "all") {
    setLoading(scope);
    setError(null);
    setSuccess(null);

    const response = await fetch(`/api/resumes?scope=${scope}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      setError(data?.error ?? "Nao foi possivel limpar a biblioteca.");
      setLoading(null);
      return;
    }

    const result = (await response.json().catch(() => null)) as
      | { deletedCount?: number }
      | null;

    setSuccess(
      typeof result?.deletedCount === "number"
        ? `${result.deletedCount} curriculos removidos.`
        : "Biblioteca limpa com sucesso.",
    );

    startTransition(() => {
      router.refresh();
    });
    setLoading(null);
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleSeed}
          disabled={loading !== null}
          className="rounded-full bg-[#163f35] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0f3028] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading === "seed" ? "Gerando base..." : "Gerar base demo"}
        </button>
        <button
          type="button"
          onClick={() => handleClear("attempts")}
          disabled={loading !== null}
          className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading === "attempts" ? "Limpando..." : "Limpar tentativas"}
        </button>
        <button
          type="button"
          onClick={() => handleClear("all")}
          disabled={loading !== null}
          className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading === "all" ? "Apagando..." : "Apagar todos"}
        </button>
      </div>
      <p className="text-xs text-slate-500">
        A base demo cria curriculos indexados com perfis variados para testar ranking e pipeline.
      </p>
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      {success ? <p className="text-sm text-emerald-700">{success}</p> : null}
    </div>
  );
}
