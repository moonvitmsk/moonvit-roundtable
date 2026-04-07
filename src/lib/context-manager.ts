import type { AgentConfig, ChatMessage, Phase, Session } from "./types";

const MAX_RECENT_MESSAGES = 6;

export function buildAgentContext(
  session: Session,
  agent: AgentConfig,
  phase: Phase
): string {
  const parts: string[] = [];

  parts.push(`# Тема обсуждения\n${session.topic}`);
  parts.push(`\n# Текущая фаза: ${phase.icon} ${phase.name}\n${phase.description}`);
  parts.push(`\n# Твоя задача на эту фазу\n${phase.agentInstruction}`);

  if (phase.id === "generation") {
    return parts.join("\n");
  }

  const prevPhaseMessages = getPreviousPhasesSummary(session, phase.id);
  if (prevPhaseMessages) {
    parts.push(`\n# Резюме предыдущих фаз\n${prevPhaseMessages}`);
  }

  const currentPhaseMessages = session.messages.filter(
    (m) => m.phase === phase.id && m.agentId !== "system"
  );

  if (currentPhaseMessages.length > 0) {
    const recent = currentPhaseMessages.slice(-MAX_RECENT_MESSAGES);
    const older = currentPhaseMessages.slice(0, -MAX_RECENT_MESSAGES);

    if (older.length > 0) {
      parts.push(
        `\n# Ранее в этой фазе (краткое содержание, ${older.length} сообщений)\n` +
          summarizeMessages(older)
      );
    }

    parts.push(
      `\n# Последние сообщения\n` +
        recent.map((m) => formatMessage(m)).join("\n\n")
    );
  }

  if (phase.id === "evaluation" || phase.id === "refinement") {
    const allIdeas = extractIdeasFromMessages(session.messages);
    if (allIdeas.length > 0) {
      parts.push(`\n# Все идеи, предложенные ранее\n${allIdeas}`);
    }
  }

  if (phase.id === "refinement" && session.ideas.length > 0) {
    const top = session.ideas
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
    parts.push(
      `\n# ТОП-3 идеи для доработки\n` +
        top.map((i, idx) => `${idx + 1}. **${i.title}** (${i.score}/10) — ${i.description}`).join("\n")
    );
  }

  return parts.join("\n");
}

function getPreviousPhasesSummary(session: Session, currentPhaseId: string): string | null {
  const phaseOrder = ["generation", "discussion", "evaluation", "refinement"];
  const currentIdx = phaseOrder.indexOf(currentPhaseId);
  if (currentIdx <= 0) return null;

  const prevPhases = phaseOrder.slice(0, currentIdx);
  const summaries: string[] = [];

  for (const phaseId of prevPhases) {
    const msgs = session.messages.filter(
      (m) => m.phase === phaseId && m.agentId !== "system"
    );
    if (msgs.length === 0) continue;

    const phaseDef = session.phases.find((p) => p.id === phaseId);
    const name = phaseDef ? phaseDef.name : phaseId;
    summaries.push(`## ${name}\n${summarizeMessages(msgs)}`);
  }

  return summaries.length > 0 ? summaries.join("\n\n") : null;
}

function summarizeMessages(messages: ChatMessage[]): string {
  return messages
    .map((m) => {
      const text =
        m.content.length > 300
          ? m.content.slice(0, 300) + "..."
          : m.content;
      return `**${m.agentName}**: ${text}`;
    })
    .join("\n");
}

function formatMessage(m: ChatMessage): string {
  return `**${m.agentName}** (${m.type}):\n${m.content}`;
}

function extractIdeasFromMessages(messages: ChatMessage[]): string {
  const genMessages = messages.filter(
    (m) => m.phase === "generation" && m.agentId !== "system"
  );
  return genMessages
    .map((m) => `### Идеи от ${m.agentName}\n${m.content}`)
    .join("\n\n");
}

export function buildSystemPrompt(
  agent: AgentConfig,
  brandContext: string
): string {
  return `${agent.systemPrompt}

Ты участвуешь в круглом столе как "${agent.name}".
Твоя роль: ${agent.role}.
Области экспертизы: ${agent.expertise.join(", ")}.

Обращайся к другим участникам по имени. Будь конкретен. Отвечай на русском языке.

${brandContext}`;
}
