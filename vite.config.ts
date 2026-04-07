import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { spawn } from "child_process";
import { createConnection } from "net";

function serverPlugin() {
  let proc: ReturnType<typeof spawn> | null = null;

  const isPortFree = (port: number) =>
    new Promise<boolean>((resolve) => {
      const s = createConnection({ port, host: "127.0.0.1" });
      s.on("connect", () => { s.destroy(); resolve(false); });
      s.on("error", () => resolve(true));
    });

  return {
    name: "roundtable-server",
    async configureServer() {
      const free = await isPortFree(3132);
      if (!free) {
        console.log("[roundtable] server.js already running on :3132");
        return;
      }
      proc = spawn("node", ["server.js"], {
        cwd: process.cwd(),
        stdio: "inherit",
        shell: false,
      });
      proc.on("error", (e) => console.error("[roundtable] server error:", e.message));
      console.log("[roundtable] server.js started on :3132");
      const cleanup = () => { if (proc) { proc.kill("SIGTERM"); proc = null; } };
      process.on("exit", cleanup);
      process.on("SIGINT", cleanup);
      process.on("SIGTERM", cleanup);
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), serverPlugin()],
  resolve: {
    alias: { "@": "/src" },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3132",
        changeOrigin: true,
        timeout: 600000,
        headers: { "X-Accel-Buffering": "no" },
      },
    },
  },
});
