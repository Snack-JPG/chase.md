import { db } from "@/server/db";
import {
  chaseCampaigns,
  chaseEnrollments,
  xpmJobs,
} from "@/server/db/schema";
import { eq, and, inArray } from "drizzle-orm";

// ============================================================
// Types
// ============================================================

interface AutoEnrollResult {
  enrolled: number;
  skipped: number;
  details: string[];
}

// ============================================================
// Auto-enroll clients from XPM job status changes
// ============================================================

/**
 * For a given practice, find all XPM jobs that are in a "needs docs" status,
 * match them to campaigns with xpmAutoEnroll enabled, and enroll clients
 * who aren't already enrolled.
 */
export async function processXpmAutoEnrollments(
  practiceId: string,
): Promise<AutoEnrollResult> {
  const result: AutoEnrollResult = { enrolled: 0, skipped: 0, details: [] };

  // Get campaigns with auto-enroll enabled
  const autoEnrollCampaigns = await db.query.chaseCampaigns.findMany({
    where: and(
      eq(chaseCampaigns.practiceId, practiceId),
      eq(chaseCampaigns.xpmAutoEnroll, true),
      inArray(chaseCampaigns.status, ["active", "draft"]),
    ),
  });

  if (autoEnrollCampaigns.length === 0) return result;

  // Get all XPM jobs with clients for this practice
  const jobs = await db.query.xpmJobs.findMany({
    where: eq(xpmJobs.practiceId, practiceId),
    with: { client: true },
  });

  // Get existing enrollments for these campaigns to avoid duplicates
  const campaignIds = autoEnrollCampaigns.map((c) => c.id);
  const existingEnrollments = await db.query.chaseEnrollments.findMany({
    where: and(
      eq(chaseEnrollments.practiceId, practiceId),
      inArray(chaseEnrollments.campaignId, campaignIds),
      inArray(chaseEnrollments.status, ["pending", "active"]),
    ),
  });

  const enrolledSet = new Set(
    existingEnrollments.map((e) => `${e.campaignId}:${e.clientId}`),
  );

  for (const campaign of autoEnrollCampaigns) {
    // Get job category → campaign mappings
    const categoryMappings = (campaign.xpmJobCategoryMappings ?? {}) as Record<string, boolean>;
    const mappedCategories = Object.entries(categoryMappings)
      .filter(([, enabled]) => enabled)
      .map(([cat]) => cat.toLowerCase());

    for (const job of jobs) {
      if (!job.clientId || !job.client) continue;

      // Check if job status indicates "awaiting information" type state
      const statusLower = (job.jobStatus ?? "").toLowerCase();
      const isAwaiting = statusLower.includes("awaiting") || statusLower.includes("waiting");
      if (!isAwaiting) continue;

      // If category mappings exist, check category matches
      if (mappedCategories.length > 0) {
        const jobCatLower = (job.jobCategory ?? "").toLowerCase();
        if (!mappedCategories.some((cat) => jobCatLower.includes(cat))) continue;
      }

      // Check not already enrolled
      const key = `${campaign.id}:${job.clientId}`;
      if (enrolledSet.has(key)) {
        result.skipped++;
        continue;
      }

      // Enroll the client
      try {
        await db.insert(chaseEnrollments).values({
          practiceId,
          campaignId: campaign.id,
          clientId: job.clientId,
          status: "pending",
          requiredDocumentIds: campaign.documentTemplateIds ?? [],
        });

        enrolledSet.add(key);
        result.enrolled++;
        result.details.push(
          `Enrolled ${job.client.firstName} ${job.client.lastName} in "${campaign.name}" (job: ${job.jobName})`,
        );
      } catch (err) {
        // Unique constraint violation = already enrolled, skip
        if (err instanceof Error && err.message.includes("unique")) {
          result.skipped++;
        } else {
          result.details.push(
            `Error enrolling ${job.client.firstName} ${job.client.lastName}: ${err instanceof Error ? err.message : "Unknown"}`,
          );
        }
      }
    }
  }

  return result;
}
