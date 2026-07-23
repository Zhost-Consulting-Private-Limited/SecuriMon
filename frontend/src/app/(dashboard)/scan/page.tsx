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
  detectedAt: string;
}

export default function ScanPage() {
  const { servers, selected, setSelected, error: listError, token } = useServerList();
  const [findings, setFindings] = useState<Finding[] | null>(null);
  const [error, setError] = useState("");
  const [rescanning, setRescanning] = useState(false);
  const [justRequested, setJustRequested] = useState(false);

  const loadFindings = () => {
    if (!token || !selected) return;
    api
      .get<Finding[]>(`/v1/servers/${selected}/findings`, token)
      .then(setFindings)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Failed to load findings"));
  };

  useEffect(() => {
    setFindings(null);
    loadFindings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, selected]);

  const handleScan = async () => {
    if (!token || !selected) return;
    setRescanning(true);
    setError("");
    try {
      await api.post(`/v1/servers/${selected}/rescan`, {}, token);
      setJustRequested(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to request scan");
    } finally {
      setRescanning(false);
    }
  };

  const failed = findings?.filter((f) => !f.passed) ?? [];
  const passed = findings?.filter((f) => f.passed) ?? [];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900">Security Scans</h1>
          <p className="text-gray-600 mt-1">Run an on-demand scan and review the latest hardening findings</p>
        </div>
      </div>

      {(listError || error) && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{listError || error}</div>
      )}

      {servers && servers.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          No servers yet. Install the agent on a server before running a scan.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Run a Scan</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Server</label>
                <select
                  value={selected}
                  onChange={(e) => {
                    setSelected(e.target.value);
                    setJustRequested(false);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {servers?.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.hostname}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-sm text-gray-500">
                Triggers the agent's security hardening scan immediately (it also runs automatically every hour).
              </p>
              <button
                onClick={handleScan}
                disabled={rescanning || !selected}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {rescanning ? "Requesting..." : "Run Scan Now"}
              </button>
              {justRequested && (
                <p className="text-sm text-green-600">
                  Scan requested. Results will appear on the right once the agent reports back (usually within a few
                  seconds if it's online).
                </p>
              )}
              <button onClick={loadFindings} className="text-sm text-blue-600 hover:text-blue-800">
                Refresh results
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">Latest Findings</h2>
              {findings && (
                <span className="text-sm text-gray-500">
                  {failed.length} open · {passed.length} passed
                </span>
              )}
            </div>
            {findings === null ? (
              <div className="p-8 text-center text-gray-500">Loading...</div>
            ) : findings.length === 0 ? (
              <div className="p-6 text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">📋</div>
                <p>No scan results yet</p>
                <p className="text-sm mt-1">Run a scan to see results here</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                {findings.map((f) => (
                  <div key={f.id} className="px-6 py-3 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{f.ruleId}</div>
                      <div className="text-xs text-gray-500">{f.category}</div>
                    </div>
                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded-full ${
                        f.passed ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                      }`}
                    >
                      {f.passed ? "Passed" : f.severity}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
