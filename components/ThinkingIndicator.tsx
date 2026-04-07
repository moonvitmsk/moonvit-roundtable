"use client";

import type { AgentConfig } from "@/lib/types";

interface Props {
  agent: AgentConfig;
  thinkingText: string;
}

export function ThinkingIndicator({ agent, thinkingText }: Props) {
  return (
    <div className="flex items-start gap-3 px-4 py-3 animate-pulse">
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-lg shrink-0"
        style={{ backgroundColor: agent.color + "20" }}
      >
        {agent.avatar}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium" style={{ color: agent.color }}>
            {agent.name}
          </span>
          <span className="text-xs text-[var(--color-text-muted)]">думает</span>
          <span className="flex gap-0.5">
            <span className="thinking-dot w-1.5 h-1.5 rounded-full bg-[var(--color-text-muted)]" />
            <span className="thinking-dot w-1.5 h-1.5 rounded-full bg-[var(--color-text-muted)]" />
            <span className="thinking-dot w-1.5 h-1.5 rounded-full bg-[var(--color-text-muted)]" />
          </span>
        </div>
        {thinkingText && (
          <div className="text-xs text-[var(--color-text-muted)] bg-[var(--color-surface)] rounded-lg p-2 max-h-20 overflow-hidden opacity-50 line-clamp-3">
            {thinkingText.slice(-200)}
          </div>
        )}
      </div>
    </div>
  );
}
