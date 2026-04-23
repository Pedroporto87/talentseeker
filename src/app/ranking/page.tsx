import Link from "next/link";
import { Card } from "@/components/ui/card";
import { ScorePill } from "@/components/score-pill";
import { getRepository } from "@/lib/server/repositories";

export const dynamic = "force-dynamic";

type RankingPageProps = {
  searchParams: Promise<{ jobId?: string }>;
};

export default async function RankingPage({ searchParams }: RankingPageProps) {
  const repository = getRepository();
  const params = await searchParams;
  const jobs = await repository.listJobs();
  const currentJob =
    jobs.find((job) => job.id === params.jobId) ?? jobs[0] ?? null;
  const matches = currentJob ? await repository.listMatches(currentJob.id) : [];

  return (
    <Card>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-[#163f35]/60">
            Ranking de candidatos
          </p>
          <h2 className="mt-2 font-serif text-3xl text-[#163f35]">
            {currentJob ? currentJob.title : "Nenhuma vaga disponivel"}
          </h2>
          <p className="mt-3 text-sm text-slate-600">
            Escolha uma vaga para visualizar os candidatos mais aderentes e as
            justificativas geradas para apoiar a triagem.
          </p>
        </div>
        {currentJob ? (
          <Link
            href={`/vagas/${currentJob.id}`}
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
              href={`/ranking?jobId=${job.id}`}
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

      <div className="mt-6 space-y-4">
        {matches.map((match, index) => (
          <div
            key={match.result.id}
            className="flex flex-col gap-4 rounded-[24px] border border-slate-200/80 bg-white/70 p-5 lg:flex-row lg:items-center lg:justify-between"
          >
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-slate-500">
                Posicao {index + 1}
              </p>
              <h3 className="mt-1 text-xl font-semibold text-[#163f35]">
                {match.candidate.fullName}
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                {match.result.justification}
              </p>
            </div>
            <ScorePill score={match.result.overallScore} />
          </div>
        ))}

        {!currentJob ? (
          <div className="rounded-[24px] border border-dashed border-slate-300 bg-white/50 p-6 text-sm text-slate-600">
            Crie uma vaga para visualizar o ranking de candidatos.
          </div>
        ) : null}

        {currentJob && matches.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-slate-300 bg-white/50 p-6 text-sm text-slate-600">
            Esta vaga ainda nao possui ranking salvo. Abra os detalhes da vaga e
            execute o matching.
          </div>
        ) : null}
      </div>
    </Card>
  );
}
