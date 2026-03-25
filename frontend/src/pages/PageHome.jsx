// AEGIS — Home / Landing Page
import { COLORS as T, PROJECT, AGENTS } from "../constants.js";
import { Tag, Mono } from "../components/UI.jsx";

export default function PageHome({ onNav }) {
  const modules = [
    { id: "simulation", icon: "⬡", title: "Simulation Room",     color: T.cyan,   desc: "AI agents reason, bid and negotiate live over shared memory resources." },
    { id: "protocol",   icon: "◈", title: "Protocol Visualizer", color: T.gold,   desc: "Animated MESI state machine — watch locks transition FREE→LOCKED→CONTESTED→RESOLVED." },
    { id: "analysis",   icon: "✦", title: "Research Analysis",   color: T.orange, desc: "Performance metrics, charts and protocol comparison data." },
    { id: "architecture",icon:"⟁", title: "System Architecture", color: T.purple, desc: "LangGraph flow, system design, full tech stack and academic references." },
  ];

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
      {/* Ambient background */}
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse 80% 50% at 50% -5%, ${T.cyan}09, transparent)`, pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: "60%", left: "-10%", width: 400, height: 400, borderRadius: "50%", background: T.purple, filter: "blur(120px)", opacity: 0.04, pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: "20%", right: "-5%", width: 300, height: 300, borderRadius: "50%", background: T.gold, filter: "blur(100px)", opacity: 0.04, pointerEvents: "none" }} />
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: 160, background: `linear-gradient(transparent,${T.cyan}015,transparent)`, pointerEvents: "none", zIndex: 0, animation: "scan 12s linear infinite" }} />

      {/* Top bar */}
      <div style={{ padding: "14px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${T.border}`, background: `${T.panel}cc`, backdropFilter: "blur(12px)", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <svg width="22" height="22" viewBox="0 0 22 22"><polygon points="11,1 21,6 21,16 11,21 1,16 1,6" fill="none" stroke={T.cyan} strokeWidth="1.4" /><circle cx="11" cy="11" r="3" fill={T.cyan} /></svg>
          <Mono color={T.cyan} size={11}>AEGIS · AGENTIC EDGE GRAPH INTELLIGENCE SYSTEM</Mono>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          
        </div>
      </div>

      {/* Hero */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "50px 32px 30px", textAlign: "center" }}>
        <div className="fadein">
          <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 11, fontWeight: 800, color: T.dim, letterSpacing: ".3em", textTransform: "uppercase", marginBottom: 20 }}>
          </div>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 52, fontWeight: 900, lineHeight: 1.05, letterSpacing: ".02em", color: T.white, marginBottom: 12 }}>
            Shared Memory<br />
            <span style={{ color: T.cyan, textShadow: `0 0 40px ${T.cyan}55` }}>Consistency Protocol</span>
          </h1>
          <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, fontWeight: 600, color: T.dim, marginBottom: 24, letterSpacing: ".04em" }}>
            via Agentic AI & LangGraph Multi-Agent Systems
          </h2>
          <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 13, color: T.dim, lineHeight: 1.9, maxWidth: 580, margin: "0 auto 32px", fontWeight: 300 }}>
            A distributed shared-memory system where autonomous AI agents equipped with distinct cognitive
            strategies negotiate resource locks, resolve conflicts via auction-based protocols, and maintain
            consistency using a MESI-inspired state machine — orchestrated through LangGraph's stateful agent graphs.
          </p>

        </div>

        {/* Module cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, width: "100%", maxWidth: 1100, marginBottom: 40 }}>
          {modules.map((m, i) => (
            <button key={m.id} onClick={() => onNav(m.id)} style={{ background: T.card, border: `1px solid ${m.color}33`, borderRadius: 12, padding: "22px 18px", textAlign: "left", color: "inherit", animationDelay: `${i * 0.1}s`, boxShadow: `0 4px 24px ${m.color}08` }} className="fadein">
              <div style={{ fontSize: 28, marginBottom: 12, color: m.color }}>{m.icon}</div>
              <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 14, fontWeight: 800, color: m.color, marginBottom: 8 }}>{m.title}</div>
              <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, color: T.dim, lineHeight: 1.7, fontWeight: 300 }}>{m.desc}</div>
              <div style={{ marginTop: 14, fontFamily: "'DM Mono',monospace", fontSize: 9, color: m.color, letterSpacing: ".1em" }}>OPEN MODULE →</div>
            </button>
          ))}
        </div>

        {/* Tech stack tags */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
          {["LangGraph 0.2", "FastAPI", "React 18", "MESI Protocol", "Multi-Agent", "SSE Streaming", "Python 3.11"].map((t) => (
            <Tag key={t} color={T.dim}>{t}</Tag>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: "12px 32px", borderTop: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", background: `${T.panel}cc` }}>
        <Mono size={8}>© AEGIS · Shared Memory Consistency Protocol</Mono>
      </div>
    </div>
  );
}
