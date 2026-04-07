
import { Pause, Play, SkipForward, Download } from "lucide-react";

interface Props {
  status: "setup" | "running" | "paused" | "completed";
  onPause: () => void;
  onResume: () => void;
  onSkipPhase: () => void;
  onExport: () => void;
}

export function ControlPanel({
  status,
  onPause,
  onResume,
  onSkipPhase,
  onExport,
}: Props) {
  return (
    <div className="flex items-center gap-2">
      {status === "running" ? (
        <button
          onClick={onPause}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] text-xs transition-colors"
        >
          <Pause size={14} />
          <span className="hidden sm:inline">Пауза</span>
        </button>
      ) : status === "paused" ? (
        <button
          onClick={onResume}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs transition-colors"
        >
          <Play size={14} />
          <span className="hidden sm:inline">Продолжить</span>
        </button>
      ) : null}

      {(status === "running" || status === "paused") && (
        <button
          onClick={onSkipPhase}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] text-xs transition-colors"
        >
          <SkipForward size={14} />
          <span className="hidden sm:inline">Пропустить фазу</span>
        </button>
      )}

      <button
        onClick={onExport}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] text-xs transition-colors"
      >
        <Download size={14} />
        <span className="hidden sm:inline">Экспорт</span>
      </button>
    </div>
  );
}
