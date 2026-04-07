
import { useCallback, useRef, useState } from "react";
import type { AgentConfig, ChatMessage, Phase, Session } from "@/lib/types";
import { buildAgentContext, buildSystemPrompt } from "@/lib/context-manager";
import { useAgentStream } from "./useAgentStream";

export function useRoundtable(initialSession: Session) {
  const [session, setSession] = useState<Session>(initialSession);
  const [error, setError] = useState<string | null>(null);
  const pauseRef = useRef(false);
  const runningRef = useRef(false);

  const {
    isStreaming,
    currentAgent,
    streamingText,
    thinkingText,
    streamAgent,
    abort,
  } = useAgentStream();

  const addMessage = useCallback((msg: ChatMessage) => {
    setSession((s) => ({ ...s, messages: [...s.messages, msg] }));
  }, []);

  const addPhaseMessage = useCallback(
    (phase: Phase) => {
      const msg: ChatMessage = {
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
      addMessage(msg);
    },
    [addMessage]
  );

  const runNextTurn = useCallback(async (): Promise<boolean> => {
    const s = session;
    if (s.currentPhase >= s.phases.length) return false;

    const phase = s.phases[s.currentPhase];
    const agent = s.agents[s.currentAgentIndex];
    const systemPrompt = buildSystemPrompt(agent, s.brandContext);
    const userMessage = buildAgentContext(s, agent, phase);

    const message = await streamAgent(
      systemPrompt,
      userMessage,
      agent,
      phase.id,
      s.currentRound
    );

    if (!message) return false;

    let nextAgentIndex = s.currentAgentIndex + 1;
    let nextRound = s.currentRound;
    let nextPhase = s.currentPhase;
    let completed = false;

    if (nextAgentIndex >= s.agents.length) {
      nextAgentIndex = 0;
      nextRound += 1;

      if (nextRound >= phase.roundsPerAgent) {
        nextRound = 0;
        nextPhase += 1;

        if (nextPhase >= s.phases.length) {
          completed = true;
        }
      }
    }

    setSession((prev) => ({
      ...prev,
      messages: [...prev.messages, message],
      currentAgentIndex: nextAgentIndex,
      currentRound: nextRound,
      currentPhase: nextPhase,
      status: completed ? "completed" : prev.status,
    }));

    return !completed;
  }, [session, streamAgent]);

  const runSession = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    pauseRef.current = false;

    setSession((s) => ({ ...s, status: "running" }));
    setError(null);

    let lastPhase = -1;

    try {
      while (!pauseRef.current) {
        const s = session;
        const phaseIdx =
          lastPhase === -1 ? s.currentPhase : s.currentPhase;

        // Emit phase header on phase change
        setSession((current) => {
          if (current.currentPhase !== lastPhase && current.currentPhase < current.phases.length) {
            const phase = current.phases[current.currentPhase];
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
            lastPhase = current.currentPhase;
            return { ...current, messages: [...current.messages, phaseMsg] };
          }
          return current;
        });

        const hasMore = await runNextTurn();
        if (!hasMore) break;

        // Brief pause between agents
        await new Promise((r) => setTimeout(r, 800));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }

    runningRef.current = false;
    setSession((s) => ({
      ...s,
      status: s.currentPhase >= s.phases.length ? "completed" : "paused",
    }));
  }, [session, runNextTurn]);

  const pause = useCallback(() => {
    pauseRef.current = true;
    abort();
    setSession((s) => ({ ...s, status: "paused" }));
  }, [abort]);

  const resume = useCallback(() => {
    runSession();
  }, [runSession]);

  const skipPhase = useCallback(() => {
    setSession((s) => {
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
  }, []);

  const intervene = useCallback(
    (text: string) => {
      const msg: ChatMessage = {
        id: crypto.randomUUID(),
        agentId: "user",
        agentName: "Вы",
        agentColor: "#7c3aed",
        agentAvatar: "👤",
        content: text,
        phase: session.phases[session.currentPhase]?.id || "generation",
        round: session.currentRound,
        timestamp: Date.now(),
        type: "intervention",
      };
      addMessage(msg);
    },
    [session, addMessage]
  );

  const exportMarkdown = useCallback((): string => {
    const lines: string[] = [];
    lines.push(`# Круглый стол: ${session.topic}`);
    lines.push(`*${new Date(session.createdAt).toLocaleString("ru-RU")}*\n`);
    lines.push(`**Участники:** ${session.agents.map((a) => `${a.avatar} ${a.name}`).join(", ")}\n`);

    let currentPhase = "";
    for (const msg of session.messages) {
      if (msg.phase !== currentPhase) {
        currentPhase = msg.phase;
        lines.push(`\n---\n## ${msg.phase}\n`);
      }
      if (msg.type === "phase_change") continue;
      lines.push(`### ${msg.agentAvatar} ${msg.agentName}\n${msg.content}\n`);
    }

    return lines.join("\n");
  }, [session]);

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
