"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";

export function CreateJobForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);

    const payload = {
      title: String(formData.get("title") ?? ""),
      description: String(formData.get("description") ?? ""),
      keywords: String(formData.get("keywords") ?? ""),
    };

    const response = await fetch("/api/jobs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      setError(data?.error ?? "Nao foi possivel cadastrar a vaga.");
      setLoading(false);
      return;
    }

    startTransition(() => {
      router.refresh();
    });
    setLoading(false);
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700" htmlFor="title">
          Nome da vaga
        </label>
        <input
          id="title"
          name="title"
          required
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-[#163f35]"
          placeholder="Ex: Desenvolvedor(a) Frontend Pleno"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700" htmlFor="description">
          Perfil buscado
        </label>
        <textarea
          id="description"
          name="description"
          required
          rows={5}
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-[#163f35]"
          placeholder="Descreva responsabilidades, senioridade, contexto do time e requisitos importantes."
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700" htmlFor="keywords">
          Competencias prioritarias
        </label>
        <input
          id="keywords"
          name="keywords"
          required
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-[#163f35]"
          placeholder="Next.js, Azure, TypeScript, Lideranca tecnica"
        />
      </div>
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      <button
        type="submit"
        disabled={loading}
        className="rounded-full bg-[#163f35] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0f3028] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Cadastrando..." : "Cadastrar vaga"}
      </button>
    </form>
  );
}
