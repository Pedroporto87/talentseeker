import { chunkText } from "@/lib/chunking";
import {
  createEmbedding,
  createQdrantDocument,
} from "@/lib/server/adapters/embeddings";
import { createFileHash, storeResumeFile } from "@/lib/server/adapters/storage";
import { upsertResumeVectors } from "@/lib/server/adapters/vector-store";
import { isQdrantCloudInferenceConfigured } from "@/lib/server/env";
import { getRepository } from "@/lib/server/repositories";

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
    email: "ana.beatriz@exemplo.com",
    currentRole: "Engenheira Frontend Senior",
    yearsExperience: 6,
    location: "Sao Paulo, SP",
    skills: ["Next.js", "React", "TypeScript", "Azure", "Vercel", "Tailwind"],
    summary:
      "Especialista em produtos web com foco em performance, design systems e integracao continua na Azure.",
    highlights: [
      "Liderou a migracao de um portal B2B para Next.js.",
      "Implementou pipelines no Azure DevOps e deploy continuo na Vercel.",
      "Atuou na definicao de arquitetura frontend com React Server Components.",
    ],
    education: "Graduacao em Ciencia da Computacao pela UFPE.",
    certifications: ["Microsoft Azure Fundamentals"],
  },
  {
    fullName: "Pedro Henrique Porto",
    email: "pedro.porto@exemplo.com",
    currentRole: "Desenvolvedor Full Stack",
    yearsExperience: 5,
    location: "Recife, PE",
    skills: ["Next.js", "Node.js", "PostgreSQL", "Groq", "Qdrant", "Docker"],
    summary:
      "Desenvolvedor full stack com experiencia em busca semantica, APIs Node.js e plataformas SaaS.",
    highlights: [
      "Construiu um buscador de curriculos com Node.js e Next.js.",
      "Integracao de LLMs via Groq para ranking e justificativas.",
      "Experiencia em Docker, observabilidade e desenho de APIs internas.",
    ],
    education: "Graduacao em Sistemas de Informacao pela UFRPE.",
  },
  {
    fullName: "Joao Victor Araujo",
    email: "joao.araujo@exemplo.com",
    currentRole: "Engenheiro de Dados",
    yearsExperience: 7,
    location: "Belo Horizonte, MG",
    skills: ["Azure", "Python", "SQL", "Data Factory", "Databricks", "Power BI"],
    summary:
      "Engenheiro de dados focado em pipelines analiticos, governanca e integracao com ecossistema Microsoft.",
    highlights: [
      "Criou pipelines no Azure Data Factory para recrutamento e CRM.",
      "Modelagem analitica em SQL e Databricks.",
      "Apoio a dashboards executivos no Power BI.",
    ],
    education: "Graduacao em Engenharia de Software pela PUC Minas.",
  },
  {
    fullName: "Marina Lopes Ribeiro",
    email: "marina.lopes@exemplo.com",
    currentRole: "Product Designer",
    yearsExperience: 4,
    location: "Rio de Janeiro, RJ",
    skills: ["Figma", "Design System", "UX Research", "Product Discovery", "Next.js"],
    summary:
      "Designer de produto com forte parceria com times de engenharia para discovery e design systems.",
    highlights: [
      "Estruturou um design system com tokens e biblioteca compartilhada.",
      "Conduziu entrevistas com recrutadores para redesenhar fluxos de triagem.",
      "Fez handoff de interfaces para times com Next.js e Tailwind.",
    ],
    education: "Graduacao em Design Digital pela ESPM.",
  },
  {
    fullName: "Lucas Fernandes Costa",
    email: "lucas.costa@exemplo.com",
    currentRole: "Backend Engineer",
    yearsExperience: 8,
    location: "Curitiba, PR",
    skills: ["Java", "Spring Boot", "AWS", "PostgreSQL", "Docker", "Kubernetes"],
    summary:
      "Engenheiro backend experiente em microsservicos, mensageria, cloud e arquitetura orientada a eventos.",
    highlights: [
      "Modernizou servicos de recrutamento com Spring Boot e observabilidade.",
      "Desenhou infraestrutura em AWS para integracoes com ATS.",
      "Mentorou equipes em boas praticas de deploy e monitoramento.",
    ],
    education: "Graduacao em Engenharia de Computacao pela UTFPR.",
  },
  {
    fullName: "Carla Souza Menezes",
    email: "carla.souza@exemplo.com",
    currentRole: "Analista de QA",
    yearsExperience: 5,
    location: "Fortaleza, CE",
    skills: ["Cypress", "Playwright", "TypeScript", "Next.js", "Azure DevOps"],
    summary:
      "QA com foco em automacao de testes end-to-end, qualidade de releases e pipelines de validacao.",
    highlights: [
      "Criou suites de regressao com Cypress e Playwright.",
      "Integracao com Azure DevOps para gate de qualidade.",
      "Atuacao proxima ao RH para validar jornadas de upload e matching.",
    ],
    education: "Graduacao em Analise e Desenvolvimento de Sistemas pela Unifor.",
  },
  {
    fullName: "Ricardo Nogueira Alves",
    email: "ricardo.alves@exemplo.com",
    currentRole: "ML Engineer",
    yearsExperience: 6,
    location: "Campinas, SP",
    skills: ["Python", "Machine Learning", "NLP", "Open Source LLMs", "Qdrant", "FastAPI"],
    summary:
      "Engenheiro de ML especializado em NLP, busca semantica e servicos de inferencia.",
    highlights: [
      "Treinou pipelines de matching semantico para curriculos e vagas.",
      "Projetou servicos com FastAPI para extracao de entidades e rerank.",
      "Integracao de embeddings open source com Qdrant.",
    ],
    education: "Mestrado em Ciencia da Computacao pela Unicamp.",
  },
  {
    fullName: "Fernanda Oliveira Paes",
    email: "fernanda.paes@exemplo.com",
    currentRole: "Recruiting Operations Specialist",
    yearsExperience: 9,
    location: "Salvador, BA",
    skills: ["ATS", "People Analytics", "Power BI", "Excel", "Processos de RH", "Scrum"],
    summary:
      "Profissional de operacoes de recrutamento com foco em indicadores e processos.",
    highlights: [
      "Mapeou gargalos de triagem e desenhou indicadores de SLA.",
      "Liderou implantacao de dashboards para recrutadores e gestores.",
      "Experiencia em squads multidisciplinares com engenharia e RH.",
    ],
    education: "Graduacao em Administracao pela UFBA.",
  },
  {
    fullName: "Thiago Martins Prado",
    email: "thiago.prado@exemplo.com",
    currentRole: "DevOps Engineer",
    yearsExperience: 7,
    location: "Florianopolis, SC",
    skills: ["Azure", "Terraform", "Docker", "Kubernetes", "GitHub Actions", "Node.js"],
    summary:
      "DevOps com experiencia em cloud Azure, infraestrutura como codigo e pipelines criticos.",
    highlights: [
      "Padronizou ambientes de homologacao e producao para apps em Next.js.",
      "Automatizou provisionamento com Terraform.",
      "Apoiou times de produto na melhoria de rollback e observabilidade.",
    ],
    education: "Graduacao em Sistemas de Informacao pela UFSC.",
  },
  {
    fullName: "Patricia Gomes Lima",
    email: "patricia.lima@exemplo.com",
    currentRole: "Frontend Engineer",
    yearsExperience: 3,
    location: "Natal, RN",
    skills: ["React", "Next.js", "TypeScript", "Supabase", "Tailwind", "Figma"],
    summary:
      "Frontend engineer com atuacao em produtos SaaS, dashboards e interfaces orientadas a dados.",
    highlights: [
      "Desenvolveu telas analiticas para RH com filtros e ranking.",
      "Uso recorrente de Supabase para persistencia e prototipos.",
      "Trabalho colaborativo com design para responsividade e clareza visual.",
    ],
    education: "Graduacao em Engenharia de Software pela UFRN.",
  },
  {
    fullName: "Eduardo Santos Vieira",
    email: "eduardo.vieira@exemplo.com",
    currentRole: "Engenheiro de Software",
    yearsExperience: 10,
    location: "Porto Alegre, RS",
    skills: ["Node.js", "TypeScript", "Next.js", "Azure", "PostgreSQL", "Arquitetura"],
    summary:
      "Engenheiro de software generalista com forte experiencia em produtos B2B e lideranca tecnica.",
    highlights: [
      "Arquitetou suites internas para times de RH e operacoes.",
      "Experiencia em Azure, PostgreSQL e contratos de API robustos.",
      "Atuacao em discovery tecnico e trade-offs de arquitetura.",
    ],
    education: "Graduacao em Ciencia da Computacao pela UFRGS.",
  },
  {
    fullName: "Larissa Cardoso Pinto",
    email: "larissa.pinto@exemplo.com",
    currentRole: "Analista de BI",
    yearsExperience: 4,
    location: "Goiania, GO",
    skills: ["SQL", "Power BI", "People Analytics", "Excel", "Azure", "ETL"],
    summary:
      "Analista de BI com foco em indicadores operacionais e funis de recrutamento.",
    highlights: [
      "Criou paineis para acompanhar aderencia e taxa de aprovacao por vaga.",
      "Modelagem de dados para RH com SQL e ETL.",
      "Parceria com lideres de recrutamento para metricas acionaveis.",
    ],
    education: "Graduacao em Estatistica pela UFG.",
  },
  {
    fullName: "Juliana Mendes Rocha",
    email: "juliana.rocha@exemplo.com",
    currentRole: "Mobile Engineer",
    yearsExperience: 6,
    location: "Sao Luis, MA",
    skills: ["React Native", "TypeScript", "Expo", "Firebase", "Android", "iOS"],
    summary:
      "Engenheira mobile com foco em aplicativos de alto uso e jornadas digitais.",
    highlights: [
      "Liderou a evolucao de app corporativo em React Native.",
      "Implementou notificacoes e analytics de funil.",
      "Apoiou equipes de RH em jornadas moveis para candidatos.",
    ],
    education: "Graduacao em Ciencia da Computacao pela UFMA.",
  },
  {
    fullName: "Rafael Barbosa Lima",
    email: "rafael.lima@exemplo.com",
    currentRole: "Senior .NET Engineer",
    yearsExperience: 9,
    location: "Brasilia, DF",
    skills: [".NET", "C#", "Azure", "SQL Server", "APIs", "Arquitetura"],
    summary:
      "Especialista em backend corporativo com forte experiencia em .NET e cloud Microsoft.",
    highlights: [
      "Desenvolveu APIs para plataformas internas de recrutamento.",
      "Atuou com Azure App Services, filas e observabilidade.",
      "Conduziu revisoes tecnicas e definicao de contratos.",
    ],
    education: "Graduacao em Engenharia de Software pela UnB.",
  },
  {
    fullName: "Beatriz Cunha Alves",
    email: "beatriz.alves@exemplo.com",
    currentRole: "Salesforce Developer",
    yearsExperience: 5,
    location: "Santos, SP",
    skills: ["Salesforce", "Apex", "LWC", "CRM", "Integracoes", "JavaScript"],
    summary:
      "Desenvolvedora com foco em CRM, automacoes comerciais e integracoes com servicos internos.",
    highlights: [
      "Criou fluxos de qualificacao e distribuicao de leads com Apex.",
      "Integracao de dados entre CRM, APIs internas e plataformas analiticas.",
      "Trabalho com times de atendimento e recrutamento para reduzir operacao manual.",
    ],
    education: "Graduacao em Sistemas para Internet pela Fatec.",
  },
  {
    fullName: "Gustavo Henrique Moura",
    email: "gustavo.moura@exemplo.com",
    currentRole: "Laravel Developer",
    yearsExperience: 7,
    location: "Maceio, AL",
    skills: ["PHP", "Laravel", "MySQL", "Redis", "Docker", "Vue.js"],
    summary:
      "Desenvolvedor full stack com experiencia em ERPs, paineis administrativos e automacoes operacionais.",
    highlights: [
      "Construiu modulos de gestao para equipes administrativas com Laravel.",
      "Melhorou desempenho de consultas e filas com Redis.",
      "Implantou pipelines de deploy com conteinerizacao em Docker.",
    ],
    education: "Graduacao em Sistemas de Informacao pela UFAL.",
  },
  {
    fullName: "Vanessa Albuquerque Nunes",
    email: "vanessa.nunes@exemplo.com",
    currentRole: "Consultora Power Platform",
    yearsExperience: 8,
    location: "Recife, PE",
    skills: ["Power Apps", "Power Automate", "Dataverse", "SharePoint", "Power BI", "Azure"],
    summary:
      "Consultora com foco em automacao low-code e modernizacao de processos corporativos.",
    highlights: [
      "Digitalizou fluxos de admissao e triagem com Power Apps.",
      "Integracao com SharePoint, Dataverse e Power BI.",
      "Atuacao proxima a gestores para reduzir uso de planilhas.",
    ],
    education: "Graduacao em Administracao com enfase em Sistemas pela UPE.",
  },
  {
    fullName: "Henrique Tavares Moreira",
    email: "henrique.moreira@exemplo.com",
    currentRole: "Data Scientist",
    yearsExperience: 6,
    location: "Campina Grande, PB",
    skills: ["Python", "Machine Learning", "NLP", "SQL", "MLOps", "AWS"],
    summary:
      "Cientista de dados voltado para modelos preditivos, NLP e sistemas de recomendacao.",
    highlights: [
      "Desenvolveu modelos de aderencia de candidatos com NLP.",
      "Criou esteiras de treinamento e avaliacao com versionamento.",
      "Apoiou RH na interpretacao de indicadores e melhoria de criterios.",
    ],
    education: "Mestrado em Ciencia da Computacao pela UFCG.",
  },
  {
    fullName: "Bruno Azevedo Campos",
    email: "bruno.campos@exemplo.com",
    currentRole: "Go Backend Engineer",
    yearsExperience: 8,
    location: "Sao Paulo, SP",
    skills: ["Go", "Kafka", "PostgreSQL", "Kubernetes", "gRPC", "Observabilidade"],
    summary:
      "Backend engineer com foco em servicos distribuidos, eventos e alta performance.",
    highlights: [
      "Projetou servicos em Go para processamento de eventos.",
      "Atuou com Kafka, tracing distribuido e observabilidade.",
      "Suportou squads com APIs internas robustas e mensageria.",
    ],
    education: "Graduacao em Ciencia da Computacao pela USP.",
  },
  {
    fullName: "Camila Freitas Pereira",
    email: "camila.pereira@exemplo.com",
    currentRole: "UX Writer e Product Ops",
    yearsExperience: 5,
    location: "Curitiba, PR",
    skills: ["UX Writing", "Product Ops", "Notion", "Pesquisa", "Jornadas", "Analytics"],
    summary:
      "Profissional de produto com foco em clareza de fluxos, conteudo e operacao entre design, tech e negocio.",
    highlights: [
      "Mapeou jornadas de recrutadores e candidatos em fluxos criticos.",
      "Estruturou playbooks e rotinas operacionais para squads.",
      "Apoio a indicadores de adocao e qualidade de uso em fluxos internos.",
    ],
    education: "Graduacao em Comunicacao Social pela UFPR.",
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

export async function seedDemoResumes() {
  const repository = getRepository();
  let createdCount = 0;

  for (const seed of DEMO_RESUMES) {
    const text = buildResumeText(seed);
    const buffer = Buffer.from(text, "utf8");
    const fileName = `${slugify(seed.fullName)}-exemplo.txt`;
    const fileHash = createFileHash(buffer);
    const existing = await repository.findResumeByFileHash(fileHash);
    const existingCandidate = await repository.findCandidateByIdentity({
      fullName: seed.fullName,
      email: seed.email,
    });

    if (existing || existingCandidate) {
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
