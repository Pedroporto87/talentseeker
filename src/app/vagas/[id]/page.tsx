import { notFound } from "next/navigation";
import { DeleteJobButton } from "@/components/forms/delete-job-button";
import { Card } from "@/components/ui/card";
import { RunMatchButton } from "@/components/forms/run-match-button";
import { StageSelect } from "@/components/forms/stage-select";
import { ScorePill } from "@/components/score-pill";
import {
  getJobCached,
  listMatchesCached,
  listPipelineHistoryCached,
} from "@/lib/server/cached-queries";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function JobDetailPage({ params }: PageProps) {
  const { id } = await params;
  const [job, matches, history] = await Promise.all([
    getJobCached(id),
    listMatchesCached(id),
    listPipelineHistoryCached(id),
  ]);

  if (!job) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-[#163f35]/60">
              Detalhe da vaga
            </p>
            <h2 className="mt-2 font-serif text-4xl text-[#163f35]">{job.title}</h2>
            <p className="mt-4 max-w-3xl text-sm text-slate-600">{job.description}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {job.keywords.map((keyword) => (
                <span
                  key={keyword}
                  className="rounded-full bg-[#e8f1ed] px-3 py-1 text-xs text-[#163f35]"
                >
                  {keyword}
                </span>
              ))}
            </div>
          </div>
          <div className="w-full max-w-md lg:w-auto">
            <p className="text-sm font-medium text-[#163f35] lg:text-right">
              Encontre o candidato aderente a vaga aqui com IA.
            </p>
            <div className="mt-3 flex flex-wrap items-start gap-3 lg:justify-end">
              <RunMatchButton jobId={job.id} />
              <DeleteJobButton
                jobId={job.id}
                label="Excluir vaga"
                redirectTo="/vagas"
              />
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <p className="text-sm uppercase tracking-[0.25em] text-[#163f35]/60">
            Ranking atual
          </p>
          <h3 className="mt-2 font-serif text-3xl text-[#163f35]">
            Top candidatos sugeridos
          </h3>
          <div className="mt-6 space-y-4">
            {matches.map((match) => (
              <div
                key={match.result.id}
                className="rounded-[24px] border border-slate-200/80 bg-white/70 p-5"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-lg font-semibold text-[#163f35]">
                      {match.candidate.fullName}
                    </p>
                    <p className="text-sm text-slate-500">
                      {match.candidate.currentRole ?? "Cargo não identificado"}
                    </p>
                  </div>
                  <ScorePill score={match.result.overallScore} />
                </div>

                <p className="mt-4 text-sm text-slate-700">
                  {match.result.justification}
                </p>

                {match.candidate.skills.length ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {match.candidate.skills.slice(0, 6).map((skill) => (
                      <span
                        key={skill}
                        className="rounded-full bg-[#f3efe6] px-3 py-1 text-xs text-slate-700"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : null}

                <div className="mt-5">
                  <StageSelect
                    candidateId={match.candidate.id}
                    jobId={job.id}
                    value={match.result.stage}
                  />
                </div>
              </div>
            ))}

            {matches.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-slate-300 bg-white/50 p-6 text-sm text-slate-600">
                Ainda não há ranking salvo para esta vaga. Rode o matching para gerar o top 5.
              </div>
            ) : null}
          </div>
        </Card>

        <Card>
          <p className="text-sm uppercase tracking-[0.25em] text-[#163f35]/60">
            Histórico do pipeline
          </p>
          <h3 className="mt-2 font-serif text-3xl text-[#163f35]">
            Movimentações recentes
          </h3>
          <div className="mt-6 space-y-3">
            {history.map((item) => {
              const candidate = matches.find(
                (match) => match.candidate.id === item.candidateId,
              )?.candidate;
              return (
                <div
                  key={item.id}
                  className="rounded-[22px] border border-slate-200/80 bg-white/70 p-4"
                >
                  <p className="font-semibold text-slate-900">
                    {candidate?.fullName ?? "Candidato"}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {item.fromStage
                      ? `${item.fromStage} -> ${item.toStage}`
                      : `Entrada em ${item.toStage}`}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{item.changedAt}</p>
                </div>
              );
            })}

            {history.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-slate-300 bg-white/50 p-6 text-sm text-slate-600">
                O histórico aparecerá assim que houver ranking e movimentações.
              </div>
            ) : null}
          </div>
        </Card>
      </div>
    </div>
  );
}
