"use client";

import { useState } from "react";
import type { ChatMessage } from "@/lib/types";
import { ChevronDown, ChevronRight } from "lucide-react";

interface Props {
  message: ChatMessage;
  isStreaming?: boolean;
}

export function AgentMessage({ message, isStreaming }: Props) {
  const [showThinking, setShowThinking] = useState(false);

  if (message.type === "phase_change") {
    return (
      <div className="flex items-center gap-3 py-4 px-4">
        <div className="phase-divider flex-1" />
        <div className="flex items-center gap-2 text-sm font-medium text-[var(--color-text-secondary)] whitespace-nowrap">
          <span className="text-lg">{message.agentAvatar}</span>
          <span>{message.content.replace(/\*\*/g, "").split("\n")[0]}</span>
        </div>
        <div className="phase-divider flex-1" />
      </div>
    );
  }

  const isUser = message.agentId === "user";
  const isSystem = message.agentId === "system";

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 hover:bg-[var(--color-surface)] rounded-lg transition-colors ${
        isUser ? "bg-[var(--color-primary)]/5" : ""
      }`}
    >
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-lg shrink-0"
        style={{
          backgroundColor: isSystem
            ? "transparent"
            : message.agentColor + "20",
        }}
      >
        {message.agentAvatar}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span
            className="text-sm font-medium"
            style={{ color: isUser ? "var(--color-primary)" : message.agentColor }}
          >
            {message.agentName}
          </span>
          <span className="text-xs text-[var(--color-text-muted)]">
            {new Date(message.timestamp).toLocaleTimeString("ru-RU", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          {message.type !== "message" && message.type !== "intervention" && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-surface)] text-[var(--color-text-muted)]">
              {message.type}
            </span>
          )}
        </div>

        {message.thinking && (
          <button
            onClick={() => setShowThinking(!showThinking)}
            className="flex items-center gap-1 text-xs text-[var(--color-text-muted)] mb-1 hover:text-[var(--color-text-secondary)] transition-colors"
          >
            {showThinking ? (
              <ChevronDown size={12} />
            ) : (
              <ChevronRight size={12} />
            )}
            Extended thinking
          </button>
        )}
        {showThinking && message.thinking && (
          <div className="text-xs text-[var(--color-text-muted)] bg-[var(--color-bg)]/50 rounded-lg p-3 mb-2 max-h-48 overflow-y-auto whitespace-pre-wrap">
            {message.thinking}
          </div>
        )}

        <div
          className={`text-sm text-[var(--color-text-primary)] whitespace-pre-wrap leading-relaxed ${
            isStreaming ? "streaming-cursor" : ""
          }`}
        >
          {message.content}
        </div>
      </div>
    </div>
  );
}
