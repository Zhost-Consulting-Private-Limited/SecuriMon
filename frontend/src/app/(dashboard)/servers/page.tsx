"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "../../../context/AuthContext";
import { api, ApiError } from "../../../lib/api";

interface ServerSummary {
  id: string;
  hostname: string;
  os: string | null;
  status: string;
  lastSeenAt: string | null;
}

interface InstallTokenResponse {
  token: string;
  expiresIn: string;
  installCommand: string;
}

export default function ServersPage() {
  const { token } = useAuth();
  const [servers, setServers] = useState<ServerSummary[] | null>(null);
  const [error, setError] = useState("");
  const [installInfo, setInstallInfo] = useState<InstallTokenResponse | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const loadServers = () => {
    if (!token) return;
    api
      .get<ServerSummary[]>("/v1/servers", token)
      .then(setServers)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Failed to load servers"));
  };

  useEffect(loadServers, [token]);

  const handleAddServer = async () => {
    if (!token) return;
    setGenerating(true);
    setError("");
    try {
      const info = await api.post<InstallTokenResponse>("/v1/servers/install-token", {}, token);
      setInstallInfo(info);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to generate install command");
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!installInfo) return;
    await navigator.clipboard.writeText(installInfo.installCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Servers</h1>
          <p className="text-gray-600 mt-1">All servers monitored under your account</p>
        </div>
        <button
          onClick={handleAddServer}
          disabled={generating}
          className="bg-blue-600 text-white text-sm px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {generating ? "Generating..." : "+ Add Server"}
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>}

      {installInfo && (
        <div className="bg-white rounded-lg shadow p-6 border-2 border-blue-100">
          <h2 className="text-lg font-medium text-gray-900">Install the agent on your server</h2>
          <p className="text-sm text-gray-600 mt-1">
            Run this command as root on the server you want to monitor. It expires in {installInfo.expiresIn}. The
            server will appear below within about a minute of the agent's first check-in.
          </p>
          <div className="mt-4 bg-gray-900 rounded-md p-4 flex items-start justify-between gap-4">
            <code className="text-green-400 text-sm break-all">{installInfo.installCommand}</code>
            <button
              onClick={handleCopy}
              className="shrink-0 text-xs font-medium text-gray-300 hover:text-white border border-gray-600 rounded px-2 py-1"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {servers === null && !error ? (
          <div className="p-8 text-center text-gray-500">Loading servers...</div>
        ) : servers && servers.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No servers yet. Click "Add Server" to install your first agent.</div>
        ) : (
          <div className="divide-y divide-gray-200">
            {servers?.map((s) => (
              <Link
                key={s.id}
                href={`/servers/${s.id}`}
                className="flex items-center justify-between px-6 py-4 hover:bg-gray-50"
              >
                <div>
                  <div className="text-sm font-medium text-gray-900">{s.hostname}</div>
                  <div className="text-sm text-gray-500">{s.os ?? "Unknown OS"}</div>
                </div>
                <span
                  className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    s.status === "online"
                      ? "bg-green-100 text-green-800"
                      : s.status === "pending"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {s.status}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
