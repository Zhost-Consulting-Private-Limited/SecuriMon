"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "../../../context/AuthContext";
import { api, ApiError } from "../../../lib/api";

interface ServerScore {
  overallScore: number | null;
  securityScore: number | null;
  healthScore: number | null;
}

interface ServerSummary {
  id: string;
  hostname: string;
  status: string;
  cpuPercent?: number;
  ramPercent?: number;
  latestScore: ServerScore | null;
}

export default function DashboardPage() {
  const { token } = useAuth();
  const [servers, setServers] = useState<ServerSummary[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    api
      .get<ServerSummary[]>("/v1/servers", token)
      .then(setServers)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load servers"));
  }, [token]);

  const total = servers?.length ?? 0;
  const online = servers?.filter((s) => s.status === "online").length ?? 0;
  const offline = servers?.filter((s) => s.status === "offline").length ?? 0;
  const pending = total - online - offline;
  const scored = servers?.filter((s) => s.latestScore?.overallScore != null) ?? [];
  const avgHealth = scored.length
    ? Math.round(scored.reduce((sum, s) => sum + (s.latestScore!.overallScore ?? 0), 0) / scored.length)
    : null;
  const avgSecurity = scored.length
    ? Math.round(
        scored.reduce((sum, s) => sum + (s.latestScore!.securityScore ?? s.latestScore!.overallScore ?? 0), 0) /
          scored.length
      )
    : null;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">Overview of your secure infrastructure</p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Servers</h3>
          <p className="mt-2 text-3xl font-semibold text-gray-900">{total}</p>
          <p className="mt-2 text-sm text-gray-500">
            {online} online, {pending} pending, {offline} offline
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Average Health</h3>
          <p className="mt-2 text-3xl font-semibold text-gray-900">{avgHealth != null ? `${avgHealth}%` : "—"}</p>
          <p className="mt-2 text-sm text-gray-500">{scored.length ? "Based on latest scan" : "No scans yet"}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Security Score</h3>
          <p className="mt-2 text-3xl font-semibold text-green-600">{avgSecurity != null ? `${avgSecurity}%` : "—"}</p>
          <p className="mt-2 text-sm text-gray-500">{scored.length ? "Across scanned servers" : "No scans yet"}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Servers Needing Attention</h3>
          <p className="mt-2 text-3xl font-semibold text-gray-900">{offline + pending}</p>
          <p className="mt-2 text-sm text-orange-600">Offline or awaiting first check-in</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Server Overview</h2>
        </div>

        {servers === null && !error ? (
          <div className="p-8 text-center text-gray-500">Loading servers...</div>
        ) : servers && servers.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No servers yet.{" "}
            <Link href="/servers" className="text-blue-600 hover:text-blue-500 font-medium">
              Install the agent on your first server
            </Link>{" "}
            to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Server</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Health Score</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Security Score</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {servers?.map((server) => (
                  <tr key={server.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-700">
                              {server.hostname[0]?.toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{server.hostname}</div>
                          <div className="text-sm text-gray-500">ID: {server.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          server.status === "online"
                            ? "bg-green-100 text-green-800"
                            : server.status === "pending"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {server.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {server.latestScore?.overallScore != null ? `${server.latestScore.overallScore}%` : "—"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {server.latestScore?.securityScore != null ? `${server.latestScore.securityScore}%` : "—"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link href={`/servers/${server.id}`} className="text-blue-600 hover:text-blue-900">
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
