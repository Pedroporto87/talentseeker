import { DeleteResumeButton } from "@/components/forms/delete-resume-button";
import { ResumeLibraryActions } from "@/components/forms/resume-library-actions";
import { UploadResumeForm } from "@/components/forms/upload-resume-form";
import { StatusBadge } from "@/components/status-badge";
import { Card } from "@/components/ui/card";
import { listResumesCached } from "@/lib/server/cached-queries";

export const dynamic = "force-dynamic";

export default async function ResumesPage() {
  const resumes = await listResumesCached();

  return (
    <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
      <Card>
        <p className="text-sm uppercase tracking-[0.25em] text-[#163f35]/60">
          Ingestao
        </p>
        <h2 className="mt-2 font-serif text-3xl text-[#163f35]">
          Envie novos curriculos
        </h2>
        <p className="mt-3 text-sm text-slate-600">
          O sistema aceita PDF com texto e DOCX, extrai o conteudo, gera chunks,
          embeddings e prepara o curriculo para busca semantica.
        </p>
        <div className="mt-6">
          <UploadResumeForm />
        </div>
        <div className="mt-6 border-t border-slate-200 pt-6">
          <ResumeLibraryActions />
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-[#163f35]/60">
              Biblioteca de curriculos
            </p>
            <h2 className="mt-2 font-serif text-3xl text-[#163f35]">
              Acompanhe o processamento
            </h2>
          </div>
          <span className="rounded-full bg-[#f3efe6] px-3 py-1 text-sm font-medium text-slate-700">
            {resumes.length} arquivos
          </span>
        </div>

        <div className="mt-6 space-y-4">
          {resumes.map(({ resume, candidate }) => (
            <div
              key={resume.id}
              className="rounded-[24px] border border-slate-200/80 bg-white/70 p-5"
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-lg font-semibold text-[#163f35]">
                    {candidate?.fullName ?? resume.fileName}
                  </p>
                  <p className="text-sm text-slate-500">{resume.fileName}</p>
                  <p className="mt-2 text-sm text-slate-600">
                    {candidate?.email ?? "E-mail nao identificado"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={resume.status} />
                  <DeleteResumeButton
                    resumeId={resume.id}
                    label={
                      resume.status === "indexed"
                        ? "Excluir curriculo"
                        : "Excluir tentativa"
                    }
                  />
                </div>
              </div>

              {candidate?.skills?.length ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {candidate.skills.slice(0, 6).map((skill) => (
                    <span
                      key={skill}
                      className="rounded-full bg-[#f3efe6] px-3 py-1 text-xs text-slate-700"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              ) : null}

              {resume.ingestError ? (
                <p className="mt-4 text-sm text-rose-700">{resume.ingestError}</p>
              ) : null}
            </div>
          ))}

          {resumes.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-slate-300 bg-white/50 p-6 text-sm text-slate-600">
              Nenhum curriculo enviado ainda.
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
