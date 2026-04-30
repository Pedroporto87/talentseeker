import { after } from "next/server";
import { CACHE_TAGS, invalidateTags } from "@/lib/server/cached-queries";
import { shouldUseInngestCloud } from "@/lib/server/env";
import { inngest } from "@/lib/server/inngest";
import { ingestResume } from "@/lib/server/services/ingest-resume";

function invalidateResumeViews() {
  invalidateTags([CACHE_TAGS.dashboard, CACHE_TAGS.resumes]);
}

export function enqueueResumeIngest(
  resumeId: string,
  options: {
    hostname?: string;
    buffer?: Buffer;
  } = {},
) {
  after(async () => {
    try {
      if (shouldUseInngestCloud(options.hostname)) {
        await inngest.send({
          name: "resume/uploaded",
          data: { resumeId },
        });
        return;
      }

      await ingestResume(resumeId, { buffer: options.buffer });
      invalidateResumeViews();
    } catch (error) {
      console.error("[enqueue-resume-ingest] failed", {
        resumeId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });
}
