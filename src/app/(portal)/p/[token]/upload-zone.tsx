"use client";

import { useState, useCallback, useRef } from "react";

interface UploadedFile {
  id: string; // unique per upload, not per filename
  name: string;
  size: number;
  status: "uploading" | "complete" | "error";
}

let uploadCounter = 0;
function nextUploadId() {
  return `upload-${++uploadCounter}-${Date.now()}`;
}

export function UploadZone({ token }: { token: string }) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = useCallback(async (fileList: FileList) => {
    const uploads = Array.from(fileList).map((f) => ({
      file: f,
      entry: {
        id: nextUploadId(),
        name: f.name,
        size: f.size,
        status: "uploading" as const,
      },
    }));

    setFiles((prev) => [...prev, ...uploads.map((u) => u.entry)]);

    for (const { file, entry } of uploads) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("token", token);

      try {
        const res = await fetch("/api/portal/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) throw new Error("Upload failed");

        setFiles((prev) =>
          prev.map((f) =>
            f.id === entry.id ? { ...f, status: "complete" } : f
          )
        );
      } catch {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === entry.id ? { ...f, status: "error" } : f
          )
        );
      }
    }
  }, [token]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles]
  );

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-8 text-center transition cursor-pointer ${
          isDragging
            ? "border-blue-400 bg-blue-50"
            : "border-gray-300 hover:border-blue-400"
        }`}
        onClick={() => {
          const input = document.createElement("input");
          input.type = "file";
          input.multiple = true;
          input.accept = ".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.csv";
          input.onchange = (e) => {
            const target = e.target as HTMLInputElement;
            if (target.files) handleFiles(target.files);
          };
          input.click();
        }}
      >
        <div className="space-y-2">
          <div className="text-4xl">📄</div>
          <p className="text-gray-600 font-medium">
            {isDragging ? "Drop your files here" : "Tap to upload or drag files here"}
          </p>
          <p className="text-xs text-gray-400">
            PDF, JPG, PNG, Word, Excel — up to 10MB each
          </p>
        </div>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file) => (
            <div key={file.id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-lg">
                  {file.status === "complete" ? "✅" : file.status === "error" ? "❌" : "⏳"}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-gray-400">
                    {(file.size / 1024 / 1024).toFixed(1)} MB
                  </p>
                </div>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${
                file.status === "complete"
                  ? "bg-green-100 text-green-700"
                  : file.status === "error"
                  ? "bg-red-100 text-red-700"
                  : "bg-blue-100 text-blue-700"
              }`}>
                {file.status === "complete" ? "Uploaded" : file.status === "error" ? "Failed" : "Uploading..."}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
