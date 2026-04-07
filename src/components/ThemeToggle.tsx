import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const [light, setLight] = useState(() => {
    try { return localStorage.getItem("theme") === "light"; } catch { return false; }
  });

  useEffect(() => {
    document.documentElement.classList.toggle("light", light);
    try { localStorage.setItem("theme", light ? "light" : "dark"); } catch {}
  }, [light]);

  return (
    <button
      onClick={() => setLight((v) => !v)}
      className="p-1.5 rounded-lg hover:bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
      title={light ? "Тёмная тема" : "Светлая тема"}
    >
      {light ? <Moon size={16} /> : <Sun size={16} />}
    </button>
  );
}
