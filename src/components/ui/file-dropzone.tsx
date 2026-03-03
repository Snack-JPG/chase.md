"use client";

import { cn } from "@/lib/utils";
import { Upload, FileText, X, Check } from "lucide-react";
import { useCallback, useState } from "react";

interface FileDropzoneProps {
  onFileDrop: (file: File) => void;
  accept?: string[];
  maxSizeMb?: number;
  uploading?: boolean;
  uploadProgress?: number;
  uploaded?: boolean;
  fileName?: string;
  onRemove?: () => void;
  className?: string;
}

export function FileDropzone({
  onFileDrop,
  accept = [".pdf", ".jpg", ".jpeg", ".png"],
  maxSizeMb = 10,
  uploading = false,
  uploadProgress = 0,
  uploaded = false,
  fileName,
  onRemove,
  className,
}: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setError(null);

    const file = e.dataTransfer.files[0];
    if (file) validateAndDrop(file);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (file) validateAndDrop(file);
  }, []);

  function validateAndDrop(file: File) {
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!accept.includes(ext)) {
      setError(`Invalid file type. Accepted: ${accept.join(", ")}`);
      return;
    }
    if (file.size > maxSizeMb * 1024 * 1024) {
      setError(`File too large. Max ${maxSizeMb}MB.`);
      return;
    }
    onFileDrop(file);
  }

  if (uploaded && fileName) {
    return (
      <div className={cn("flex items-center gap-3 rounded-lg border border-status-active/30 bg-status-active/5 px-4 py-3", className)}>
        <Check className="w-4 h-4 text-status-active shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium text-foreground truncate">{fileName}</p>
          <p className="text-[11px] text-status-active">Uploaded</p>
        </div>
        {onRemove && (
          <button onClick={onRemove} className="p-1 rounded hover:bg-muted transition-colors" aria-label="Remove file">
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        )}
      </div>
    );
  }

  if (uploading) {
    return (
      <div className={cn("rounded-lg border bg-card px-4 py-3", className)}>
        <div className="flex items-center gap-3">
          <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] text-foreground truncate">{fileName ?? "Uploading..."}</p>
            <div className="mt-1.5 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
          <span className="text-[12px] text-muted-foreground font-mono">{uploadProgress}%</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      <label
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 cursor-pointer transition-all duration-fast",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50 hover:bg-muted/50",
          className
        )}
      >
        <Upload className={cn("w-6 h-6", isDragging ? "text-primary" : "text-muted-foreground")} />
        <div className="text-center">
          <p className="text-[13px] font-medium text-foreground">
            {isDragging ? "Drop file here" : "Drag & drop file here"}
          </p>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            or click to browse &middot; {accept.join(", ")} up to {maxSizeMb}MB
          </p>
        </div>
        <input
          type="file"
          accept={accept.join(",")}
          onChange={handleFileInput}
          className="sr-only"
        />
      </label>
      {error && (
        <p className="text-[12px] text-destructive mt-1.5">{error}</p>
      )}
    </div>
  );
}
