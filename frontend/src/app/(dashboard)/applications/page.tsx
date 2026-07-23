"use client";

import { useEffect, useState } from "react";
import { useServerList } from "../../../lib/useServerList";
import { api, ApiError } from "../../../lib/api";

interface ApplicationRow {
  id: string;
  name: string;
  managerType: string;
  status: string | null;
  port: number | null;
  version: string | null;
  restartCount24h: number;
}

export default function ApplicationsPage() {
  const { servers, selected, setSelected, error: listError, token } = useServerList();
  const [applications, setApplications] = useState<ApplicationRow[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token || !selected) return;
    setApplications(null);
    api
      .get<ApplicationRow[]>(`/v1/servers/${selected}/applications`, token)
      .then(setApplications)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Failed to load applications"));
  }, [token, selected]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Applications</h1>
            <p className="text-gray-600 mt-1">Services and processes discovered on your servers</p>
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
      </div>

      {(listError || error) && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{listError || error}</div>
      )}

      {servers && servers.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          No servers yet. Install the agent on a server to see its running services here.
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {applications === null ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : applications.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No applications discovered on this server yet. The agent reports running systemd services every 5
              minutes.
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Manager</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Port</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Restarts (24h)</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {applications.map((a) => (
                  <tr key={a.id}>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{a.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{a.managerType}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{a.status ?? "unknown"}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{a.port ?? "—"}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{a.restartCount24h}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
