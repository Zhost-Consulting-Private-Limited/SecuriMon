"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { api, ApiError } from "../../../lib/api";

interface AlertRule {
  id: string;
  metric: string;
  condition: string;
  channels: string[];
  enabled: boolean;
  serverId: string | null;
}

const METRICS = [
  { value: "cpu", label: "CPU usage" },
  { value: "ram", label: "RAM usage" },
  { value: "disk", label: "Disk usage" },
  { value: "offline", label: "Server offline" },
  { value: "ssh_attack", label: "SSH brute-force attempt" },
];

export default function AlertsPage() {
  const { token } = useAuth();
  const [rules, setRules] = useState<AlertRule[] | null>(null);
  const [error, setError] = useState("");
  const [metric, setMetric] = useState("cpu");
  const [condition, setCondition] = useState("> 90");
  const [channel, setChannel] = useState("");
  const [saving, setSaving] = useState(false);

  const loadRules = () => {
    if (!token) return;
    api
      .get<AlertRule[]>("/v1/alerts/rules", token)
      .then(setRules)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Failed to load alert rules"));
  };

  useEffect(loadRules, [token]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !channel) return;
    setSaving(true);
    setError("");
    try {
      await api.post(
        "/v1/alerts/rules",
        { metric, condition: metric === "offline" || metric === "ssh_attack" ? "== true" : condition, channels: [channel] },
        token
      );
      setChannel("");
      loadRules();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to create alert rule");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (rule: AlertRule) => {
    if (!token) return;
    try {
      await api.put(`/v1/alerts/rules/${rule.id}`, { enabled: !rule.enabled }, token);
      loadRules();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to update alert rule");
    }
  };

  const handleDelete = async (rule: AlertRule) => {
    if (!token) return;
    try {
      await api.delete(`/v1/alerts/rules/${rule.id}`, token);
      loadRules();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to delete alert rule");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Alerts</h1>
        <p className="text-gray-600 mt-1">Get notified by email, Slack, Discord, or a generic webhook</p>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>}

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">New Alert Rule</h2>
        <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Metric</label>
            <select
              value={metric}
              onChange={(e) => setMetric(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              {METRICS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          {metric !== "offline" && metric !== "ssh_attack" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Condition</label>
              <input
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                placeholder="> 90"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
          )}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Notify (channel:target)</label>
            <input
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              placeholder="email:you@example.com"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              required
            />
          </div>
          <div className="md:col-span-4">
            <button
              type="submit"
              disabled={saving}
              className="bg-blue-600 text-white text-sm px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Create Alert Rule"}
            </button>
            <p className="text-xs text-gray-500 mt-2">
              Channel format: <code>email:you@example.com</code>, <code>slack:https://hooks.slack.com/...</code>,{" "}
              <code>discord:https://discord.com/api/webhooks/...</code>, or <code>webhook:https://your-url</code>
            </p>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Your Alert Rules</h2>
        </div>
        {rules === null ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : rules.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No alert rules yet. Create one above.</div>
        ) : (
          <div className="divide-y divide-gray-200">
            {rules.map((rule) => (
              <div key={rule.id} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {rule.metric} {rule.condition}
                  </div>
                  <div className="text-sm text-gray-500">{rule.channels.join(", ")}</div>
                </div>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => handleToggle(rule)}
                    className={`text-sm font-medium ${rule.enabled ? "text-green-600" : "text-gray-400"}`}
                  >
                    {rule.enabled ? "Enabled" : "Disabled"}
                  </button>
                  <button onClick={() => handleDelete(rule)} className="text-sm text-red-600 hover:text-red-800">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
