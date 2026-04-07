import type { AgentConfig, ChatMessage, Phase, Session } from "./types";

const MAX_RECENT_MESSAGES = 8;

export function buildAgentContext(
  session: Session,
  agent: AgentConfig,
  phase: Phase
): string {
  const parts: string[] = [];

  parts.push(`# Тема: ${session.topic}`);
  parts.push(`# Фаза: ${phase.icon} ${phase.name}`);
  parts.push(`${phase.agentInstruction}`);

  if (phase.id === "generation") {
    return parts.join("\n\n");
  }

  const prevPhaseMessages = getPreviousPhasesSummary(session, phase.id);
  if (prevPhaseMessages) {
    parts.push(`# Итоги предыдущих фаз\n${prevPhaseMessages}`);
  }

  const currentPhaseMessages = session.messages.filter(
    (m) => m.phase === phase.id && m.agentId !== "system"
  );

  if (currentPhaseMessages.length > 0) {
    const recent = currentPhaseMessages.slice(-MAX_RECENT_MESSAGES);
    parts.push(
      `# Последние сообщения\n` +
        recent.map((m) => `**${m.agentName}**: ${m.content}`).join("\n\n")
    );
  }

  // Pass collected ideas for evaluation/refinement
  if (phase.id === "evaluation" || phase.id === "refinement") {
    const ideas = session.ideas;
    if (ideas.length > 0) {
      parts.push(
        `# Идеи для оценки\n` +
          ideas
            .map(
              (i, idx) =>
                `${idx + 1}. **${i.title}** (от ${i.author}) — ${i.description}${i.score > 0 ? ` [${i.score}/10]` : ""}`
            )
            .join("\n")
      );
    }
  }

  return parts.join("\n\n");
}

function getPreviousPhasesSummary(
  session: Session,
  currentPhaseId: string
): string | null {
  const phaseOrder = ["generation", "discussion", "evaluation", "refinement"];
  const currentIdx = phaseOrder.indexOf(currentPhaseId);
  if (currentIdx <= 0) return null;

  // Summarize ideas, not full messages
  if (session.ideas.length > 0) {
    return session.ideas
      .map((i) => `- **${i.title}** (${i.author})${i.score > 0 ? ` ${i.score}/10` : ""}: ${i.description}`)
      .join("\n");
  }

  // Fallback to message summaries
  const prevMsgs = session.messages.filter(
    (m) =>
      phaseOrder.indexOf(m.phase) < currentIdx &&
      m.agentId !== "system"
  );
  return prevMsgs
    .map((m) => `**${m.agentName}**: ${m.content.length > 200 ? m.content.slice(0, 200) + "..." : m.content}`)
    .join("\n");
}

// ── JSON output format for generation phase ─────────────────

const JSON_FORMAT_GENERATION = `
ФОРМАТ ВЫВОДА — СТРОГО JSON. Никакого текста вне JSON.

Верни JSON-массив идей:
[
  {
    "title": "Название идеи в 3-5 слов",
    "hook": "Суть в 1 предложение — зачем это нужно",
    "description": "Подробнее в 2-3 предложения — как это работает",
    "feasibility": "легко" | "средне" | "сложно"
  }
]

Предложи 3-4 идеи. Каждая КОРОТКАЯ. Название — цепляющее. Hook — одно предложение. Description — максимум 3 предложения.
НЕ ПОВТОРЯЙ одобренные CEO идеи (спутник, метеорит, луна над Москвой).
`;

const FORMAT_DISCUSSION = `
ФОРМАТ: Пиши КОРОТКО. Максимум 150 слов на всё сообщение.

Структура:
👍 Какая идея зацепила и почему (1-2 предложения)
👎 Какая слабая и почему (1 предложение)
💡 Своё предложение или гибрид (2-3 предложения)

Ссылайся на идеи по названию. Не повторяй чужие мысли. Будь конкретен.
`;

const FORMAT_EVALUATION = `
ФОРМАТ ВЫВОДА — СТРОГО JSON. Никакого текста вне JSON.

Верни JSON:
{
  "scores": [
    { "title": "Название идеи", "score": 8, "reason": "Почему такой балл — 1 предложение" }
  ],
  "top3": ["Название 1", "Название 2", "Название 3"]
}

Оцени ВСЕ идеи по шкале 1-10 с позиции своей экспертизы.
`;

const FORMAT_REFINEMENT = `
ФОРМАТ: Для каждой топ-идеи пиши КОРОТКО:

**Название идеи**
- Первый шаг: что делать завтра (1 предложение)
- Бюджет: примерная сумма и срок
- Главный риск: и как минимизировать (1 предложение)
- KPI: как измерить успех (1-2 метрики)

Максимум 100 слов на идею. Без вступлений.
`;

export function buildSystemPrompt(
  agent: AgentConfig,
  brandContext: string,
  phaseId?: string
): string {
  // outputPrompt агента имеет приоритет над дефолтным форматом фазы
  let formatBlock = "";
  if (agent.outputPrompt) {
    formatBlock = agent.outputPrompt;
  } else {
    if (phaseId === "generation") formatBlock = JSON_FORMAT_GENERATION;
    else if (phaseId === "discussion") formatBlock = FORMAT_DISCUSSION;
    else if (phaseId === "evaluation") formatBlock = FORMAT_EVALUATION;
    else if (phaseId === "refinement") formatBlock = FORMAT_REFINEMENT;
  }

  return `${agent.systemPrompt}

Ты "${agent.name}" в круглом столе. Роль: ${agent.role}. Экспертиза: ${agent.expertise.join(", ")}.
Отвечай на русском. Будь конкретен.
${formatBlock}
${brandContext}`;
}
