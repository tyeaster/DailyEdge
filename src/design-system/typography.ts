export const typography = {
  fontSans: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
  fontMono: "SFMono-Regular, Consolas, Liberation Mono, monospace",
  heading: {
    hero: "text-5xl font-semibold tracking-tight sm:text-6xl lg:text-7xl",
    section: "text-3xl font-semibold tracking-tight sm:text-5xl",
    card: "text-xl font-semibold",
  },
  body: {
    base: "leading-7 text-slate-300",
    large: "text-lg leading-8 text-slate-300",
    small: "text-sm leading-6 text-slate-400",
  },
} as const;
