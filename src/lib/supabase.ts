import { createClient } from "@supabase/supabase-js";
import type { Session } from "./types";

const SUPABASE_URL = "https://zfihygjekrheimvrpdtp.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmaWh5Z2pla3JoZWltdnJwZHRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzNDI1NTUsImV4cCI6MjA4ODkxODU1NX0.YKjiLRjC2fleApuarnl1JjoPXBRwH5BIBcr5UiyOs98";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

let supabaseAvailable: boolean | null = null;

async function checkTable(): Promise<boolean> {
  if (supabaseAvailable !== null) return supabaseAvailable;
  const { error } = await supabase
    .from("roundtable_sessions")
    .select("id")
    .limit(1);
  supabaseAvailable = !error;
  if (error) console.warn("[supabase] table not found, using localStorage fallback");
  return supabaseAvailable;
}

export async function saveSession(session: Session): Promise<void> {
  // Always save to localStorage as backup
  try {
    localStorage.setItem(`rt-session-${session.id}`, JSON.stringify(session));
  } catch {}

  if (!(await checkTable())) return;

  const { error } = await supabase
    .from("roundtable_sessions")
    .upsert({
      id: session.id,
      template_id: session.templateId,
      topic: session.topic,
      status: session.status,
      agents: session.agents,
      phases: session.phases,
      messages: session.messages,
      ideas: session.ideas,
      current_phase: session.currentPhase,
      current_round: session.currentRound,
      current_agent_index: session.currentAgentIndex,
      brand_context: session.brandContext,
      created_at: new Date(session.createdAt).toISOString(),
      updated_at: new Date().toISOString(),
    });
  if (error) console.error("[supabase] save:", error.message);
}

export async function loadSession(id: string): Promise<Session | null> {
  if (await checkTable()) {
    const { data } = await supabase
      .from("roundtable_sessions")
      .select("*")
      .eq("id", id)
      .single();
    if (data) return dbToSession(data);
  }

  // Fallback to localStorage
  try {
    const stored = localStorage.getItem(`rt-session-${id}`);
    if (stored) return JSON.parse(stored);
  } catch {}
  return null;
}

export async function listSessions(): Promise<
  { id: string; topic: string; status: string; created_at: string; template_id: string }[]
> {
  if (await checkTable()) {
    const { data } = await supabase
      .from("roundtable_sessions")
      .select("id, topic, status, created_at, template_id")
      .order("created_at", { ascending: false })
      .limit(20);
    if (data && data.length > 0) return data;
  }

  // Fallback: scan localStorage
  const results: { id: string; topic: string; status: string; created_at: string; template_id: string }[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith("rt-session-")) continue;
      const s = JSON.parse(localStorage.getItem(key)!);
      results.push({
        id: s.id,
        topic: s.topic,
        status: s.status,
        created_at: new Date(s.createdAt).toISOString(),
        template_id: s.templateId,
      });
    }
  } catch {}
  return results.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

function dbToSession(data: Record<string, unknown>): Session {
  return {
    id: data.id as string,
    templateId: data.template_id as string,
    topic: data.topic as string,
    agents: data.agents as Session["agents"],
    phases: data.phases as Session["phases"],
    messages: (data.messages as Session["messages"]) || [],
    currentPhase: data.current_phase as number,
    currentRound: data.current_round as number,
    currentAgentIndex: data.current_agent_index as number,
    status: data.status as Session["status"],
    createdAt: new Date(data.created_at as string).getTime(),
    ideas: (data.ideas as Session["ideas"]) || [],
    brandContext: data.brand_context as string,
  };
}

export { supabase };
