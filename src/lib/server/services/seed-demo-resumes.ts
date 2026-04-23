import { chunkText } from "@/lib/chunking";
import {
  createEmbedding,
  createQdrantDocument,
} from "@/lib/server/adapters/embeddings";
import { createFileHash, storeResumeFile } from "@/lib/server/adapters/storage";
import { upsertResumeVectors } from "@/lib/server/adapters/vector-store";
import { isQdrantCloudInferenceConfigured } from "@/lib/server/env";
import { getRepository } from "@/lib/server/repositories";
import { clearResumeLibrary } from "@/lib/server/services/delete-resume";

type DemoResumeSeed = {
  fullName: string;
  email: string;
  currentRole: string;
  yearsExperience: number;
  location: string;
  skills: string[];
  summary: string;
  highlights: string[];
  education: string;
  certifications?: string[];
};

const DEMO_RESUMES: DemoResumeSeed[] = [
  {
    fullName: "Ana Beatriz Mota",
    email: "ana.beatriz@talentseeker.demo",
    currentRole: "Engenheira Frontend Senior",
    yearsExperience: 6,
    location: "Sao Paulo, SP",
    skills: ["Next.js", "React", "TypeScript", "Azure", "Vercel", "Tailwind"],
    summary:
      "Especialista em produtos web com foco em performance, design systems e integracao continua na Azure.",
    highlights: [
      "Liderou a migracao de um portal B2B para Next.js 15, reduzindo o tempo medio de carregamento em 41%.",
      "Implementou pipelines no Azure DevOps e deploy continuo na Vercel para quatro squads de produto.",
      "Atuou na definicao de arquitetura frontend com React Server Components, TypeScript e monitoramento de experiencia do usuario.",
    ],
    education: "Graduacao em Ciencia da Computacao pela UFPE.",
    certifications: ["Microsoft Azure Fundamentals", "Vercel Enterprise Workflow"],
  },
  {
    fullName: "Pedro Henrique Porto",
    email: "pedro.porto@talentseeker.demo",
    currentRole: "Desenvolvedor Full Stack",
    yearsExperience: 5,
    location: "Recife, PE",
    skills: ["Next.js", "Node.js", "PostgreSQL", "Groq", "Qdrant", "Docker"],
    summary:
      "Desenvolvedor full stack com experiencia em busca semantica, RAG, APIs Node.js e plataformas SaaS.",
    highlights: [
      "Construiu um buscador de curriculos com Node.js, Next.js e Qdrant para apoiar o time de recrutamento.",
      "Integracao de LLMs via Groq para ranking, justificativa e extracao estruturada de informacoes em processos seletivos.",
      "Experiencia em Docker, observabilidade e desenho de APIs para produtos internos com alta iteracao.",
    ],
    education: "Graduacao em Sistemas de Informacao pela UFRPE.",
    certifications: ["Docker Foundations"],
  },
  {
    fullName: "Joao Victor Araujo",
    email: "joao.araujo@talentseeker.demo",
    currentRole: "Engenheiro de Dados",
    yearsExperience: 7,
    location: "Belo Horizonte, MG",
    skills: ["Azure", "Python", "SQL", "Data Factory", "Databricks", "Power BI"],
    summary:
      "Engenheiro de dados focado em pipelines analiticos, governanca e integracao com ecossistema Microsoft.",
    highlights: [
      "Criou pipelines no Azure Data Factory para ingestao de dados de recrutamento, financeiro e CRM.",
      "Modelagem analitica em SQL e Databricks com controles de qualidade e catalogacao de datasets.",
      "Apoio a dashboards executivos no Power BI para liderancas de RH e operacoes.",
    ],
    education: "Graduacao em Engenharia de Software pela PUC Minas.",
    certifications: ["Azure Data Fundamentals"],
  },
  {
    fullName: "Marina Lopes Ribeiro",
    email: "marina.lopes@talentseeker.demo",
    currentRole: "Product Designer",
    yearsExperience: 4,
    location: "Rio de Janeiro, RJ",
    skills: ["Figma", "Design System", "UX Research", "Product Discovery", "Next.js"],
    summary:
      "Designer de produto com forte parceria com times de engenharia para discovery, experimentacao e design systems.",
    highlights: [
      "Estruturou um design system com tokens e biblioteca compartilhada entre squads web e mobile.",
      "Conduziu entrevistas com recrutadores para redesenhar fluxos de triagem e visualizacao de candidatos.",
      "Fez handoff de interfaces para times com Next.js e Tailwind, reduzindo retrabalho entre design e desenvolvimento.",
    ],
    education: "Graduacao em Design Digital pela ESPM.",
  },
  {
    fullName: "Lucas Fernandes Costa",
    email: "lucas.costa@talentseeker.demo",
    currentRole: "Backend Engineer",
    yearsExperience: 8,
    location: "Curitiba, PR",
    skills: ["Java", "Spring Boot", "AWS", "PostgreSQL", "Docker", "Kubernetes"],
    summary:
      "Engenheiro backend experiente em microsservicos, mensageria, cloud e arquitetura orientada a eventos.",
    highlights: [
      "Modernizou servicos de recrutamento com Spring Boot, filas e observabilidade distribuida.",
      "Desenhou infraestrutura em AWS para suportar integracoes com ATS, CRM e ferramentas internas.",
      "Mentorou equipes em boas praticas de deploy, revisao de codigo e monitoramento de producao.",
    ],
    education: "Graduacao em Engenharia de Computacao pela UTFPR.",
  },
  {
    fullName: "Carla Souza Menezes",
    email: "carla.souza@talentseeker.demo",
    currentRole: "Analista de QA",
    yearsExperience: 5,
    location: "Fortaleza, CE",
    skills: ["Cypress", "Playwright", "TypeScript", "Next.js", "Azure DevOps"],
    summary:
      "QA com foco em automacao de testes end-to-end, qualidade de releases e pipelines de validacao.",
    highlights: [
      "Criou suites de regressao com Cypress e Playwright para plataformas web em Next.js.",
      "Integracao com Azure DevOps para gate de qualidade em cada release do produto.",
      "Atuacao proxima ao RH para validar jornadas de upload, matching e pipeline de candidatos.",
    ],
    education: "Graduacao em Analise e Desenvolvimento de Sistemas pela Unifor.",
  },
  {
    fullName: "Ricardo Nogueira Alves",
    email: "ricardo.alves@talentseeker.demo",
    currentRole: "ML Engineer",
    yearsExperience: 6,
    location: "Campinas, SP",
    skills: ["Python", "Machine Learning", "NLP", "Open Source LLMs", "Qdrant", "FastAPI"],
    summary:
      "Engenheiro de ML especializado em NLP, busca semantica e servicos de inferencia para produtos internos.",
    highlights: [
      "Treinou e avaliou pipelines de matching semantico para classificacao de curriculos e vagas.",
      "Projetou servicos com FastAPI para extracao de entidades, similaridade textual e rerank.",
      "Integracao de embeddings open source com Qdrant para cenarios de busca em baixa latencia.",
    ],
    education: "Mestrado em Ciencia da Computacao pela Unicamp.",
  },
  {
    fullName: "Fernanda Oliveira Paes",
    email: "fernanda.paes@talentseeker.demo",
    currentRole: "Recruiting Operations Specialist",
    yearsExperience: 9,
    location: "Salvador, BA",
    skills: ["ATS", "People Analytics", "Power BI", "Excel", "Processos de RH", "Scrum"],
    summary:
      "Profissional de operacoes de recrutamento com foco em indicadores, processos e suporte a liderancas de contratacao.",
    highlights: [
      "Mapeou gargalos de triagem e desenhou indicadores para acompanhar SLA e conversao por etapa.",
      "Liderou implantacao de dashboards para recrutadores e gestores com foco em produtividade e qualidade.",
      "Experiencia em squads multidisciplinares com engenharia, produto e RH corporativo.",
    ],
    education: "Graduacao em Administracao pela UFBA.",
  },
  {
    fullName: "Thiago Martins Prado",
    email: "thiago.prado@talentseeker.demo",
    currentRole: "DevOps Engineer",
    yearsExperience: 7,
    location: "Florianopolis, SC",
    skills: ["Azure", "Terraform", "Docker", "Kubernetes", "GitHub Actions", "Node.js"],
    summary:
      "DevOps com experiencia em cloud Azure, infraestrutura como codigo e sustentacao de pipelines criticos.",
    highlights: [
      "Padronizou ambientes de homologacao e producao para apps em Next.js e APIs internas.",
      "Automatizou provisionamento com Terraform e politicas de seguranca para servicos de dados e RH.",
      "Apoiou times de produto na melhoria de confiabilidade, rollback e observabilidade de deploy.",
    ],
    education: "Graduacao em Sistemas de Informacao pela UFSC.",
    certifications: ["HashiCorp Terraform Associate", "Azure Administrator Associate"],
  },
  {
    fullName: "Patricia Gomes Lima",
    email: "patricia.lima@talentseeker.demo",
    currentRole: "Frontend Engineer",
    yearsExperience: 3,
    location: "Natal, RN",
    skills: ["React", "Next.js", "TypeScript", "Supabase", "Tailwind", "Figma"],
    summary:
      "Frontend engineer com atuacao em produtos SaaS, dashboards e interfaces orientadas a dados.",
    highlights: [
      "Desenvolveu telas analiticas para RH com filtros, ranking e interacao em tempo real.",
      "Uso recorrente de Supabase para persistencia, autenticacao e prototipos rapidos de produto.",
      "Trabalho colaborativo com design para ajustar acessibilidade, responsividade e clareza visual.",
    ],
    education: "Graduacao em Engenharia de Software pela UFRN.",
  },
  {
    fullName: "Eduardo Santos Vieira",
    email: "eduardo.vieira@talentseeker.demo",
    currentRole: "Engenheiro de Software",
    yearsExperience: 10,
    location: "Porto Alegre, RS",
    skills: ["Node.js", "TypeScript", "Next.js", "Azure", "PostgreSQL", "Arquitetura"],
    summary:
      "Engenheiro de software generalista com forte experiencia em produtos B2B, lideranca tecnica e times pequenos.",
    highlights: [
      "Arquitetou suites internas para times de RH, compliance e operacoes com stack TypeScript ponta a ponta.",
      "Experiencia em Azure, PostgreSQL e contratos de API robustos para integracao com sistemas terceiros.",
      "Atuacao em discovery tecnico, trade-offs de arquitetura e acompanhamento de resultados do negocio.",
    ],
    education: "Graduacao em Ciencia da Computacao pela UFRGS.",
  },
  {
    fullName: "Larissa Cardoso Pinto",
    email: "larissa.pinto@talentseeker.demo",
    currentRole: "Analista de BI",
    yearsExperience: 4,
    location: "Goiania, GO",
    skills: ["SQL", "Power BI", "People Analytics", "Excel", "Azure", "ETL"],
    summary:
      "Analista de BI com foco em indicadores operacionais, funis de recrutamento e suporte a decisoes taticas.",
    highlights: [
      "Criou paineis para acompanhar aderencia de candidatos, tempo de resposta e taxa de aprovacao por vaga.",
      "Modelagem de dados para RH com SQL, ETL e integracao com fontes operacionais e planilhas legadas.",
      "Parceria constante com lideres de recrutamento para priorizacao de perguntas e metricas acionaveis.",
    ],
    education: "Graduacao em Estatistica pela UFG.",
  },
];

