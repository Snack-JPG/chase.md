/**
 * AI Document Classification — Uses Anthropic to classify uploaded documents
 */

import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/server/db";
import { clientDocuments, documentTemplates } from "@/server/db/schema";
import { eq, and, isNull } from "drizzle-orm";

function getAnthropic() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
}

interface ClassificationResult {
  templateId: string | null;
  classification: string;
  confidence: number;
  confidenceLevel: "high" | "medium" | "low" | "unknown";
}

/**
 * Classify a document based on its filename, mime type, and available templates.
 */
export async function classifyDocument(documentId: string): Promise<ClassificationResult> {
  const doc = await db.query.clientDocuments.findFirst({
    where: eq(clientDocuments.id, documentId),
  });

  if (!doc) throw new Error(`Document ${documentId} not found`);

  // Fetch available templates for this practice
  const templates = await db.query.documentTemplates.findMany({
    where: doc.practiceId
      ? eq(documentTemplates.practiceId, doc.practiceId)
      : undefined,
  });

  if (templates.length === 0) {
    // No templates to classify against
    return {
      templateId: null,
      classification: "unclassified",
      confidence: 0,
      confidenceLevel: "unknown",
    };
  }

  const templateList = templates.map((t) => ({
    id: t.id,
    name: t.name,
    category: t.category,
    description: t.description,
    hints: t.aiClassificationHints,
  }));

  const anthropic = getAnthropic();
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 500,
    messages: [{
      role: "user",
      content: `Classify this uploaded document based on filename and type. Return JSON only.

Document:
- Filename: ${doc.fileName}
- MIME type: ${doc.mimeType}
- File size: ${doc.fileSize} bytes

Available document templates:
${JSON.stringify(templateList, null, 2)}

Return JSON: { "templateId": "<uuid or null>", "classification": "<template name or 'unknown'>", "confidence": <0-1>, "reasoning": "<brief>" }`,
    }],
  });

  try {
    const text = message.content[0].type === "text" ? message.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");

    const result = JSON.parse(jsonMatch[0]);
    const confidence = Number(result.confidence) || 0;
    const confidenceLevel: "high" | "medium" | "low" | "unknown" =
      confidence >= 0.8 ? "high" :
      confidence >= 0.5 ? "medium" :
      confidence > 0 ? "low" : "unknown";

    const classification: ClassificationResult = {
      templateId: result.templateId && templates.some((t) => t.id === result.templateId) ? result.templateId : null,
      classification: result.classification || "unknown",
      confidence,
      confidenceLevel,
    };

    // Update the document record
    await db.update(clientDocuments)
      .set({
        aiClassification: classification.classification,
        aiConfidence: String(classification.confidence),
        aiConfidenceLevel: classification.confidenceLevel,
        aiRawResponse: result,
        classifiedAt: new Date(),
        templateId: classification.templateId || doc.templateId,
        status: "classified",
        updatedAt: new Date(),
      })
      .where(eq(clientDocuments.id, documentId));

    return classification;
  } catch (err) {
    console.error("AI classification parse error:", err);
    return {
      templateId: null,
      classification: "unknown",
      confidence: 0,
      confidenceLevel: "unknown",
    };
  }
}
