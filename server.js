// Moonvit Roundtable Server — Claude CLI + Express + SSE
import express from "express";
import cors from "cors";
import { spawn } from "child_process";
import { resolve } from "path";

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

const PORT = 3132;
const activeProcesses = new Map();

function sendSSE(res, data) {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

// ── Run Claude CLI ──────────────────────────────────────────
function runClaude(key, systemPrompt, userMessage, { onChunk } = {}) {
  return new Promise((resolveP) => {
    const fullPrompt = userMessage;

    const args = [
      resolve("node_modules/@anthropic-ai/claude-code/cli.js"),
      "--print",
      "--output-format", "stream-json",
      "--verbose",
      "--permission-mode", "bypassPermissions",
      "--model", "opus",
      "--allowedTools", "",
      "--system-prompt", systemPrompt,
    ];

    // Use OS temp dir as cwd — must be outside D:\DX tree to avoid CLAUDE.md
    const sandboxDir = process.env.TEMP || process.env.TMP || "/tmp";
    const proc = spawn(process.execPath, args, {
      cwd: sandboxDir,
      shell: false,
      env: { ...process.env, FORCE_COLOR: "0" },
    });
    proc.stdin.setDefaultEncoding("utf8");
    proc.stdin.write(Buffer.from(fullPrompt, "utf8"));
    proc.stdin.end();

    activeProcesses.set(key, proc);

    let fullText = "";
    let buffer = "";

    proc.stdout.on("data", (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const msg = JSON.parse(line);
          if (msg.type === "assistant" && msg.message?.content) {
            for (const block of msg.message.content) {
              if (block.type === "thinking") {
                if (onChunk) onChunk({ type: "thinking", text: block.thinking });
              } else if (block.type === "text") {
                fullText += block.text;
                if (onChunk) onChunk({ type: "text", text: block.text });
              }
            }
          } else if (msg.type === "content_block_delta") {
            if (msg.delta?.type === "thinking_delta") {
              if (onChunk) onChunk({ type: "thinking", text: msg.delta.thinking });
            } else if (msg.delta?.type === "text_delta") {
              fullText += msg.delta.text;
              if (onChunk) onChunk({ type: "text", text: msg.delta.text });
            }
          } else if (msg.type === "result") {
            if (msg.result && !fullText.trim()) {
              fullText = msg.result;
              if (onChunk) onChunk({ type: "text", text: msg.result });
            } else if (msg.result) {
              fullText = msg.result;
            }
          }
        } catch {}
      }
    });

    proc.stderr.on("data", () => {});

    proc.on("close", (code, sig) => {
      activeProcesses.delete(key);
      resolveP({ fullText, code, killed: !!sig });
    });

    proc.on("error", (err) => {
      activeProcesses.delete(key);
      resolveP({ fullText: "", code: 1, error: err.message });
    });
  });
}

// ── POST /api/chat — SSE stream ─────────────────────────────
app.post("/api/chat", (req, res) => {
  const { systemPrompt, userMessage, agentMeta } = req.body || {};

  if (!systemPrompt || !userMessage || !agentMeta) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  sendSSE(res, { type: "agent_meta", agent: agentMeta });

  const key = `agent-${agentMeta.id}-${Date.now()}`;
  let clientDisconnected = false;

  req.on("close", () => {
    clientDisconnected = true;
  });

  runClaude(key, systemPrompt, userMessage, {
    onChunk: (chunk) => {
      if (!clientDisconnected && !res.writableEnded) sendSSE(res, chunk);
    },
  }).then(({ fullText, error }) => {
    if (!res.writableEnded) {
      if (error) sendSSE(res, { type: "error", error });
      sendSSE(res, { type: "done", fullText });
      res.end();
    }
  });
});

// ── GET /api/health ─────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", version: "0.1.0", timestamp: Date.now() });
});

// ── POST /api/abort — kill running process ──────────────────
app.post("/api/abort", (req, res) => {
  const { key } = req.body;
  if (key && activeProcesses.has(key)) {
    activeProcesses.get(key).kill("SIGTERM");
    activeProcesses.delete(key);
  }
  if (!key) {
    for (const [k, proc] of activeProcesses) {
      proc.kill("SIGTERM");
      activeProcesses.delete(k);
    }
  }
  res.json({ ok: true, remaining: activeProcesses.size });
});

app.listen(PORT, () => {
  console.log(`[roundtable] server running on http://localhost:${PORT}`);
});
