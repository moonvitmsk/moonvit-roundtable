import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatMessage, Phase, Session } from "@/lib/types";
import { buildAgentContext, buildSystemPrompt } from "@/lib/context-manager";
import { useAgentStream } from "./useAgentStream";

export function useRoundtable(initialSession: Session) {
  const [session, setSession] = useState<Session>(initialSession);
  const [error, setError] = useState<string | null>(null);
  const sessionRef = useRef<Session>(initialSession);
  const pauseRef = useRef(false);
  const runningRef = useRef(false);

  // Keep ref in sync with state
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const {
    isStreaming,
    currentAgent,
    streamingText,
    thinkingText,
    streamAgent,
    abort,
  } = useAgentStream();

  const updateSession = useCallback((updater: (s: Session) => Session) => {
    setSession((prev) => {
      const next = updater(prev);
      sessionRef.current = next;
      return next;
    });
  }, []);

  const runSession = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    pauseRef.current = false;

    updateSession((s) => ({ ...s, status: "running" }));
    setError(null);

    let lastPhaseIdx = -1;

    try {
      while (!pauseRef.current) {
        const s = sessionRef.current;
        if (s.currentPhase >= s.phases.length) break;

        // Emit phase header on phase change
        if (s.currentPhase !== lastPhaseIdx) {
          lastPhaseIdx = s.currentPhase;
          const phase = s.phases[s.currentPhase];
          const phaseMsg: ChatMessage = {
            id: crypto.randomUUID(),
            agentId: "system",
            agentName: "Система",
            agentColor: "#71717a",
            agentAvatar: phase.icon,
            content: `${phase.icon} **${phase.name}**\n${phase.description}`,
            phase: phase.id,
            round: 0,
            timestamp: Date.now(),
            type: "phase_change",
          };
          updateSession((prev) => ({
            ...prev,
            messages: [...prev.messages, phaseMsg],
          }));
        }

        // Read fresh state
        const cur = sessionRef.current;
        const phase = cur.phases[cur.currentPhase];
        const agent = cur.agents[cur.currentAgentIndex];

        if (!agent || !phase) break;

        const systemPrompt = buildSystemPrompt(agent, cur.brandContext);
        const userMessage = buildAgentContext(cur, agent, phase);

        let message: ChatMessage | null = null;
        try {
          message = await streamAgent(
            systemPrompt,
            userMessage,
            agent,
            phase.id,
            cur.currentRound
          );
        } catch (err) {
          setError(err instanceof Error ? err.message : "API error");
          break;
        }

        // If message is null or empty — stop, don't loop
        if (!message || !message.content.trim()) {
          if (!pauseRef.current) {
            setError("Агент вернул пустой ответ. Проверьте что сервер запущен (npm run server).");
          }
          break;
        }

        // Advance turn
        let nextAgentIndex = cur.currentAgentIndex + 1;
        let nextRound = cur.currentRound;
        let nextPhase = cur.currentPhase;
        let completed = false;

        if (nextAgentIndex >= cur.agents.length) {
          nextAgentIndex = 0;
          nextRound += 1;
          if (nextRound >= phase.roundsPerAgent) {
            nextRound = 0;
            nextPhase += 1;
            if (nextPhase >= cur.phases.length) {
              completed = true;
            }
          }
        }

        updateSession((prev) => ({
          ...prev,
          messages: [...prev.messages, message!],
          currentAgentIndex: nextAgentIndex,
          currentRound: nextRound,
          currentPhase: nextPhase,
          status: completed ? "completed" : prev.status,
        }));

        if (completed) break;

        // Brief pause between agents
        await new Promise((r) => setTimeout(r, 1000));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }

    runningRef.current = false;
    updateSession((s) => ({
      ...s,
      status: s.currentPhase >= s.phases.length ? "completed" : "paused",
    }));
  }, [streamAgent, updateSession]);

  const pause = useCallback(() => {
    pauseRef.current = true;
    abort();
    updateSession((s) => ({ ...s, status: "paused" }));
  }, [abort, updateSession]);

  const resume = useCallback(() => {
    runSession();
  }, [runSession]);

  const skipPhase = useCallback(() => {
    updateSession((s) => {
      const nextPhase = s.currentPhase + 1;
      if (nextPhase >= s.phases.length) {
        return { ...s, status: "completed" };
      }
      return {
        ...s,
        currentPhase: nextPhase,
        currentRound: 0,
        currentAgentIndex: 0,
      };
    });
  }, [updateSession]);

  const intervene = useCallback(
    (text: string) => {
      const s = sessionRef.current;
      const msg: ChatMessage = {
        id: crypto.randomUUID(),
        agentId: "user",
        agentName: "Вы",
        agentColor: "#7c3aed",
        agentAvatar: "👤",
        content: text,
        phase: s.phases[s.currentPhase]?.id || "generation",
        round: s.currentRound,
        timestamp: Date.now(),
        type: "intervention",
      };
      updateSession((prev) => ({
        ...prev,
        messages: [...prev.messages, msg],
      }));
    },
    [updateSession]
  );

  const exportMarkdown = useCallback((): string => {
    const s = sessionRef.current;
    const lines: string[] = [];
    lines.push(`# Круглый стол: ${s.topic}`);
    lines.push(`*${new Date(s.createdAt).toLocaleString("ru-RU")}*\n`);
    lines.push(`**Участники:** ${s.agents.map((a) => `${a.avatar} ${a.name}`).join(", ")}\n`);

    let currentPhase = "";
    for (const msg of s.messages) {
      if (msg.phase !== currentPhase) {
        currentPhase = msg.phase;
        lines.push(`\n---\n## ${msg.phase}\n`);
      }
      if (msg.type === "phase_change") continue;
      lines.push(`### ${msg.agentAvatar} ${msg.agentName}\n${msg.content}\n`);
    }

    return lines.join("\n");
  }, []);

  return {
    session,
    isStreaming,
    currentAgent,
    streamingText,
    thinkingText,
    error,
    runSession,
    pause,
    resume,
    skipPhase,
    intervene,
    exportMarkdown,
  };
}
