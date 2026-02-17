"use client";

import { trpc } from "@/lib/trpc/client";

interface XeroPushStatusProps {
  documentId: string;
  status: "pending" | "pushed" | "failed" | "skipped" | null;
  error?: string | null;
  pushedAt?: Date | string | null;
}

export function XeroPushStatus({ documentId, status, error, pushedAt }: XeroPushStatusProps) {
  const utils = trpc.useUtils();
  const retryMutation = trpc.documents.retryXeroPush.useMutation({
    onSuccess: () => {
      void utils.documents.invalidate();
    },
  });

  if (!status || status === "skipped") return null;

  const icon = status === "pushed" ? "✅" : status === "pending" ? "⏳" : "❌";
  const label =
    status === "pushed"
      ? `Pushed to Xero${pushedAt ? ` at ${new Date(pushedAt).toLocaleDateString()}` : ""}`
      : status === "pending"
        ? "Xero push pending"
        : `Xero push failed${error ? `: ${error}` : ""}`;

  return (
    <span className="inline-flex items-center gap-1" title={label}>
      <span className="text-sm">{icon}</span>
      {status === "failed" && (
        <button
          className="text-xs text-blue-600 hover:underline disabled:opacity-50"
          onClick={() => retryMutation.mutate({ documentId })}
          disabled={retryMutation.isPending}
        >
          {retryMutation.isPending ? "Retrying…" : "Retry"}
        </button>
      )}
    </span>
  );
}
