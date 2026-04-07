"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AgentConfig, Phase, RoundtableTemplate, Session } from "@/lib/types";
import { ALL_TEMPLATES } from "@/lib/templates";
import { DEFAULT_PHASES } from "@/lib/phases";
import { MOONVIT_BRAND_CONTEXT } from "@/lib/brand-context";
import { TemplateCard } from "@/components/TemplateCard";
import { SessionSetup } from "@/components/SessionSetup";

const VERSION = "0.1.0";

export default function Home() {
  const router = useRouter();
  const [selectedTemplate, setSelectedTemplate] = useState<RoundtableTemplate | null>(null);

  const handleStart = (topic: string, agents: AgentConfig[], phases: Phase[]) => {
    const session: Session = {
      id: crypto.randomUUID(),
      templateId: selectedTemplate!.id,
      topic,
      agents,
      phases,
      messages: [],
      currentPhase: 0,
      currentRound: 0,
      currentAgentIndex: 0,
      status: "setup",
      createdAt: Date.now(),
      ideas: [],
      brandContext: selectedTemplate!.brandContext,
    };

    sessionStorage.setItem(`session-${session.id}`, JSON.stringify(session));
    router.push(`/session/${session.id}`);
  };

  if (selectedTemplate) {
    return (
      <SessionSetup
        template={selectedTemplate}
        onStart={handleStart}
        onBack={() => setSelectedTemplate(null)}
      />
    );
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-[var(--color-border)] px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-base font-semibold text-[var(--color-text-primary)]">
              moonvit roundtable
            </h1>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-surface)] text-[var(--color-text-muted)]">
              v{VERSION}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-semibold text-[var(--color-text-primary)] mb-3">
            AI-круглый стол
          </h2>
          <p className="text-sm text-[var(--color-text-secondary)] max-w-lg mx-auto">
            3-6 AI-агентов с разными ролями проводят структурированный мозговой штурм.
            Наблюдайте за дискуссией в реальном времени и вмешивайтесь когда нужно.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
          {ALL_TEMPLATES.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onSelect={setSelectedTemplate}
            />
          ))}
        </div>

        <div className="text-center">
          <button
            onClick={() => {
              const customTemplate: RoundtableTemplate = {
                id: "custom",
                name: "Кастомный стол",
                description: "Настройте свой круглый стол с нуля",
                icon: "🎛️",
                agents: [
                  {
                    id: "agent-1",
                    name: "Эксперт 1",
                    role: "Опишите роль",
                    systemPrompt: "Опишите поведение агента...",
                    avatar: "🧠",
                    color: "#6366f1",
                    expertise: ["экспертиза"],
                  },
                  {
                    id: "agent-2",
                    name: "Эксперт 2",
                    role: "Опишите роль",
                    systemPrompt: "Опишите поведение агента...",
                    avatar: "🎯",
                    color: "#10b981",
                    expertise: ["экспертиза"],
                  },
                  {
                    id: "provocateur",
                    name: "Провокатор",
                    role: "Стресс-тест идей",
                    systemPrompt:
                      "Ты — Devil's Advocate. Разрушаешь консенсус. Если все согласны — находишь изъяны. Всегда предлагаешь контринтуитивную альтернативу.",
                    avatar: "😈",
                    color: "#ef4444",
                    expertise: ["критика", "риски"],
                  },
                ],
                phases: DEFAULT_PHASES,
                brandContext: MOONVIT_BRAND_CONTEXT,
              };
              setSelectedTemplate(customTemplate);
            }}
            className="text-sm text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] transition-colors"
          >
            + Создать кастомный стол
          </button>
        </div>
      </main>
    </div>
  );
}
