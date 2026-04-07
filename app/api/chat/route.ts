import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 300;

export async function POST(request: Request) {
  const body = await request.json();
  const { systemPrompt, userMessage, agentMeta } = body as {
    systemPrompt: string;
    userMessage: string;
    agentMeta: { id: string; name: string; color: string; avatar: string };
  };

  if (!systemPrompt || !userMessage || !agentMeta) {
    return new Response(
      JSON.stringify({ error: "Missing required fields" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const anthropic = new Anthropic({ apiKey });

  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
        );
      };

      send({ type: "agent_meta", agent: agentMeta });

      try {
        const stream = await anthropic.messages.create({
          model: "claude-opus-4-6-20250415",
          max_tokens: 16000,
          thinking: { type: "enabled", budget_tokens: 10000 },
          temperature: 1,
          system: systemPrompt,
          messages: [{ role: "user", content: userMessage }],
          stream: true,
        });

        for await (const event of stream) {
          if (event.type === "content_block_delta") {
            const delta = event.delta as unknown as Record<string, string>;
            if (delta.type === "thinking_delta") {
              send({ type: "thinking", text: delta.thinking });
            } else if (delta.type === "text_delta") {
              send({ type: "text", text: delta.text });
            }
          }
        }

        send({ type: "done" });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        send({ type: "error", error: message });
      }

      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
