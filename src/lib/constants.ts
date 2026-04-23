export const APP_NAME = "TalentSeeker AI";

export const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/vagas", label: "Vagas" },
  { href: "/curriculos", label: "Currículos" },
  { href: "/ranking", label: "Ranking" },
  { href: "/pipeline", label: "Pipeline" },
] as const;

export const ACCEPTED_RESUME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

export const KNOWN_SKILLS = [
  "next.js",
  "react",
  "typescript",
  "javascript",
  "node.js",
  "azure",
  "aws",
  "python",
  "java",
  "c#",
  "sql",
  "postgresql",
  "docker",
  "kubernetes",
  "tailwind",
  "vercel",
  "groq",
  "openai",
  "machine learning",
  "inteligencia artificial",
  "ia",
  "nlp",
  "data science",
  "figma",
  "product management",
  "scrum",
  "agile",
  "git",
  "supabase",
  "qdrant",
] as const;

export const DEFAULT_QDRANT_COLLECTION = "resume_chunks";
