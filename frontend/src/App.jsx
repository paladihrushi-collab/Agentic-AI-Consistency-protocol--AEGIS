// AEGIS — Root Application with Sidebar Navigation
import { useState } from "react";
import { COLORS as T, GLOBAL_CSS } from "./constants.js";
import PageHome         from "./pages/PageHome.jsx";
import PageSimulation   from "./pages/PageSimulation.jsx";
import PageSearch       from "./pages/PageSearch.jsx";
import PageProtocol     from "./pages/PageProtocol.jsx";
import PageAnalysis     from "./pages/PageAnalysis.jsx";
import PageArchitecture from "./pages/PageArchitecture.jsx";

const NAV = [
  { id: "home",         label: "HOME",         icon: "⌂" },
  { id: "simulation",   label: "SIMULATION",   icon: "⬡" },
  { id: "search",       label: "SEARCH",       icon: "◉" },
  { id: "protocol",     label: "PROTOCOL",     icon: "◈" },
  { id: "analysis",     label: "ANALYSIS",     icon: "✦" },
  { id: "architecture", label: "ARCHITECTURE", icon: "⟁" },
];

export default function App() {
  const [page, setPage] = useState("home");

  // Landing page gets full screen
  if (page === "home") {
    return (
      <>
        <style>{GLOBAL_CSS}</style>
        <PageHome onNav={setPage} />
      </>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.txt }}>
      <style>{GLOBAL_CSS}</style>

      {/* Ambient scanline */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: 160, background: `linear-gradient(transparent,${T.cyan}008,transparent)`, pointerEvents: "none", zIndex: 0, animation: "scan 12s linear infinite" }} />

      {/* ── SIDEBAR ── */}
      <aside style={{
        position: "fixed", left: 0, top: 0, bottom: 0, width: 200,
        background: `${T.panel}f5`, borderRight: `1px solid ${T.border}`,
        backdropFilter: "blur(20px)", zIndex: 200,
        display: "flex", flexDirection: "column", padding: "20px 0",
      }}>
        {/* Logo */}
        <div style={{ padding: "0 20px 20px", borderBottom: `1px solid ${T.border}`, marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <svg width="20" height="20" viewBox="0 0 20 20">
              <polygon points="10,1 19,5.5 19,14.5 10,19 1,14.5 1,5.5" fill="none" stroke={T.cyan} strokeWidth="1.3" />
              <circle cx="10" cy="10" r="2.5" fill={T.cyan} />
            </svg>
            <span style={{ fontFamily: "'Syne',sans-serif", fontSize: 17, fontWeight: 900, color: T.cyan, letterSpacing: ".1em", textShadow: `0 0 16px ${T.cyan}55` }}>AEGIS</span>
          </div>
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 7, color: T.dim, lineHeight: 1.7, letterSpacing: ".06em" }}>
            SHARED MEMORY<br />CONSISTENCY PROTOCOL
          </div>
        </div>

        {/* Nav links */}
        <div style={{ flex: 1, padding: "0 10px" }}>
          {NAV.map((n) => (
            <button key={n.id} onClick={() => setPage(n.id)} style={{
              width: "100%", textAlign: "left", padding: "10px 12px", marginBottom: 3,
              background: page === n.id ? `${T.cyan}15` : "transparent",
              border: `1px solid ${page === n.id ? T.cyan + "44" : T.border}`,
              borderRadius: 7, color: page === n.id ? T.cyan : T.dim,
              fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: ".1em",
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <span style={{ fontSize: 14 }}>{n.icon}</span>
              {n.label}
            </button>
          ))}
        </div>

        {/* Version */}
        <div style={{ padding: "12px 16px", borderTop: `1px solid ${T.border}` }}>
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 7, color: T.dim, lineHeight: 1.85, opacity: 0.6 }}>
            AEGIS v2.0<br />
            Multi-Agent Protocol
          </div>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main style={{ marginLeft: 200, padding: "24px 28px", minHeight: "100vh" }}>
        {page === "simulation"   && <PageSimulation />}
        {page === "search"       && <PageSearch />}
        {page === "protocol"     && <PageProtocol />}
        {page === "analysis"     && <PageAnalysis />}
        {page === "architecture" && <PageArchitecture />}
      </main>
    </div>
  );
}
