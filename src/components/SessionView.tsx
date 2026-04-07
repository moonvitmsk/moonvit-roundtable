import { useEffect, useState } from "react";
import type { Session } from "@/lib/types";
import { useRoundtable } from "@/hooks/useRoundtable";
import { RoundtableChat } from "./RoundtableChat";
import { PhaseIndicator } from "./PhaseIndicator";
import { ControlPanel } from "./ControlPanel";
import { IdeaCards } from "./IdeaCards";
import { ArrowLeft } from "lucide-react";

const VERSION = "0.1.0";

interface Props {
  session: Session;
  onBack: () => void;
}

export function SessionView({ session: initialSession, onBack }: Props) {
  const {
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
  } = useRoundtable(initialSession);

  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!started && session.status === "setup") {
      setStarted(true);
      runSession();
    }
  }, [started, session.status, runSession]);

  const handleExport = () => {
    const md = exportMarkdown();
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `roundtable-${session.id.slice(0, 8)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-screen">
      <header className="flex items-center justify-between gap-4 border-b border-[var(--color-border)] px-4 py-2.5 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors shrink-0"
          >
            <ArrowLeft size={14} />
            <span className="hidden sm:inline">moonvit roundtable</span>
          </button>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-surface)] text-[var(--color-text-muted)] shrink-0">
            v{VERSION}
          </span>
          <span className="text-[var(--color-border)]">|</span>
          <span className="text-sm text-[var(--color-text-primary)] truncate">
            {session.topic}
          </span>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <PhaseIndicator phases={session.phases} currentPhase={session.currentPhase} />
          <ControlPanel
            status={session.status}
            onPause={pause}
            onResume={resume}
            onSkipPhase={skipPhase}
            onExport={handleExport}
          />
        </div>
      </header>

      {error && (
        <div className="bg-red-500/10 border-b border-red-500/20 px-4 py-2 text-xs text-red-400">
          {error}
        </div>
      )}

      <RoundtableChat
        messages={session.messages}
        agents={session.agents}
        currentAgent={currentAgent}
        isStreaming={isStreaming}
        streamingText={streamingText}
        thinkingText={thinkingText}
        status={session.status}
        onIntervene={intervene}
      />

      <IdeaCards ideas={session.ideas} />
    </div>
  );
}
