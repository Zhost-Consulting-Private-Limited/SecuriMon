"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { api, ApiError } from "../../../lib/api";

interface LogEvent {
  timestamp: string;
  level: string;
  source: string;
  message: string;
}

interface AIResponse {
  answer: string;
  citations: { type: string; metric?: string; title?: string }[];
}

interface LogDigest {
  date: string;
  totalEntries: number;
  threatsCount: number;
  findingsCount: number;
  aiInsights: string[];
  summary: string;
  keyEvents: LogEvent[];
  aiAnalysis?: AIResponse;
}

interface ServerDigest {
  serverId: string;
  hostname: string;
  digest: LogDigest;
}

interface TenantDigestResponse {
  date: string;
  tenantSummary: { totalServers: number; totalEvents: number; totalThreats: number; totalFindings: number };
  serverDigests: ServerDigest[];
}

function todayIso() {
  return new Date().toISOString().split("T")[0];
}

export default function DigestPage() {
  const { token } = useAuth();
  const [date, setDate] = useState(todayIso());
  const [data, setData] = useState<TenantDigestResponse | null>(null);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    setData(null);
    api
      .get<TenantDigestResponse>(`/v1/ai/digest/tenant?date=${date}`, token)
      .then(setData)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Failed to load digest"));
  }, [token, date]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Daily Digest</h1>
          <p className="text-gray-600 mt-1">Plain-English summary of what happened across your fleet</p>
        </div>
        <input
          type="date"
          value={date}
          max={todayIso()}
          onChange={(e) => setDate(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm"
        />
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>}

      {data === null && !error ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">Loading...</div>
      ) : data ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <SummaryCard label="Servers" value={data.tenantSummary.totalServers} />
            <SummaryCard label="Total Events" value={data.tenantSummary.totalEvents} />
            <SummaryCard label="Threats" value={data.tenantSummary.totalThreats} />
            <SummaryCard label="Findings" value={data.tenantSummary.totalFindings} />
          </div>

          {data.serverDigests.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
              No servers yet — install the agent to start generating daily digests.
            </div>
          ) : (
            <div className="space-y-4">
              {data.serverDigests.map((sd) => (
                <div key={sd.serverId} className="bg-white rounded-lg shadow overflow-hidden">
                  <button
                    onClick={() => setExpanded(expanded === sd.serverId ? null : sd.serverId)}
                    className="w-full text-left px-6 py-4 flex items-center justify-between hover:bg-gray-50"
                  >
                    <div>
                      <div className="text-sm font-semibold text-gray-900">{sd.hostname}</div>
                      <div className="text-sm text-gray-500 mt-1">{sd.digest.summary}</div>
                    </div>
                    <span className="text-gray-400 text-sm">{expanded === sd.serverId ? "▲" : "▼"}</span>
                  </button>
                  {expanded === sd.serverId && (
                    <div className="px-6 pb-6 border-t border-gray-100 pt-4 space-y-4">
                      {sd.digest.aiInsights.length > 0 && (
                        <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                          {sd.digest.aiInsights.map((insight, i) => (
                            <li key={i}>{insight}</li>
                          ))}
                        </ul>
                      )}
                      {sd.digest.aiAnalysis && (
                        <div className="bg-indigo-50 rounded-md p-4 text-sm text-gray-700 whitespace-pre-wrap">
                          {sd.digest.aiAnalysis.answer}
                        </div>
                      )}
                      {sd.digest.keyEvents.length > 0 && (
                        <div>
                          <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Key Events</div>
                          <div className="space-y-1">
                            {sd.digest.keyEvents.slice(0, 10).map((ev, i) => (
                              <div key={i} className="text-xs text-gray-600">
                                <span className="font-medium">{ev.level}</span> — {ev.message}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-gray-900">{value}</div>
    </div>
  );
}
