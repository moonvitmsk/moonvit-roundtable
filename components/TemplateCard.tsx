"use client";

import type { RoundtableTemplate } from "@/lib/types";
import { ArrowRight } from "lucide-react";

interface Props {
  template: RoundtableTemplate;
  onSelect: (template: RoundtableTemplate) => void;
}

export function TemplateCard({ template, onSelect }: Props) {
  return (
    <button
      onClick={() => onSelect(template)}
      className="group w-full text-left bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] border border-[var(--color-border)] hover:border-[var(--color-border-light)] rounded-2xl p-5 transition-all"
    >
      <div className="flex items-center gap-3 mb-3">
        <span className="text-3xl">{template.icon}</span>
        <div>
          <h3 className="text-base font-semibold text-[var(--color-text-primary)]">
            {template.name}
          </h3>
          <p className="text-xs text-[var(--color-text-secondary)]">
            {template.agents.length} агентов
          </p>
        </div>
      </div>

      <p className="text-sm text-[var(--color-text-secondary)] mb-4 leading-relaxed">
        {template.description}
      </p>

      <div className="flex items-center gap-2 mb-4">
        {template.agents.map((agent) => (
          <div
            key={agent.id}
            className="w-7 h-7 rounded-full flex items-center justify-center text-sm"
            style={{ backgroundColor: agent.color + "20" }}
            title={agent.name}
          >
            {agent.avatar}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-1 text-xs text-[var(--color-primary)] group-hover:gap-2 transition-all">
        Запустить <ArrowRight size={14} />
      </div>
    </button>
  );
}
