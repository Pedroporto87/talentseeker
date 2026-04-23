import { isDatabaseConfigured } from "@/lib/server/env";
import { memoryRepository } from "@/lib/server/repositories/memory-repository";
import { postgresRepository } from "@/lib/server/repositories/postgres-repository";

export function getRepository() {
  return isDatabaseConfigured() ? postgresRepository : memoryRepository;
}
