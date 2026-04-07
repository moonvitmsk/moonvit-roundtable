
import { useState } from "react";
import { ChevronDown, ChevronUp, Star } from "lucide-react";
import type { Idea } from "@/lib/types";

interface Props {
  ideas: Idea[];
}

export function IdeaCards({ ideas }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [starred, setStarred] = useState<Set<string>>(new Set());

  if (ideas.length === 0) return null;

  const toggleStar = (id: string) => {
    setStarred((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const sorted = [...ideas].sort((a, b) => b.score - a.score);

  return (
    <div className="border-t border-[var(--color-border)]">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
      >
        <span>Идеи ({ideas.length})</span>
        {expanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {sorted.map((idea) => (
            <div
              key={idea.id}
              className="bg-[var(--color-surface)] rounded-xl p-3 border border-[var(--color-border)]"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="text-sm font-medium text-[var(--color-text-primary)]">
                  {idea.title}
                </h3>
                <button
                  onClick={() => toggleStar(idea.id)}
                  className="shrink-0"
                >
                  <Star
                    size={14}
                    className={
                      starred.has(idea.id)
                        ? "text-yellow-400 fill-yellow-400"
                        : "text-[var(--color-text-muted)]"
                    }
                  />
                </button>
              </div>
              <p className="text-xs text-[var(--color-text-secondary)] mb-2 line-clamp-3">
                {idea.description}
              </p>
              <div className="flex items-center justify-between text-[10px] text-[var(--color-text-muted)]">
                <span>{idea.author}</span>
                {idea.score > 0 && (
                  <span className="px-1.5 py-0.5 rounded bg-[var(--color-primary)]/20 text-[var(--color-primary)]">
                    {idea.score}/10
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
