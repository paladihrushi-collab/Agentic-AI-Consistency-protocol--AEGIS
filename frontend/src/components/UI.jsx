// AEGIS — Reusable UI Primitives
import { COLORS as T } from "../constants.js";

export const Dot = ({ color, active, size = 8 }) => (
  <span style={{ position: "relative", display: "inline-flex", width: size, height: size, flexShrink: 0 }}>
    {active && (
      <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: color, opacity: 0.45, animation: "pulse 1.5s infinite" }} />
    )}
    <span style={{ width: size, height: size, borderRadius: "50%", background: active ? color : T.dim, position: "relative" }} />
  </span>
);

export const Tag = ({ children, color = T.dim }) => (
  <span style={{ fontSize: 9, fontFamily: "'DM Mono',monospace", letterSpacing: ".08em", color, border: `1px solid ${color}44`, background: `${color}10`, padding: "2px 8px", borderRadius: 3, whiteSpace: "nowrap" }}>
    {children}
  </span>
);

export const Mono = ({ children, color = T.dim, size = 9 }) => (
  <span style={{ fontFamily: "'DM Mono',monospace", fontSize: size, color, letterSpacing: ".08em" }}>
    {children}
  </span>
);

export const SectionHead = ({ label, sub }) => (
  <div style={{ marginBottom: 14 }}>
    <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 11, fontWeight: 800, color: T.dim, textTransform: "uppercase", letterSpacing: ".2em" }}>{label}</div>
    {sub && <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: T.dim, marginTop: 3, opacity: 0.7 }}>{sub}</div>}
  </div>
);

export const Card = ({ children, style, glow, color = T.cyan }) => (
  <div style={{
    background: T.card, border: `1px solid ${glow ? color + "44" : T.border}`,
    borderRadius: 12, padding: 18, position: "relative", overflow: "hidden",
    boxShadow: glow ? `0 0 30px ${color}10, inset 0 0 40px ${color}04` : "none",
    transition: "all .3s", ...style,
  }}>
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg,transparent,${glow ? color + "55" : T.border},transparent)` }} />
    {children}
  </div>
);

export const ChartTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: T.card, border: `1px solid ${T.hi}`, borderRadius: 6, padding: "8px 12px", fontFamily: "'DM Mono',monospace", fontSize: 10 }}>
      <div style={{ color: T.dim, marginBottom: 3 }}>Step {label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color }}>{p.name}: <b>{typeof p.value === "number" ? p.value.toFixed(2) : p.value}</b></div>
      ))}
    </div>
  );
};

export const ProgressBar = ({ value, color = T.cyan }) => (
  <div style={{ height: 2, background: T.border, borderRadius: 2, overflow: "hidden" }}>
    <div style={{ height: "100%", width: `${Math.min(100, value * 100)}%`, background: `linear-gradient(90deg,${color}88,${color})`, transition: "width .4s ease", boxShadow: `0 0 8px ${color}` }} />
  </div>
);
