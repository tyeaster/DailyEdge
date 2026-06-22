export const colors = {
  background: "#020617",
  foreground: "#f8fafc",
  surface: {
    base: "#020617",
    raised: "#0f172a",
    overlay: "rgba(15, 23, 42, 0.8)",
  },
  border: {
    subtle: "rgba(255, 255, 255, 0.1)",
    strong: "rgba(255, 255, 255, 0.15)",
    accent: "rgba(103, 232, 249, 0.4)",
  },
  brand: {
    blueLight: "#93c5fd",
    blue: "#3b82f6",
    blueStrong: "#2563eb",
  },
  state: {
    success: "#34d399",
    warning: "#fde047",
    danger: "#f87171",
  },
  text: {
    primary: "#ffffff",
    secondary: "#cbd5e1",
    muted: "#94a3b8",
    inverse: "#020617",
  },
} as const;
