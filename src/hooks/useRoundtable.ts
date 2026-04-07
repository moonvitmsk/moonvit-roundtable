import { useCallback, useEffect, useRef, useState } from "react";
import type { AgentConfig, ChatMessage, Session } from "@/lib/types";
import { buildAgentContext, buildSystemPrompt } from "@/lib/context-manager";
import { useAgentStream } from "./useAgentStream";

// Parse JSON arrays from generation/evaluation, split into individual messages
function parseAgentResponse(
  message: ChatMessage,
  phaseId: string,
  agent: AgentConfig
): ChatMessage[] {
  const raw = message.content.trim();

  // Try to extract JSON from response
  const jsonMatch = raw.match(/\[[\s\S]*\]/)?.[0] || raw.match(/\{[\s\S]*\}/)?.[0];

  if (phaseId === "generation" && jsonMatch) {
    try {
      const ideas = JSON.parse(jsonMatch);
      if (Array.isArray(ideas) && ideas.length > 0) {
        return ideas.map((idea: { title?: string; hook?: string; description?: string; feasibility?: string }, idx: number) => ({
          id: crypto.randomUUID(),
          agentId: agent.id,
          agentName: agent.name,
          agentColor: agent.color,
          agentAvatar: agent.avatar,
          content: `**${idea.title || `Идея ${idx + 1}`}**\n${idea.hook || ""}\n\n${idea.description || ""}${idea.feasibility ? `\n\n_Реализуемость: ${idea.feasibility}_` : ""}`,
          thinking: message.thinking,
          phase: message.phase,
          round: message.round,
          timestamp: Date.now() + idx,
          type: "idea" as const,
        }));
      }
    } catch { /* not valid JSON, fall through */ }
  }

  if (phaseId === "evaluation" && jsonMatch) {
    try {
      const data = JSON.parse(jsonMatch);
      const scores = data.scores || (Array.isArray(data) ? data : []);
      if (scores.length > 0) {
        const scoreText = scores
          .map((s: { title?: string; score?: number; reason?: string }) => `**${s.title}**: ${s.score}/10 — ${s.reason}`)
          .join("\n");
        const top3 = data.top3 ? `\n\n🏆 Мой ТОП-3: ${data.top3.join(", ")}` : "";
        return [{
          ...message,
          content: scoreText + top3,
          type: "critique" as const,
        }];
      }
    } catch { /* fall through */ }
  }

  // Fallback: return as-is
  return [message];
}

export function useRoundtable(initialSession: Session) {
  const [session, setSession] = useState<Session>(initialSession);
  const [error, setError] = useState<string | null>(null);
  const sessionRef = useRef<Session>(initialSession);
  const pauseRef = useRef(false);
  const runningRef = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep ref in sync + debounced auto-save
  useEffect(() => {
    sessionRef.current = session;
    // Debounced auto-save
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      import("@/lib/supabase").then(({ saveSession }) => saveSession(session));
    }, 2000);
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

        const systemPrompt = buildSystemPrompt(agent, cur.brandContext, phase.id);
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

        if (!message || !message.content.trim()) {
          if (!pauseRef.current) {
            setError("Агент вернул пустой ответ. Проверьте что сервер запущен (npm run server).");
          }
          break;
        }

        // Parse JSON responses for generation/evaluation — split into individual messages + ideas
        const parsedMessages = parseAgentResponse(message, phase.id, agent);

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

        // Collect ideas from parsed messages
        const newIdeas = parsedMessages
          .filter((m) => m.type === "idea")
          .map((m) => ({
            id: m.id,
            title: m.content.split("\n")[0]?.replace(/^\*\*|\*\*$/g, "") || "",
            description: m.content.split("\n").slice(1).join(" ").trim(),
            author: agent.name,
            supporters: [],
            critics: [],
            score: 0,
            phase: phase.id,
            tags: [],
          }));

        updateSession((prev) => ({
          ...prev,
          messages: [...prev.messages, ...parsedMessages],
          ideas: [...prev.ideas, ...newIdeas],
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
