import { useState } from "react";
import { ChevronDown, ChevronRight, Settings } from "lucide-react";
import {
  COMPANY_CONTEXT_DEFAULT,
  GOAL_PRESETS,
  TASK_PRESETS,
  type PromptConfig,
} from "@/lib/prompt-presets";

interface Props {
  value: PromptConfig;
  onChange: (config: PromptConfig) => void;
}

export function PromptConfigurator({ value, onChange }: Props) {
  const [expandCompany, setExpandCompany] = useState(false);
  const [expandCustom, setExpandCustom] = useState(false);

  const selectedGoal = GOAL_PRESETS.find((g) => g.prompt === value.goals);
  const selectedTask = TASK_PRESETS.find((t) => t.agentInstruction === value.taskType);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium text-[var(--color-text-primary)]">
        <Settings size={16} className="text-[var(--color-primary)]" />
        Настройка промптов
      </div>

      {/* 1. Контекст компании */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden">
        <button
          onClick={() => setExpandCompany(!expandCompany)}
          className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-[var(--color-surface-hover)] transition-colors"
        >
          <div className="flex items-center gap-2 text-sm">
            {expandCompany ? <ChevronDown size={14} className="text-[var(--color-text-muted)]" /> : <ChevronRight size={14} className="text-[var(--color-text-muted)]" />}
            <span className="text-[var(--color-text-primary)]">О компании</span>
            <span className="text-xs text-[var(--color-text-muted)]">
              {value.companyContext === COMPANY_CONTEXT_DEFAULT ? "(по умолчанию)" : "(изменён)"}
            </span>
          </div>
        </button>
        {expandCompany && (
          <div className="px-3 pb-3 border-t border-[var(--color-border)]">
            <textarea
              value={value.companyContext}
              onChange={(e) => onChange({ ...value, companyContext: e.target.value })}
              rows={10}
              className="w-full mt-2 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-xs text-[var(--color-text-primary)] font-mono focus:outline-none focus:border-[var(--color-primary)] resize-y"
            />
            <button
              onClick={() => onChange({ ...value, companyContext: COMPANY_CONTEXT_DEFAULT })}
              className="text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-primary)] mt-1 transition-colors"
            >
              Сбросить к умолчанию
            </button>
          </div>
        )}
      </div>

      {/* 2. Цель */}
      <div>
        <label className="text-xs text-[var(--color-text-muted)] block mb-1.5">Цель компании</label>
        <div className="flex flex-wrap gap-1.5">
          {GOAL_PRESETS.map((g) => (
            <button
              key={g.id}
              onClick={() => onChange({ ...value, goals: g.prompt })}
              className={`px-2.5 py-1.5 rounded-lg text-xs border transition-all ${
                selectedGoal?.id === g.id
                  ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                  : "border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-light)]"
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
        {selectedGoal && (
          <div className="mt-2 bg-[var(--color-surface)] rounded-lg p-2 text-[10px] text-[var(--color-text-muted)] font-mono max-h-16 overflow-y-auto">
            {selectedGoal.prompt}
          </div>
        )}
      </div>

      {/* 3. Тип задачи */}
      <div>
        <label className="text-xs text-[var(--color-text-muted)] block mb-1.5">Тип задачи</label>
        <div className="grid grid-cols-2 gap-1.5">
          {TASK_PRESETS.map((t) => (
            <button
              key={t.id}
              onClick={() => onChange({ ...value, taskType: t.agentInstruction })}
              className={`text-left px-2.5 py-2 rounded-lg text-xs border transition-all ${
                selectedTask?.id === t.id
                  ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10"
                  : "border-[var(--color-border)] hover:border-[var(--color-border-light)]"
              }`}
            >
              <div className={selectedTask?.id === t.id ? "text-[var(--color-primary)] font-medium" : "text-[var(--color-text-secondary)]"}>
                {t.label}
              </div>
              <div className="text-[10px] text-[var(--color-text-muted)] mt-0.5">{t.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* 4. Дополнительные инструкции */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden">
        <button
          onClick={() => setExpandCustom(!expandCustom)}
          className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-[var(--color-surface-hover)] transition-colors"
        >
          <div className="flex items-center gap-2 text-sm">
            {expandCustom ? <ChevronDown size={14} className="text-[var(--color-text-muted)]" /> : <ChevronRight size={14} className="text-[var(--color-text-muted)]" />}
            <span className="text-[var(--color-text-primary)]">Доп. инструкции</span>
          </div>
        </button>
        {expandCustom && (
          <div className="px-3 pb-3 border-t border-[var(--color-border)]">
            <textarea
              value={value.customInstructions}
              onChange={(e) => onChange({ ...value, customInstructions: e.target.value })}
              placeholder="Бюджет, сроки, ограничения, фокус..."
              rows={3}
              className="w-full mt-2 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-xs text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-primary)] resize-y"
            />
          </div>
        )}
      </div>
    </div>
  );
}
