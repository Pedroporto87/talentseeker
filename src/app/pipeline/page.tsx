import Link from "next/link";
import { Card } from "@/components/ui/card";
import { StageSelect } from "@/components/forms/stage-select";
import { PIPELINE_STAGES, type PipelineStage } from "@/lib/types";
import {
  listJobOptionsCached,
  listMatchesCached,
} from "@/lib/server/cached-queries";

const stageLabel: Record<PipelineStage, string> = {
  aderente: "Aderente",
  triagem: "Triagem",
  entrevista_inicial: "Entrevista inicial",
  entrevista_tecnica: "Entrevista tecnica",
  contratado: "Contratado",
};

type PipelinePageProps = {
  searchParams: Promise<{ jobId?: string }>;
};

export default async function PipelinePage({ searchParams }: PipelinePageProps) {
  const params = await searchParams;
  const jobs = await listJobOptionsCached();
  const currentJob =
    jobs.find((job) => job.id === params.jobId) ?? jobs[0] ?? null;
  const matches = currentJob ? await listMatchesCached(currentJob.id) : [];

  return (
    <Card>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-[#163f35]/60">
            Pipeline de recrutamento
          </p>
          <h2 className="mt-2 font-serif text-3xl text-[#163f35]">
            {currentJob ? currentJob.title : "Nenhuma vaga disponivel"}
          </h2>
          <p className="mt-3 text-sm text-slate-600">
            Acompanhe os candidatos por etapa e movimente cada perfil conforme o
            andamento do processo seletivo.
          </p>
        </div>
        {currentJob ? (
          <Link
            href={`/vagas/${currentJob.id}`}
            prefetch
            className="rounded-full bg-[#163f35] px-4 py-2 text-sm font-semibold text-white"
          >
            Abrir detalhes da vaga
          </Link>
        ) : null}
      </div>

      {jobs.length > 1 ? (
        <div className="mt-6 flex flex-wrap gap-2">
          {jobs.map((job) => (
            <Link
              key={job.id}
              href={`/pipeline?jobId=${job.id}`}
              prefetch
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                currentJob?.id === job.id
                  ? "bg-[#f08a24] text-[#1d2b23]"
                  : "bg-white/70 text-slate-700 hover:bg-white"
              }`}
            >
              {job.title}
            </Link>
          ))}
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 xl:grid-cols-5">
        {PIPELINE_STAGES.map((stage) => {
          const items = matches.filter((match) => match.result.stage === stage);
          return (
            <div
              key={stage}
              className="rounded-[26px] border border-slate-200/80 bg-white/65 p-5"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-[#163f35]">
                  {stageLabel[stage]}
                </h3>
                <span className="rounded-full bg-[#f3efe6] px-3 py-1 text-xs text-slate-700">
                  {items.length}
                </span>
              </div>
              <div className="mt-4 space-y-3">
                {items.map((match) => (
                  <div
                    key={match.result.id}
                    className="rounded-[22px] border border-slate-200/80 bg-white/80 p-4"
                  >
                    <p className="font-semibold text-slate-900">
                      {match.candidate.fullName}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {match.candidate.currentRole ?? "Cargo nao identificado"}
                    </p>
                    <div className="mt-4">
                      <StageSelect
                        candidateId={match.candidate.id}
                        jobId={currentJob?.id ?? ""}
                        value={match.result.stage}
                      />
                    </div>
                  </div>
                ))}

                {items.length === 0 ? (
                  <div className="rounded-[22px] border border-dashed border-slate-300 bg-white/50 p-4 text-sm text-slate-500">
                    Sem candidatos nesta etapa.
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
