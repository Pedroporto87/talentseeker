import Link from "next/link";
import {
  BriefcaseBusiness,
  ClipboardList,
  FileCheck2,
  UserRoundCheck,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/stat-card";
import { getRepository } from "@/lib/server/repositories";

export const dynamic = "force-dynamic";

export default async function Home() {
  const repository = getRepository();
  const [dashboard, jobs] = await Promise.all([
    repository.getDashboardSnapshot(),
    repository.listJobs(),
  ]);

  const totalInPipeline = Object.values(dashboard.candidatesByStage).reduce(
    (sum, value) => sum + value,
    0,
  );

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Curriculos recebidos"
          value={dashboard.totalResumes}
          hint="Total de arquivos cadastrados na biblioteca de talentos."
          icon={<ClipboardList className="h-5 w-5" />}
        />
        <StatCard
          label="Vagas abertas"
          value={dashboard.activeJobs}
          hint="Processos seletivos ativos para analise do RH."
          icon={<BriefcaseBusiness className="h-5 w-5" />}
        />
        <StatCard
          label="Curriculos prontos"
          value={dashboard.processedResumes}
          hint="Perfis ja preparados para ranking e comparacao com vagas."
          icon={<FileCheck2 className="h-5 w-5" />}
        />
        <StatCard
          label="Candidatos no funil"
          value={totalInPipeline}
          hint="Pessoas distribuidas nas etapas do processo seletivo."
          icon={<UserRoundCheck className="h-5 w-5" />}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-[#163f35]/60">
                Visao do recrutamento
              </p>
              <h2 className="mt-2 font-serif text-3xl text-[#163f35]">
                Central de triagem inteligente
              </h2>
              <p className="mt-3 max-w-2xl text-sm text-slate-600">
                Cadastre vagas, envie curriculos e gere rankings com justificativas
                para apoiar decisoes de recrutamento com mais velocidade e clareza.
              </p>
            </div>
            <Link
              href="/vagas"
              className="rounded-full bg-[#163f35] px-4 py-2 text-sm font-semibold text-white"
            >
              Gerenciar vagas
            </Link>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {jobs.slice(0, 4).map((job) => (
              <Link
                key={job.id}
                href={`/vagas/${job.id}`}
                className="rounded-[24px] border border-slate-200/80 bg-white/70 p-5 hover:border-[#163f35]/40"
              >
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                  Processo seletivo
                </p>
                <h3 className="mt-2 text-lg font-semibold text-[#163f35]">
                  {job.title}
                </h3>
                <p className="mt-2 line-clamp-3 text-sm text-slate-600">
                  {job.description}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {job.keywords.slice(0, 4).map((keyword) => (
                    <span
                      key={keyword}
                      className="rounded-full bg-[#f3efe6] px-3 py-1 text-xs text-slate-700"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              </Link>
            ))}
            {jobs.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-slate-300 bg-white/55 p-6 text-sm text-slate-600">
                Nenhuma vaga cadastrada ainda. Comece por{" "}
                <Link href="/vagas" className="font-semibold text-[#163f35]">
                  criar a primeira vaga
                </Link>
                .
              </div>
            ) : null}
          </div>
        </Card>

        <Card>
          <p className="text-sm uppercase tracking-[0.25em] text-[#163f35]/60">
            Funil de candidatos
          </p>
          <h2 className="mt-2 font-serif text-2xl text-[#163f35]">
            Distribuicao por etapa
          </h2>
          <div className="mt-6 space-y-3">
            {[
              ["Aderentes", dashboard.candidatesByStage.aderente],
              ["Em triagem", dashboard.candidatesByStage.triagem],
              [
                "Entrevista inicial",
                dashboard.candidatesByStage.entrevista_inicial,
              ],
              [
                "Entrevista tecnica",
                dashboard.candidatesByStage.entrevista_tecnica,
              ],
              ["Contratados", dashboard.candidatesByStage.contratado],
            ].map(([label, value]) => (
              <div
                key={String(label)}
                className="flex items-center justify-between rounded-2xl bg-white/70 px-4 py-3"
              >
                <span className="text-sm font-semibold text-slate-800">
                  {label}
                </span>
                <span className="rounded-full bg-[#f3efe6] px-3 py-1 text-xs font-medium text-slate-700">
                  {value}
                </span>
              </div>
            ))}
          </div>
          <Link
            href="/pipeline"
            className="mt-6 inline-flex rounded-full bg-[#f08a24] px-4 py-2 text-sm font-semibold text-[#1d2b23]"
          >
            Abrir pipeline
          </Link>
        </Card>
      </section>
    </div>
  );
}
