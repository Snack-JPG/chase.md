import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { magicLinks, clientDocuments } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";
import { uploadDocument } from "@/lib/r2";
import { isAfter } from "date-fns";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
]);

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const token = formData.get("token") as string | null;

    if (!file || !token) {
      return NextResponse.json({ error: "Missing file or token" }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: "File type not allowed" }, { status: 400 });
    }

    // Validate magic link
    const link = await db.query.magicLinks.findFirst({
      where: and(
        eq(magicLinks.token, token),
        eq(magicLinks.isRevoked, false),
      ),
    });

    if (!link) {
      return NextResponse.json({ error: "Invalid or expired link" }, { status: 403 });
    }

    if (!isAfter(new Date(link.expiresAt), new Date())) {
      return NextResponse.json({ error: "Link has expired" }, { status: 403 });
    }

    if (link.maxUsages && (link.usageCount ?? 0) >= link.maxUsages) {
      return NextResponse.json({ error: "Link usage limit reached" }, { status: 403 });
    }

    // Upload to R2
    const buffer = Buffer.from(await file.arrayBuffer());
    const r2Key = `${link.practiceId}/${link.clientId}/${Date.now()}-${file.name}`;
    await uploadDocument(r2Key, buffer, file.type);

    // Create document record
    const [doc] = await db.insert(clientDocuments).values({
      practiceId: link.practiceId,
      clientId: link.clientId,
      enrollmentId: link.enrollmentId,
      campaignId: null,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      r2Key,
      r2Bucket: process.env.R2_BUCKET_NAME || "chase-md-documents",
      status: "uploaded",
      uploadedVia: "portal",
      uploadedByIp: req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown",
    }).returning();

    // Update magic link usage count
    await db.update(magicLinks)
      .set({
        usageCount: (link.usageCount ?? 0) + 1,
        lastUsedAt: new Date(),
      })
      .where(eq(magicLinks.id, link.id));

    return NextResponse.json({
      success: true,
      document: {
        id: doc.id,
        fileName: doc.fileName,
        status: doc.status,
      },
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 },
    );
  }
}
