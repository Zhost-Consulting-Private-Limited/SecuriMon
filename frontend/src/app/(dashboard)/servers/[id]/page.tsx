"use client";

import { useEffect, useState, use as usePromise } from "react";
import { useAuth } from "../../../../context/AuthContext";
import { api, ApiError } from "../../../../lib/api";

interface ServerDetail {
  id: string;
  hostname: string;
  os: string | null;
  osVersion: string | null;
  status: string;
  publicIp: string | null;
  privateIp: string | null;
  lastSeenAt: string | null;
  latestScore: {
    overallScore: number | null;
    securityScore: number | null;
    healthScore: number | null;
  } | null;
  latestScan: { riskScore: number | null; completedAt: string | null } | null;
}

interface Finding {
  id: string;
  ruleId: string;
  category: string;
  severity: string;
  passed: boolean;
  autoFixable: boolean;
  status: string;
  businessImpactText: string | null;
  recommendedAction: string | null;
}

interface ThreatEvent {
  id: string;
  eventType: string;
  severity: string;
  sourceIp: string | null;
  detail: string | null;
  occurredAt: string;
}

interface TimelineEvent {
  id: string;
  eventCategory: string;
  title: string;
  description: string | null;
  occurredAt: string;
}

interface ApplicationRow {
  id: string;
  name: string;
  managerType: string;
  status: string | null;
  port: number | null;
}

interface ServerConfig {
  fimWatchPaths: string[];
  logSources: string[];
}

interface AISuggestion {
  loading: boolean;
  answer?: string;
  citations?: { type: string; metric?: string; title?: string }[];
  error?: string;
}

type Tab = "overview" | "security" | "threats" | "timeline" | "applications" | "configuration";

