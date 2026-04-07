import { useState } from "react";
import type { AgentConfig, Phase, RoundtableTemplate } from "@/lib/types";
import type { PromptConfig } from "@/lib/prompt-presets";
import { COMPANY_CONTEXT_DEFAULT, GOAL_PRESETS, TASK_PRESETS, buildFullPrompt } from "@/lib/prompt-presets";
import { AgentPicker } from "./AgentPicker";
import { PromptConfigurator } from "./PromptConfigurator";
import { ArrowLeft, Play } from "lucide-react";

interface Props {
  template: RoundtableTemplate;
  onStart: (topic: string, agents: AgentConfig[], phases: Phase[], brandContext: string) => void;
  onBack: () => void;
}

export function SessionSetup({ template, onStart, onBack }: Props) {
  const [topic, setTopic] = useState("");
  const [agents, setAgents] = useState<AgentConfig[]>([...template.agents]);
  const [enabledPhases, setEnabledPhases] = useState<Set<string>>(
    new Set(template.phases.map((p) => p.id))
  );
  const [promptConfig, setPromptConfig] = useState<PromptConfig>({
    companyContext: COMPANY_CONTEXT_DEFAULT,
    goals: GOAL_PRESETS[0].prompt,
    taskType: TASK_PRESETS[0].agentInstruction,
    customInstructions: "",
  });

  const togglePhase = (id: string) => {
    setEnabledPhases((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size <= 1) return prev;
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleStart = () => {
    if (!topic.trim()) return;
    const activePhases = template.phases.filter((p) => enabledPhases.has(p.id));
    const fullBrandContext = buildFullPrompt(promptConfig);
    onStart(topic.trim(), agents, activePhases, fullBrandContext);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 overflow-y-auto max-h-screen">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors mb-6"
      >
        <ArrowLeft size={16} /> Назад к шаблонам
      </button>

      <div className="flex items-center gap-3 mb-8">
        <span className="text-4xl">{template.icon}</span>
        <div>
          <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">
            {template.name}
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {template.description}
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <label className="text-sm font-medium text-[var(--color-text-primary)] block mb-2">
            Тема обсуждения
          </label>
          <textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Опишите задачу для обсуждения..."
            rows={3}
            className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-4 py-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-primary)] resize-none"
            autoFocus
          />
        </div>

        <PromptConfigurator value={promptConfig} onChange={setPromptConfig} />

        <AgentPicker agents={agents} onChange={setAgents} />

        <div>
          <h3 className="text-sm font-medium text-[var(--color-text-primary)] mb-3">
            Фазы
          </h3>
          <div className="flex flex-wrap gap-2">
            {template.phases.map((phase) => {
              const active = enabledPhases.has(phase.id);
              return (
                <button
                  key={phase.id}
                  onClick={() => togglePhase(phase.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-all ${
                    active
                      ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                      : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-border-light)]"
                  }`}
                >
                  <span>{phase.icon}</span>
                  {phase.name}
                </button>
              );
            })}
          </div>
        </div>

        <button
          onClick={handleStart}
          disabled={!topic.trim()}
          className="w-full flex items-center justify-center gap-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium py-3 rounded-xl transition-colors text-sm"
        >
          <Play size={16} /> Начать обсуждение
        </button>
      </div>
    </div>
  );
}
