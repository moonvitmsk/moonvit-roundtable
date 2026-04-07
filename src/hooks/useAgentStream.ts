
import { useCallback, useRef, useState } from "react";
import type { AgentConfig, ChatMessage } from "@/lib/types";

interface StreamState {
  isStreaming: boolean;
  currentAgent: AgentConfig | null;
  streamingText: string;
  thinkingText: string;
}

export function useAgentStream() {
  const [state, setState] = useState<StreamState>({
    isStreaming: false,
    currentAgent: null,
    streamingText: "",
    thinkingText: "",
  });
  const abortRef = useRef<AbortController | null>(null);

  const streamAgent = useCallback(
    async (
      systemPrompt: string,
      userMessage: string,
      agent: AgentConfig,
      phase: string,
      round: number
    ): Promise<ChatMessage | null> => {
      abortRef.current = new AbortController();

      setState({
        isStreaming: true,
        currentAgent: agent,
        streamingText: "",
        thinkingText: "",
      });

      let fullText = "";
      let fullThinking = "";

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemPrompt,
            userMessage,
            agentMeta: {
              id: agent.id,
              name: agent.name,
              color: agent.color,
              avatar: agent.avatar,
            },
          }),
          signal: abortRef.current.signal,
        });

        if (!response.ok || !response.body) {
          throw new Error(`API error: ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === "thinking") {
                fullThinking += data.text;
                setState((s) => ({ ...s, thinkingText: fullThinking }));
              } else if (data.type === "text") {
                fullText += data.text;
                setState((s) => ({ ...s, streamingText: fullText }));
              } else if (data.type === "error") {
                throw new Error(data.error);
              }
            } catch {
              // skip malformed JSON
            }
          }
        }

        const message: ChatMessage = {
          id: crypto.randomUUID(),
          agentId: agent.id,
          agentName: agent.name,
          agentColor: agent.color,
          agentAvatar: agent.avatar,
          content: fullText,
          thinking: fullThinking || undefined,
          phase,
          round,
          timestamp: Date.now(),
          type: "message",
        };

        setState({
          isStreaming: false,
          currentAgent: null,
          streamingText: "",
          thinkingText: "",
        });

        return message;
      } catch (err) {
        if ((err as Error).name === "AbortError") {
          setState({
            isStreaming: false,
            currentAgent: null,
            streamingText: "",
            thinkingText: "",
          });
          return null;
        }
        setState((s) => ({ ...s, isStreaming: false }));
        throw err;
      }
    },
    []
  );

  const abort = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { ...state, streamAgent, abort };
}
