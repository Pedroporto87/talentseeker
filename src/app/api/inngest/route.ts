import { serve } from "inngest/next";
import { ingestResumeFunction, inngest } from "@/lib/server/inngest";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [ingestResumeFunction],
});
