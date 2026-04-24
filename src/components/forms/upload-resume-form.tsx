"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";

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

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      setError(data?.error ?? "Falha no upload do currículo.");
      setLoading(false);
      return;
    }

    const payload = (await response.json().catch(() => null)) as
      | { status?: string }
      | null;

    setSuccess(
      payload?.status === "indexed"
        ? "Curriculo processado e indexado com sucesso."
        : "Curriculo recebido. O status sera atualizado em instantes.",
    );

    startTransition(() => {
      router.refresh();
    });
    setLoading(false);
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div className="rounded-[24px] border border-dashed border-[#163f35]/30 bg-[#f3efe6] p-5">
        <label className="mb-3 block text-sm font-medium text-slate-700" htmlFor="file">
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
        {loading ? "Enviando..." : "Enviar currículo"}
      </button>
    </form>
  );
}
