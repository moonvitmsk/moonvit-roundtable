
import { useEffect, useRef, useState } from "react";
import type { AgentConfig, ChatMessage } from "@/lib/types";
import { AgentMessage } from "./AgentMessage";
import { ThinkingIndicator } from "./ThinkingIndicator";
import { Send } from "lucide-react";

interface Props {
  messages: ChatMessage[];
  agents: AgentConfig[];
  currentAgent: AgentConfig | null;
  isStreaming: boolean;
  streamingText: string;
  thinkingText: string;
  status: string;
  onIntervene: (text: string) => void;
}

export function RoundtableChat({
  messages,
  agents,
  currentAgent,
  isStreaming,
  streamingText,
  thinkingText,
  status,
  onIntervene,
}: Props) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText, thinkingText]);

  const handleSubmit = () => {
    if (!input.trim()) return;
    onIntervene(input.trim());
    setInput("");
  };

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Sidebar */}
      <div className="hidden md:flex flex-col w-48 shrink-0 border-r border-[var(--color-border)] bg-[var(--color-bg)] overflow-y-auto">
        <div className="px-3 py-3 text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
          Участники
        </div>
        {agents.map((agent) => {
          const isActive = currentAgent?.id === agent.id;
          return (
            <div
              key={agent.id}
              className={`flex items-center gap-2 px-3 py-2 transition-colors ${
                isActive
                  ? "bg-[var(--color-surface)]"
                  : "hover:bg-[var(--color-surface)]/50"
              }`}
            >
              <div className="relative">
                <span className="text-lg">{agent.avatar}</span>
                {isActive && (
                  <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-400 rounded-full" />
                )}
              </div>
              <div className="min-w-0">
                <div
                  className="text-xs font-medium truncate"
                  style={{ color: isActive ? agent.color : "var(--color-text-secondary)" }}
                >
                  {agent.name}
                </div>
                <div className="text-[10px] text-[var(--color-text-muted)] truncate">
                  {agent.role}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Chat */}
      <div className="flex flex-col flex-1 min-w-0">
        <div ref={chatRef} className="flex-1 overflow-y-auto py-2">
          {messages.map((msg) => (
            <AgentMessage key={msg.id} message={msg} />
          ))}

          {isStreaming && currentAgent && streamingText && (
            <AgentMessage
              message={{
                id: "streaming",
                agentId: currentAgent.id,
                agentName: currentAgent.name,
                agentColor: currentAgent.color,
                agentAvatar: currentAgent.avatar,
                content: streamingText,
                phase: "",
                round: 0,
                timestamp: Date.now(),
                type: "message",
              }}
              isStreaming
            />
          )}

          {isStreaming && currentAgent && !streamingText && (
            <ThinkingIndicator agent={currentAgent} thinkingText={thinkingText} />
          )}

          {status === "completed" && (
            <div className="flex items-center gap-3 py-4 px-4">
              <div className="phase-divider flex-1" />
              <span className="text-sm text-[var(--color-text-secondary)]">
                Обсуждение завершено
              </span>
              <div className="phase-divider flex-1" />
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        {status !== "completed" && (
          <div className="border-t border-[var(--color-border)] p-3">
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                placeholder="Вмешайтесь в обсуждение или перенаправьте тему..."
                rows={1}
                className="flex-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-primary)] resize-none"
              />
              <button
                onClick={handleSubmit}
                disabled={!input.trim()}
                className="p-2 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:opacity-40 text-white transition-colors shrink-0"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
