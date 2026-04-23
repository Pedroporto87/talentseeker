import { Inngest } from "inngest";
import { ingestResume } from "@/lib/server/services/ingest-resume";

export const inngest = new Inngest({
  id: "talentseeker-ai",
});

export const ingestResumeFunction = inngest.createFunction(
  {
    id: "ingest-resume-file",
    triggers: [{ event: "resume/uploaded" }],
  },
  async ({ event }) => {
    await ingestResume(event.data.resumeId);
  },
);
