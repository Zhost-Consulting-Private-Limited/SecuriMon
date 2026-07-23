"use client";

import { useEffect, useState } from "react";
import { useServerList } from "../../../lib/useServerList";
import { api, ApiError } from "../../../lib/api";

interface Finding {
  id: string;
  ruleId: string;
  category: string;
  severity: string;
  passed: boolean;
  status: string;
}

interface ComplianceReport {
  id: string;
  framework: string;
  score: number | null;
  pdfUrl: string | null;
  generatedAt: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function CompliancePage() {
  const { servers, selected, setSelected, error: listError, token } = useServerList();
  const [findings, setFindings] = useState<Finding[] | null>(null);
  const [reports, setReports] = useState<ComplianceReport[] | null>(null);
  const [error, setError] = useState("");
  const [generating, setGenerating] = useState(false);

  const load = () => {
    if (!token || !selected) return;
    api
      .get<Finding[]>(`/v1/servers/${selected}/findings`, token)
      .then(setFindings)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Failed to load findings"));
    api
      .get<ComplianceReport[]>(`/v1/servers/${selected}/compliance`, token)
      .then(setReports)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Failed to load reports"));
  };

  useEffect(() => {
    setFindings(null);
    setReports(null);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, selected]);

  const handleGenerate = async () => {
    if (!token || !selected) return;
    setGenerating(true);
    setError("");
    try {
      await api.post(`/v1/servers/${selected}/compliance/report`, {}, token);
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to generate report");
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async (report: ComplianceReport) => {
    if (!token || !report.pdfUrl) return;
    try {
      const res = await fetch(`${API_URL}${report.pdfUrl}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Download failed (HTTP ${res.status})`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `vigilon-compliance-${report.id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to download report");
    }
  };

  const passed = findings?.filter((f) => f.passed).length ?? 0;
  const total = findings?.length ?? 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Compliance</h1>
          <p className="text-gray-600 mt-1">CIS Linux Benchmark status (v1 — partial control coverage)</p>
        </div>
        {servers && servers.length > 0 && (
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            {servers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.hostname}
              </option>
            ))}
          </select>
        )}
      </div>

      {(listError || error) && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{listError || error}</div>
      )}

      {servers && servers.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          No servers yet. Install the agent on a server before generating a compliance report.
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow p-6 flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500">Current CIS control status</div>
              <div className="text-2xl font-semibold text-gray-900 mt-1">
                {total > 0 ? `${passed}/${total} passing` : "No scans yet"}
              </div>
            </div>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="bg-blue-600 text-white text-sm px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {generating ? "Generating..." : "Generate PDF Report"}
            </button>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Current Findings</h2>
            </div>
            {findings === null ? (
              <div className="p-8 text-center text-gray-500">Loading...</div>
            ) : findings.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No findings yet — run a scan first.</div>
            ) : (
              <div className="divide-y divide-gray-200">
                {findings.map((f) => (
                  <div key={f.id} className="px-6 py-3 flex items-center justify-between">
                    <div className="text-sm font-medium text-gray-900">{f.ruleId}</div>
                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded-full ${
                        f.passed ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                      }`}
                    >
                      {f.passed ? "PASS" : "FAIL"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Past Reports</h2>
            </div>
            {reports === null ? (
              <div className="p-8 text-center text-gray-500">Loading...</div>
            ) : reports.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No reports generated yet.</div>
            ) : (
              <div className="divide-y divide-gray-200">
                {reports.map((r) => (
                  <div key={r.id} className="px-6 py-3 flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      {new Date(r.generatedAt).toLocaleString()} — {r.framework.toUpperCase()}
                      {r.score != null ? ` (${r.score}%)` : ""}
                    </div>
                    <button
                      onClick={() => handleDownload(r)}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Download PDF
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