export default function ServerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = usePromise(params);
  const { token } = useAuth();
  const [tab, setTab] = useState<Tab>("overview");

  const [server, setServer] = useState<ServerDetail | null>(null);
  const [findings, setFindings] = useState<Finding[] | null>(null);
  const [threats, setThreats] = useState<ThreatEvent[] | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[] | null>(null);
  const [applications, setApplications] = useState<ApplicationRow[] | null>(null);
  const [config, setConfig] = useState<ServerConfig | null>(null);
  const [fimPathsText, setFimPathsText] = useState("");
  const [logSourcesText, setLogSourcesText] = useState("");
  const [savingConfig, setSavingConfig] = useState(false);
  const [error, setError] = useState("");
  const [rescanning, setRescanning] = useState(false);
  const [fixingId, setFixingId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Record<string, AISuggestion>>({});

  useEffect(() => {
    if (!token) return;
    api.get<ServerDetail>(`/v1/servers/${id}`, token).then(setServer).catch((e) => setError(describe(e)));
  }, [token, id]);

  useEffect(() => {
    if (!token) return;
    if (tab === "security" && findings === null) {
      api.get<Finding[]>(`/v1/servers/${id}/findings`, token).then(setFindings).catch((e) => setError(describe(e)));
    }
    if (tab === "threats" && threats === null) {
      api.get<ThreatEvent[]>(`/v1/servers/${id}/threats`, token).then(setThreats).catch((e) => setError(describe(e)));
    }
    if (tab === "timeline" && timeline === null) {
      api.get<TimelineEvent[]>(`/v1/servers/${id}/timeline`, token).then(setTimeline).catch((e) => setError(describe(e)));
    }
    if (tab === "applications" && applications === null) {
      api.get<ApplicationRow[]>(`/v1/servers/${id}/applications`, token).then(setApplications).catch((e) => setError(describe(e)));
    }
    if (tab === "configuration" && config === null) {
      api
        .get<ServerConfig>(`/v1/servers/${id}/config`, token)
        .then((cfg) => {
          setConfig(cfg);
          setFimPathsText((cfg.fimWatchPaths ?? []).join("\n"));
          setLogSourcesText((cfg.logSources ?? []).join("\n"));
        })
        .catch((e) => setError(describe(e)));
    }
  }, [tab, token, id, findings, threats, timeline, applications, config]);

  const handleSaveConfig = async () => {
    if (!token) return;
    setSavingConfig(true);
    setError("");
    const fimWatchPaths = fimPathsText
      .split("\n")
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
    const logSources = logSourcesText
      .split("\n")
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
    try {
      const updated = await api.put<ServerConfig>(`/v1/servers/${id}/config`, { fimWatchPaths, logSources }, token);
      setConfig(updated);
    } catch (e) {
      setError(describe(e));
    } finally {
      setSavingConfig(false);
    }
  };

  const handleRescan = async () => {
    if (!token) return;
    setRescanning(true);
    setError("");
    try {
      await api.post(`/v1/servers/${id}/rescan`, {}, token);
    } catch (e) {
      setError(describe(e));
    } finally {
      setRescanning(false);
    }
  };

  const handleSuggestFix = async (findingId: string) => {
    if (!token) return;
    // Collapse if already open with a result; otherwise (re-)fetch. No caching across
    // page loads this batch - each expand re-calls the AI, a known limitation.
    if (suggestions[findingId] && !suggestions[findingId].loading) {
      setSuggestions((prev) => {
        const next = { ...prev };
        delete next[findingId];
        return next;
      });
      return;
    }

    setSuggestions((prev) => ({ ...prev, [findingId]: { loading: true } }));
    try {
      const res = await api.post<{ answer: string; citations: AISuggestion["citations"] }>(
        `/v1/servers/${id}/findings/${findingId}/suggest-fix`,
        {},
        token
      );
      setSuggestions((prev) => ({ ...prev, [findingId]: { loading: false, answer: res.answer, citations: res.citations } }));
    } catch (e) {
      setSuggestions((prev) => ({ ...prev, [findingId]: { loading: false, error: describe(e) } }));
    }
  };

  const handleFix = async (findingId: string) => {
    if (!token) return;
    setFixingId(findingId);
    setError("");
    try {
      await api.post(`/v1/servers/${id}/findings/${findingId}/fix`, {}, token);
      setFindings((prev) => prev?.map((f) => (f.id === findingId ? { ...f, status: "fix_pending" } : f)) ?? null);
    } catch (e) {
      setError(describe(e));
    } finally {
      setFixingId(null);
    }
  };

  if (!server && !error) {
    return <div className="p-8 text-center text-gray-500">Loading server...</div>;
  }
  if (!server) {
    return <div className="p-8 text-center text-red-600">{error}</div>;
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "security", label: "Security Findings" },
    { key: "threats", label: "Threats" },
    { key: "timeline", label: "Timeline" },
    { key: "applications", label: "Applications" },
    { key: "configuration", label: "Configuration" },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="bg-white rounded-lg shadow p-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{server.hostname}</h1>
          <p className="text-gray-600 mt-1">
            {server.os ?? "Unknown OS"} {server.osVersion ?? ""} · {server.publicIp ?? "no public IP"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
              server.status === "online"
                ? "bg-green-100 text-green-800"
                : server.status === "pending"
                ? "bg-yellow-100 text-yellow-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {server.status}
          </span>
          <button
            onClick={handleRescan}
            disabled={rescanning}
            className="bg-blue-600 text-white text-sm px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {rescanning ? "Requesting..." : "Rescan Now"}
          </button>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>}

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-6">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`py-3 px-1 border-b-2 text-sm font-medium ${
                tab === t.key ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {tab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ScoreCard label="Overall" value={server.latestScore?.overallScore} />
          <ScoreCard label="Security" value={server.latestScore?.securityScore} />
          <ScoreCard label="Health" value={server.latestScore?.healthScore} />
        </div>
      )}

      {tab === "security" && (
        <ListPanel
          items={findings}
          empty="No security findings yet. Run a scan to check this server's hardening posture."
          render={(f: Finding) => {
            const suggestion = suggestions[f.id];
            return (
              <div key={f.id}>
                <div className="px-6 py-4 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{f.ruleId}</div>
                    <div className="text-sm text-gray-500 mt-1">{f.businessImpactText ?? f.recommendedAction ?? f.category}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <SeverityBadge severity={f.severity} />
                    {!f.passed && f.status === "open" && f.autoFixable && (
                      <button
                        onClick={() => handleFix(f.id)}
                        disabled={fixingId === f.id}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium disabled:opacity-50"
                      >
                        {fixingId === f.id ? "Fixing..." : "One-click Fix"}
                      </button>
                    )}
                    {!f.passed && f.status === "open" && !f.autoFixable && (
                      <button
                        onClick={() => handleSuggestFix(f.id)}
                        disabled={suggestion?.loading}
                        className="text-indigo-600 hover:text-indigo-800 text-sm font-medium disabled:opacity-50"
                      >
                        {suggestion?.loading
                          ? "Asking AI..."
                          : suggestion
                          ? "Hide Suggestion"
                          : "AI Suggested Fix"}
                      </button>
                    )}
                    {f.status !== "open" && <span className="text-xs text-gray-400">{f.status}</span>}
                  </div>
                </div>
                {suggestion && !suggestion.loading && (
                  <div className="px-6 pb-4">
                    {suggestion.error ? (
                      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
                        {suggestion.error}
                      </div>
                    ) : (
                      <div className="bg-indigo-50 rounded-md p-4 text-sm text-gray-700 whitespace-pre-wrap">
                        {suggestion.answer}
                        {suggestion.citations && suggestion.citations.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-indigo-100 flex flex-wrap gap-2">
                            {suggestion.citations.map((c, i) => (
                              <span key={i} className="text-xs px-2 py-1 rounded-full bg-white text-gray-600">
                                {c.type}
                                {c.title ? `: ${c.title}` : ""}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          }}
        />
      )}

      {tab === "threats" && (
        <ListPanel
          items={threats}
          empty="No threats detected on this server."
          render={(t: ThreatEvent) => (
            <div key={t.id} className="px-6 py-4 flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-900">{t.eventType.replace(/_/g, " ")}</div>
                <div className="text-sm text-gray-500 mt-1">
                  {t.sourceIp ? `Source: ${t.sourceIp} · ` : ""}
                  {new Date(t.occurredAt).toLocaleString()}
                </div>
              </div>
              <SeverityBadge severity={t.severity} />
            </div>
          )}
        />
      )}

      {tab === "timeline" && (
        <ListPanel
          items={timeline}
          empty="No events recorded yet."
          render={(e: TimelineEvent) => (
            <div key={e.id} className="px-6 py-4">
              <div className="text-sm font-medium text-gray-900">{e.title}</div>
              <div className="text-sm text-gray-500 mt-1">
                {e.description} · {new Date(e.occurredAt).toLocaleString()}
              </div>
            </div>
          )}
        />
      )}

      {tab === "applications" && (
        <ListPanel
          items={applications}
          empty="No applications discovered yet."
          render={(a: ApplicationRow) => (
            <div key={a.id} className="px-6 py-4 flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-900">{a.name}</div>
                <div className="text-sm text-gray-500 mt-1">
                  {a.managerType}
                  {a.port ? ` · port ${a.port}` : ""}
                </div>
              </div>
              <span className="text-sm text-gray-700">{a.status ?? "unknown"}</span>
            </div>
          )}
        />
      )}

      {tab === "configuration" && (
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <div>
            <h2 className="text-lg font-medium text-gray-900">File Integrity Monitoring watch paths</h2>
            <p className="text-sm text-gray-500 mt-1">
              One file path per line. Leave empty to use the defaults (common nginx/Apache config paths). Changes
              reach the agent within about an hour, on its next scheduled scan.
            </p>
          </div>
          {config === null ? (
            <div className="text-center text-gray-500 py-8">Loading...</div>
          ) : (
            <>
              <textarea
                value={fimPathsText}
                onChange={(e) => setFimPathsText(e.target.value)}
                rows={8}
                placeholder={"/etc/nginx/nginx.conf\n/etc/myapp/config.yaml"}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-mono"
              />

              <div className="pt-2">
                <h2 className="text-lg font-medium text-gray-900">Log sources to tail</h2>
                <p className="text-sm text-gray-500 mt-1">
                  One file path or glob per line (e.g. <code>/var/log/nginx/*.log</code>). ERROR/WARNING lines are
                  surfaced in the server timeline and the daily Log Intelligence digest. New sources are picked up
                  within about an hour; removing a source here takes effect on the agent&apos;s next restart.
                </p>
              </div>
              <textarea
                value={logSourcesText}
                onChange={(e) => setLogSourcesText(e.target.value)}
                rows={6}
                placeholder={"/var/log/nginx/*.log\n/var/log/myapp/app.log"}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-mono"
              />

              <button
                onClick={handleSaveConfig}
                disabled={savingConfig}
                className="bg-blue-600 text-white text-sm px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {savingConfig ? "Saving..." : "Save Configuration"}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function describe(e: unknown) {
  return e instanceof ApiError ? e.message : "Failed to load data";
}

function ScoreCard({ label, value }: { label: string; value: number | null | undefined }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">{label}</h3>
      <p className="mt-2 text-3xl font-semibold text-gray-900">{value != null ? `${value}%` : "—"}</p>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const cls =
    severity === "CRITICAL" || severity === "HIGH"
      ? "bg-red-100 text-red-800"
      : severity === "MEDIUM"
      ? "bg-yellow-100 text-yellow-800"
      : "bg-green-100 text-green-800";
  return <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${cls}`}>{severity}</span>;
}

function ListPanel<T>({ items, empty, render }: { items: T[] | null; empty: string; render: (item: T) => React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {items === null ? (
        <div className="p-8 text-center text-gray-500">Loading...</div>
      ) : items.length === 0 ? (
        <div className="p-8 text-center text-gray-500">{empty}</div>
      ) : (
        <div className="divide-y divide-gray-200">{items.map(render)}</div>
      )}
    </div>
  );
}
