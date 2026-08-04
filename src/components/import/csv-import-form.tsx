"use client";

import { useState } from "react";
import { importCsvStatement } from "@/actions/import";
import { parseCsvContent } from "@/domain/adapters/csv-adapters";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload } from "lucide-react";

interface ImportResultState {
  success: boolean;
  importedRows: number;
  understoodCount: number;
  uncertainCount: number;
  duplicateRows: number;
}

interface CsvImportFormProps {
  accounts: Array<{ id: string; name: string }>;
}

export function CsvImportForm({ accounts }: CsvImportFormProps) {
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string[][]>([]);
  const [result, setResult] = useState<ImportResultState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileSelect(f: File) {
    setFile(f);
    setError(null);
    setResult(null);
    const text = await f.text();
    const rows = parseCsvContent(text).slice(0, 6);
    setPreview(rows);
  }

  async function handleImport() {
    if (!file || !accountId) return;
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("accountId", accountId);
    formData.append("csvContent", await file.text());
    formData.append("fileName", file.name);

    const res = await importCsvStatement(formData);
    setLoading(false);

    if ("error" in res && res.error) {
      setError(res.error);
    } else if ("success" in res && res.success) {
      setResult({
        success: true,
        importedRows: res.importedRows ?? 0,
        understoodCount: res.understoodCount ?? 0,
        uncertainCount: res.uncertainCount ?? 0,
        duplicateRows: res.duplicateRows ?? 0,
      });
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Import bank statement</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm text-zinc-400">Target account</label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm"
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
            <p className="text-xs text-zinc-500">
              Import each bank account into its own MyKhata account (e.g. Everyday vs Credit card).
            </p>
          </div>

          <label
            className="flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-zinc-700 p-8 hover:border-emerald-500/50"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files[0];
              if (f) handleFileSelect(f);
            }}
          >
            <Upload className="h-8 w-8 text-zinc-500" />
            <span className="text-sm text-zinc-400">
              Drag & drop CSV or click to browse
            </span>
            <input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileSelect(f);
              }}
            />
          </label>

          {file && (
            <p className="text-sm text-zinc-400">
              Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
            </p>
          )}

          {preview.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-zinc-800">
              <table className="w-full text-xs">
                <tbody>
                  {preview.map((row, i) => (
                    <tr key={i} className={i === 0 ? "bg-zinc-800/50 font-medium" : ""}>
                      {row.map((cell, j) => (
                        <td key={j} className="px-3 py-2 text-zinc-300 whitespace-nowrap">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}

          {result?.success && (
            <div className="rounded-xl bg-emerald-950/30 border border-emerald-500/20 p-4 text-sm">
              <p className="font-medium text-emerald-400">
                {result.importedRows} transactions imported.
              </p>
              <p className="text-zinc-400 mt-1">
                {result.understoodCount} understood.{" "}
                {result.uncertainCount} need your help.
              </p>
              {result.duplicateRows > 0 && (
                <p className="text-zinc-500 mt-1">
                  {result.duplicateRows} duplicates skipped.
                </p>
              )}
            </div>
          )}

          <Button
            onClick={handleImport}
            disabled={!file || !accountId || loading}
            className="w-full"
          >
            {loading ? "Importing..." : "Confirm import"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
