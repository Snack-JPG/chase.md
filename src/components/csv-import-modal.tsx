"use client";

import { useState, useCallback } from "react";
import Papa from "papaparse";
import { trpc } from "@/lib/trpc/client";

type ParsedClient = {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  companyName?: string;
  clientType: "sole_trader" | "limited_company" | "partnership" | "llp" | "trust" | "individual";
};

type ValidationError = { row: number; message: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/[_\-\s]+/g, "");
}

function resolveField(normalized: string): keyof ParsedClient | null {
  const map: Record<string, keyof ParsedClient> = {
    name: "firstName", // handled specially
    firstname: "firstName",
    first: "firstName",
    lastname: "lastName",
    last: "lastName",
    surname: "lastName",
    email: "email",
    emailaddress: "email",
    phone: "phone",
    phonenumber: "phone",
    telephone: "phone",
    mobile: "phone",
    company: "companyName",
    companyname: "companyName",
    organisation: "companyName",
    organization: "companyName",
    type: "clientType",
    clienttype: "clientType",
  };
  return map[normalized] ?? null;
}

export function CsvImportModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [step, setStep] = useState<"upload" | "preview" | "importing" | "done">("upload");
  const [parsed, setParsed] = useState<ParsedClient[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [result, setResult] = useState<{ created: number; skipped: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const bulkCreate = trpc.clients.bulkCreate.useMutation({
    onSuccess: (data) => {
      setResult(data);
      setStep("done");
    },
    onError: (err) => {
      setError(err.message);
      setStep("preview");
    },
  });

  const handleFile = useCallback((file: File) => {
    setError(null);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (!results.data || results.data.length === 0) {
          setError("CSV is empty or has no data rows");
          return;
        }

        const headers = results.meta.fields ?? [];
        const headerMap: Record<string, string> = {};
        let hasNameCol = false;
        for (const h of headers) {
          const norm = normalizeHeader(h);
          const field = resolveField(norm);
          if (norm === "name") hasNameCol = true;
          if (field) headerMap[h] = field === "firstName" && norm === "name" ? "__name__" : field;
        }

        const clients: ParsedClient[] = [];
        const errors: ValidationError[] = [];

        for (let i = 0; i < results.data.length; i++) {
          const row = results.data[i] as Record<string, string>;
          const client: Partial<ParsedClient> = { clientType: "individual" };

          for (const [csvHeader, value] of Object.entries(row)) {
            const mapped = headerMap[csvHeader];
            if (!mapped || !value?.trim()) continue;
            const v = value.trim();

            if (mapped === "__name__") {
              const parts = v.split(/\s+/);
              client.firstName = parts[0];
              client.lastName = parts.slice(1).join(" ") || parts[0];
            } else {
              (client as Record<string, string>)[mapped] = v;
            }
          }

          if (!client.firstName && !client.lastName) {
            errors.push({ row: i + 2, message: "Missing name" });
            continue;
          }
          if (!client.firstName) client.firstName = "";
          if (!client.lastName) client.lastName = client.firstName;

          if (client.email && !EMAIL_RE.test(client.email)) {
            errors.push({ row: i + 2, message: `Invalid email: ${client.email}` });
            continue;
          }

          clients.push(client as ParsedClient);
        }

        setParsed(clients);
        setValidationErrors(errors);
        setStep("preview");
      },
      error: (err) => setError(`Parse error: ${err.message}`),
    });
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.name.endsWith(".csv")) handleFile(file);
    else setError("Please drop a .csv file");
  }, [handleFile]);

  const handleImport = () => {
    setStep("importing");
    setError(null);
    bulkCreate.mutate({ clients: parsed });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="csv-import-title">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 id="csv-import-title" className="text-lg font-bold">Import Clients from CSV</h2>
          <button onClick={onClose} aria-label="Close dialog" className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {error && (
            <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{error}</div>
          )}

          {/* Upload */}
          {step === "upload" && (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-blue-400 transition-colors"
            >
              <div className="text-4xl mb-3">📄</div>
              <p className="text-gray-700 font-medium">Drop a CSV file here</p>
              <p className="text-sm text-gray-500 mt-1">or click to browse</p>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                className="absolute inset-0 opacity-0 cursor-pointer"
                style={{ position: "relative", marginTop: "12px" }}
              />
              <p className="text-xs text-gray-400 mt-4">
                Expected columns: name (or first name + last name), email, phone, company
              </p>
            </div>
          )}

          {/* Preview */}
          {(step === "preview" || step === "importing") && (
            <>
              <div className="flex items-center gap-4 text-sm">
                <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-medium">
                  {parsed.length} clients ready
                </span>
                {validationErrors.length > 0 && (
                  <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full font-medium">
                    {validationErrors.length} rows skipped
                  </span>
                )}
              </div>

              {validationErrors.length > 0 && (
                <details className="text-sm">
                  <summary className="cursor-pointer text-amber-600 font-medium">
                    Show skipped rows
                  </summary>
                  <ul className="mt-2 space-y-1 text-gray-600">
                    {validationErrors.map((e, i) => (
                      <li key={i}>Row {e.row}: {e.message}</li>
                    ))}
                  </ul>
                </details>
              )}

              <div className="border rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium text-gray-500">Name</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-500">Email</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-500">Phone</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-500">Company</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {parsed.slice(0, 50).map((c, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-3 py-2">{c.firstName} {c.lastName}</td>
                        <td className="px-3 py-2 text-gray-500">{c.email || "—"}</td>
                        <td className="px-3 py-2 text-gray-500">{c.phone || "—"}</td>
                        <td className="px-3 py-2 text-gray-500">{c.companyName || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parsed.length > 50 && (
                  <p className="text-xs text-gray-400 text-center py-2">
                    Showing first 50 of {parsed.length} rows
                  </p>
                )}
              </div>
            </>
          )}

          {/* Done */}
          {step === "done" && result && (
            <div className="text-center py-8">
              <div className="text-5xl mb-4">✅</div>
              <p className="text-lg font-bold text-gray-900">Import Complete</p>
              <div className="mt-3 space-y-1 text-sm text-gray-600">
                <p><span className="font-semibold text-green-700">{result.created}</span> clients created</p>
                {result.skipped > 0 && (
                  <p><span className="font-semibold text-amber-600">{result.skipped}</span> duplicates skipped</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex justify-end gap-3">
          {step === "done" ? (
            <button
              onClick={() => { onSuccess(); onClose(); }}
              className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-500 text-sm font-medium"
            >
              Done
            </button>
          ) : (
            <>
              <button onClick={onClose} className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium">
                Cancel
              </button>
              {step === "preview" && (
                <button onClick={() => { setParsed([]); setValidationErrors([]); setStep("upload"); }}
                  className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium">
                  Choose Different File
                </button>
              )}
              {(step === "preview" || step === "importing") && (
                <button
                  onClick={handleImport}
                  disabled={step === "importing" || parsed.length === 0}
                  className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-500 text-sm font-medium disabled:opacity-50"
                >
                  {step === "importing" ? "Importing..." : `Import ${parsed.length} Clients`}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
