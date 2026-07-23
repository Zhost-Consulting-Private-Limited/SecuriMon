"use client";

import { useState } from "react";
import { useServerList } from "../../../lib/useServerList";
import { api, ApiError } from "../../../lib/api";

interface Citation {
  type: string;
  metric?: string;
  date?: string;
  title?: string;
}

interface AskResponse {
  serverId: string;
  question: string;
  answer: string;
  citations: Citation[];
  timestamp: string;
}

interface ConversationEntry extends AskResponse {
  id: string;
}

const SUGGESTED_QUESTIONS = [
  "Why did CPU increase recently?",
  "Show me the top security risks on this server",
  "Summarize what happened in the last 24 hours",
  "Is anything actively attacking this server?",
];

export default function AssistantPage() {
  const { servers, selected, setSelected, error: listError, token } = useServerList();
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState("");
  const [conversation, setConversation] = useState<ConversationEntry[]>([]);

  const handleAsk = async (q?: string) => {
    const finalQuestion = q ?? question;
    if (!token || !selected || !finalQuestion.trim()) return;
    setAsking(true);
    setError("");
    try {
      const res = await api.post<AskResponse>("/v1/ai/ask", { serverId: selected, question: finalQuestion }, token);
      setConversation((prev) => [{ ...res, id: `${Date.now()}` }, ...prev]);
      setQuestion("");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to reach the AI Assistant");
    } finally {
      setAsking(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Assistant</h1>
          <p className="text-gray-600 mt-1">Ask natural-language questions about a server's metrics, security, and threats</p>
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
          No servers yet. Install the agent on a server before asking the assistant about it.
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex flex-wrap gap-2 mb-4">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => handleAsk(q)}
                  disabled={asking}
                  className="text-xs px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
                >
                  {q}
                </button>
              ))}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAsk();
              }}
              className="flex gap-3"
            >
              <input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask a question about this server..."
                className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
                disabled={asking}
              />
              <button
                type="submit"
                disabled={asking || !question.trim()}
                className="bg-blue-600 text-white text-sm px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {asking ? "Thinking..." : "Ask"}
              </button>
            </form>
          </div>

          <div className="space-y-4">
            {conversation.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
                Ask a question above to get started.
              </div>
            ) : (
              conversation.map((entry) => (
                <div key={entry.id} className="bg-white rounded-lg shadow p-6">
                  <div className="text-sm font-semibold text-gray-900 mb-2">Q: {entry.question}</div>
                  <div className="text-sm text-gray-700 whitespace-pre-wrap">{entry.answer}</div>
                  {entry.citations.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-2">
                      {entry.citations.map((c, i) => (
                        <span key={i} className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                          {c.type}
                          {c.metric ? `: ${c.metric}` : ""}
                          {c.title ? `: ${c.title}` : ""}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="mt-2 text-xs text-gray-400">{new Date(entry.timestamp).toLocaleString()}</div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
