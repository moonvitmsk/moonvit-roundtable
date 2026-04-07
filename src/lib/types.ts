export interface AgentConfig {
  id: string;
  name: string;
  role: string;
  systemPrompt: string;
  outputPrompt?: string;  // формат вывода, отдельно от system prompt
  avatar: string;
  color: string;
  expertise: string[];
}

export interface Phase {
  id: string;
  name: string;
  description: string;
  icon: string;
  roundsPerAgent: number;
  agentInstruction: string;
  parallel: boolean;
}

export interface RoundtableTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  agents: AgentConfig[];
  phases: Phase[];
  brandContext: string;
}

export interface ChatMessage {
  id: string;
  agentId: string;
  agentName: string;
  agentColor: string;
  agentAvatar: string;
  content: string;
  thinking?: string;
  phase: string;
  round: number;
  timestamp: number;
  type:
    | "idea"
    | "critique"
    | "synthesis"
    | "intervention"
    | "phase_change"
    | "message";
}

export interface Session {
  id: string;
  templateId: string;
  topic: string;
  agents: AgentConfig[];
  phases: Phase[];
  messages: ChatMessage[];
  currentPhase: number;
  currentRound: number;
  currentAgentIndex: number;
  status: "setup" | "running" | "paused" | "completed";
  createdAt: number;
  ideas: Idea[];
  brandContext: string;
}

export interface Idea {
  id: string;
  title: string;
  description: string;
  author: string;
  supporters: string[];
  critics: string[];
  score: number;
  phase: string;
  tags: string[];
}

export interface SSEEvent {
  type: "agent_meta" | "thinking" | "text" | "done" | "error" | "session_update";
  text?: string;
  agent?: { id: string; name: string; color: string; avatar: string };
  session?: Partial<Session>;
  error?: string;
}
