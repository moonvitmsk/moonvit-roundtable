"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import type { Session } from "@/lib/types";
import { useRoundtable } from "@/hooks/useRoundtable";
import { RoundtableChat } from "@/components/RoundtableChat";
import { PhaseIndicator } from "@/components/PhaseIndicator";
import { ControlPanel } from "@/components/ControlPanel";
import { IdeaCards } from "@/components/IdeaCards";

const VERSION = "0.1.0";

export default function SessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem(`session-${id}`);
    if (stored) {
      setSession(JSON.parse(stored));
    } else {
      router.push("/");
    }
  }, [id, router]);

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-sm text-[var(--color-text-muted)]">Загрузка...</div>
      </div>
    );
  }

  return <SessionView session={session} />;
}

function SessionView({ session: initialSession }: { session: Session }) {
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
      {/* Header */}
      <header className="flex items-center justify-between gap-4 border-b border-[var(--color-border)] px-4 py-2.5 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => window.location.href = "/"}
            className="text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors shrink-0"
          >
            moonvit roundtable
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
          <PhaseIndicator
            phases={session.phases}
            currentPhase={session.currentPhase}
          />
          <ControlPanel
            status={session.status}
            onPause={pause}
            onResume={resume}
            onSkipPhase={skipPhase}
            onExport={handleExport}
          />
        </div>
      </header>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border-b border-red-500/20 px-4 py-2 text-xs text-red-400">
          {error}
        </div>
      )}

      {/* Main */}
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

      {/* Ideas */}
      <IdeaCards ideas={session.ideas} />
    </div>
  );
}
