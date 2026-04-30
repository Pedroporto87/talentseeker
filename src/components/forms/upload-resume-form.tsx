"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type UploadResponse =
  | {
      error?: string;
      resume?: {
        status?: string;
        ingestError?: string | null;
      } | null;
    }
  | null;

export function UploadResumeForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    setSuccess(null);

    const response = await fetch("/api/resumes/upload", {
      method: "POST",
      body: formData,
    });

    const payload = (await response.json().catch(() => null)) as UploadResponse;
    const resumeStatus = payload?.resume?.status;
    const resumeError = payload?.resume?.ingestError;

    if (!response.ok) {
      setError(
        resumeError ?? payload?.error ?? "Falha no upload do curriculo.",
      );
      router.refresh();
      setLoading(false);
      return;
    }

    if (resumeStatus === "failed" || resumeStatus === "needs_review") {
      setError(
        resumeError ?? "Nao foi possivel concluir o processamento do curriculo.",
      );
    } else {
      setSuccess(
        resumeStatus === "indexed"
          ? "Curriculo processado e indexado com sucesso."
          : resumeStatus === "parsing"
            ? "Curriculo em processamento."
            : "Curriculo recebido. O status sera atualizado em instantes.",
      );
    }

    router.refresh();
    setLoading(false);
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div className="rounded-[24px] border border-dashed border-[#163f35]/30 bg-[#f3efe6] p-5">
        <label
          className="mb-3 block text-sm font-medium text-slate-700"
          htmlFor="file"
        >
          Envie PDF ou DOCX
        </label>
        <input
          id="file"
          name="file"
          type="file"
          required
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="block w-full text-sm text-slate-700 file:mr-4 file:rounded-full file:border-0 file:bg-[#163f35] file:px-4 file:py-2 file:font-semibold file:text-white"
        />
      </div>
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      {success ? <p className="text-sm text-emerald-700">{success}</p> : null}
      <button
        type="submit"
        disabled={loading}
        className="rounded-full bg-[#f08a24] px-5 py-3 text-sm font-semibold text-[#1d2b23] transition hover:bg-[#dd7b18] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Enviando..." : "Enviar curriculo"}
      </button>
    </form>
  );
}