function buildResumeText(seed: DemoResumeSeed) {
  return [
    `Nome: ${seed.fullName}`,
    `Email: ${seed.email}`,
    `Localizacao: ${seed.location}`,
    `Cargo atual: ${seed.currentRole}`,
    `Resumo profissional: ${seed.summary}`,
    `Anos de experiencia: ${seed.yearsExperience}`,
    `Skills: ${seed.skills.join(", ")}`,
    "Experiencias relevantes:",
    ...seed.highlights.map((item) => `- ${item}`),
    `Formacao: ${seed.education}`,
    seed.certifications?.length
      ? `Certificacoes: ${seed.certifications.join(", ")}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function seedDemoResumes(options?: { replaceExisting?: boolean }) {
  if (options?.replaceExisting) {
    await clearResumeLibrary("all");
  }

  const repository = getRepository();
  let createdCount = 0;

  for (const seed of DEMO_RESUMES) {
    const text = buildResumeText(seed);
    const buffer = Buffer.from(text, "utf8");
    const fileName = `${slugify(seed.fullName)}-demo.txt`;
    const fileHash = createFileHash(buffer);
    const existing = await repository.findResumeByFileHash(fileHash);

    if (existing) {
      continue;
    }

    const storedFile = await storeResumeFile({
      buffer,
      fileName,
      contentType: "text/plain",
    });

    const created = await repository.createResume({
      fileName,
      mimeType: "text/plain",
      fileHash,
      storageKey: storedFile.storageKey,
      downloadUrl: storedFile.downloadUrl,
    });

    const candidate = await repository.upsertCandidateProfile({
      fullName: seed.fullName,
      email: seed.email,
      skills: seed.skills,
      yearsExperience: seed.yearsExperience,
      currentRole: seed.currentRole,
      location: seed.location,
      summary: seed.summary,
    });

    await repository.updateResume(created.resume.id, {
      candidateId: candidate.id,
      extractedText: text,
      status: "parsing",
      ingestError: null,
    });

    const ingestJob = await repository.getLatestIngestJobForResume(created.resume.id);
    if (ingestJob) {
      await repository.updateIngestJob(ingestJob.id, {
        status: "parsing",
        errorMessage: null,
      });
    }

    const chunks = chunkText(text, {
      maxTokens: 500,
      overlapTokens: 100,
    });

    const storedChunks = await repository.replaceResumeChunks(created.resume.id, chunks);
    const embeddedChunks = [];

    for (const chunk of storedChunks) {
      embeddedChunks.push({
        id: chunk.id,
        vector: isQdrantCloudInferenceConfigured()
          ? createQdrantDocument(chunk.content)
          : await createEmbedding(chunk.content),
        payload: {
          resumeId: created.resume.id,
          candidateId: candidate.id,
          content: chunk.content,
          chunkIndex: chunk.chunkIndex,
        },
      });
    }

    await upsertResumeVectors(embeddedChunks);

    await repository.updateResume(created.resume.id, {
      status: "indexed",
      extractedText: text,
      candidateId: candidate.id,
      ingestError: null,
    });

    if (ingestJob) {
      await repository.updateIngestJob(ingestJob.id, {
        status: "indexed",
        errorMessage: null,
      });
    }

    createdCount += 1;
  }

  return {
    createdCount,
    totalSeedCandidates: DEMO_RESUMES.length,
  };
}
