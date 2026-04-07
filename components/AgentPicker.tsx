"use client";

import { useState } from "react";
import type { AgentConfig } from "@/lib/types";
import { ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";

interface Props {
  agents: AgentConfig[];
  onChange: (agents: AgentConfig[]) => void;
}

const COLORS = ["#6366f1", "#ec4899", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#14b8a6", "#f43f5e"];
const AVATARS = ["🧠", "🦠", "🎬", "📊", "😈", "🔬", "👤", "🎨", "⚖️", "🚀", "💰", "🕵️", "🏪", "✍️", "📱", "📈", "📖"];

export function AgentPicker({ agents, onChange }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggle = (id: string, enabled: boolean) => {
    // Don't allow disabling provocateur or having less than 3 agents
    const agent = agents.find((a) => a.id === id);
    if (!enabled && agent?.id === "provocateur") return;
    const enabledCount = agents.filter((a) => !("disabled" in a)).length;
    if (!enabled && enabledCount <= 3) return;

    onChange(
      agents.map((a) =>
        a.id === id ? { ...a, disabled: !enabled } as AgentConfig & { disabled?: boolean } : a
      ) as AgentConfig[]
    );
  };

  const updateAgent = (id: string, field: keyof AgentConfig, value: string) => {
    onChange(agents.map((a) => (a.id === id ? { ...a, [field]: value } : a)));
  };

  const addAgent = () => {
    const newAgent: AgentConfig = {
      id: `custom-${Date.now()}`,
      name: "Новый агент",
      role: "Опишите роль",
      systemPrompt: "Опишите поведение агента...",
      avatar: AVATARS[agents.length % AVATARS.length],
      color: COLORS[agents.length % COLORS.length],
      expertise: ["кастом"],
    };
    onChange([...agents, newAgent]);
    setExpandedId(newAgent.id);
  };

  const removeAgent = (id: string) => {
    if (id === "provocateur") return;
    onChange(agents.filter((a) => a.id !== id));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-[var(--color-text-primary)]">
          Участники ({agents.length})
        </h3>
        {agents.length < 6 && (
          <button
            onClick={addAgent}
            className="flex items-center gap-1 text-xs text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] transition-colors"
          >
            <Plus size={14} /> Добавить
          </button>
        )}
      </div>

      {agents.map((agent) => {
        const isExpanded = expandedId === agent.id;
        const isCustom = agent.id.startsWith("custom-");

        return (
          <div
            key={agent.id}
            className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden"
          >
            <div
              className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-[var(--color-surface-hover)] transition-colors"
              onClick={() => setExpandedId(isExpanded ? null : agent.id)}
            >
              <span className="text-lg">{agent.avatar}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                  {agent.name}
                </div>
                <div className="text-xs text-[var(--color-text-muted)] truncate">
                  {agent.role}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isCustom && (
                  <button
                    onClick={(e) => { e.stopPropagation(); removeAgent(agent.id); }}
                    className="text-[var(--color-text-muted)] hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
                {isExpanded ? <ChevronDown size={14} className="text-[var(--color-text-muted)]" /> : <ChevronRight size={14} className="text-[var(--color-text-muted)]" />}
              </div>
            </div>

            {isExpanded && (
              <div className="px-3 pb-3 space-y-2 border-t border-[var(--color-border)]">
                <div className="pt-2">
                  <label className="text-xs text-[var(--color-text-muted)] block mb-1">Имя</label>
                  <input
                    value={agent.name}
                    onChange={(e) => updateAgent(agent.id, "name", e.target.value)}
                    className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-primary)]"
                  />
                </div>
                <div>
                  <label className="text-xs text-[var(--color-text-muted)] block mb-1">Роль</label>
                  <input
                    value={agent.role}
                    onChange={(e) => updateAgent(agent.id, "role", e.target.value)}
                    className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-primary)]"
                  />
                </div>
                <div>
                  <label className="text-xs text-[var(--color-text-muted)] block mb-1">System prompt</label>
                  <textarea
                    value={agent.systemPrompt}
                    onChange={(e) => updateAgent(agent.id, "systemPrompt", e.target.value)}
                    rows={4}
                    className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-primary)] resize-none"
                  />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
