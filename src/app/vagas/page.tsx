import Link from "next/link";
import { Card } from "@/components/ui/card";
import { CreateJobForm } from "@/components/forms/create-job-form";
import { listJobsCached } from "@/lib/server/cached-queries";

export const dynamic = "force-dynamic";

export default async function JobsPage() {
  const jobs = await listJobsCached();

  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <Card>
        <p className="text-sm uppercase tracking-[0.25em] text-[#163f35]/60">
          Novo processo seletivo
        </p>
        <h2 className="mt-2 font-serif text-3xl text-[#163f35]">
          Cadastre uma vaga para triagem
        </h2>
        <p className="mt-3 text-sm text-slate-600">
          Informe o perfil desejado, responsabilidades e criterios importantes
          para que o sistema encontre candidatos com maior aderencia.
        </p>
        <div className="mt-6">
          <CreateJobForm />
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-[#163f35]/60">
              Vagas em andamento
            </p>
            <h2 className="mt-2 font-serif text-3xl text-[#163f35]">
              Processos seletivos ativos
            </h2>
          </div>
          <span className="rounded-full bg-[#f3efe6] px-3 py-1 text-sm font-medium text-slate-700">
            {jobs.length} vagas
          </span>
        </div>

        <div className="mt-6 space-y-4">
          {jobs.map((job) => (
            <Link
              key={job.id}
              href={`/vagas/${job.id}`}
              prefetch
              className="block rounded-[24px] border border-slate-200/80 bg-white/70 p-5 hover:border-[#163f35]/40"
            >
              <h3 className="text-lg font-semibold text-[#163f35]">{job.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{job.description}</p>
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
            </Link>
          ))}

          {jobs.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-slate-300 bg-white/50 p-6 text-sm text-slate-600">
              Nenhuma vaga criada ainda.
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
