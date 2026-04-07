"use client";

import type { Phase } from "@/lib/types";

interface Props {
  phases: Phase[];
  currentPhase: number;
}

export function PhaseIndicator({ phases, currentPhase }: Props) {
  return (
    <div className="flex items-center gap-1">
      {phases.map((phase, idx) => {
        const isActive = idx === currentPhase;
        const isDone = idx < currentPhase;

        return (
          <div key={phase.id} className="flex items-center gap-1">
            {idx > 0 && (
              <div
                className={`w-4 h-px ${
                  isDone
                    ? "bg-[var(--color-primary)]"
                    : "bg-[var(--color-border)]"
                }`}
              />
            )}
            <div
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-all ${
                isActive
                  ? "bg-[var(--color-primary)]/20 text-[var(--color-primary)] font-medium"
                  : isDone
                  ? "text-[var(--color-text-secondary)]"
                  : "text-[var(--color-text-muted)]"
              }`}
            >
              <span>{phase.icon}</span>
              <span className="hidden sm:inline">{phase.name}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
