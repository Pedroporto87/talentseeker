import { z } from "zod";
import { PIPELINE_STAGES } from "@/lib/types";
import { uniqueStrings } from "@/lib/utils";

export const jobInputSchema = z.object({
  title: z.string().min(3, "Informe um título mais descritivo."),
  description: z.string().min(20, "Descreva a vaga com mais contexto."),
  keywords: z
    .union([z.string(), z.array(z.string())])
    .transform((value) =>
      Array.isArray(value)
        ? uniqueStrings(value)
        : uniqueStrings(
            value
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean),
          ),
    )
    .refine((value) => value.length > 0, "Informe ao menos uma palavra-chave."),
});

export const updateStageSchema = z.object({
  jobId: z.string().uuid(),
  stage: z.enum(PIPELINE_STAGES),
});
