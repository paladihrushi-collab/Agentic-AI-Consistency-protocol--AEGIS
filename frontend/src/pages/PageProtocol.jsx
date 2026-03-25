// AEGIS — Protocol Visualizer Page
import { useState, useEffect } from "react";
import { COLORS as T } from "../constants.js";
import { Card, SectionHead, Tag, Mono } from "../components/UI.jsx";

const STATE_INFO = {
  FREE: {
    color: "#00d97e", label: "FREE",
    desc: "Resource available. No agent holds a lock. Version clock at rest. Any agent may issue a lock request.",
    mesi: "Invalid (I) — cache line not held by any processor",
    icon: "○",
  },
  LOCK_REQUEST: {
    color: "#4da6ff", label: "LOCK REQUEST",
    desc: "Agent issues request_lock(resourceId, agentId, bid). Shared memory inspects state. If FREE → grant immediately. If LOCKED → mark CONTESTED.",
    mesi: "Shared (S) → transitioning to Exclusive attempt",
    icon: "→",
  },
  LOCKED: {
    color: "#00e5c8", label: "LOCKED (Exclusive)",
    desc: "Single agent holds exclusive lock. Version clock increments. All other agents blocked on this resource. Task execution begins immediately.",
    mesi: "Exclusive (E) — single writer, no sharing",
    icon: "◉",
  },
  CONTESTED: {
    color: "#ff6b35", label: "CONTESTED",
    desc: "Multiple agents requested the same resource simultaneously. Lock state = CONTESTED. Contenders list populated. Supervisor notified. Auction begins.",
    mesi: "Modified (M) → conflict detected, arbitration required",
    icon: "⚔",
  },
  NEGOTIATION: {
    color: "#9b59f5", label: "NEGOTIATION",
    desc: "Supervisor LLM reads all agent bids and reasoning. Applies weighted auction: 0.65×confidence + 0.25×urgency + 0.10×priority. Evaluates fairness.",
    mesi: "Supervisor arbitration — external coherence layer",
    icon: "⚖",
  },
  RESOLVED: {
    color: "#f0a500", label: "RESOLVED",
    desc: "Winner announced by Supervisor. Lock granted to highest-bid winner. Losers return to IDLE state. Version clock updated. Task execution begins.",
    mesi: "Winner gains Exclusive (E) lock; others Invalidated (I)",
    icon: "✓",
  },
};

const FLOW = ["FREE", "→", "LOCK_REQUEST", "→", "LOCKED", "→", "CONTESTED", "→", "NEGOTIATION", "→", "RESOLVED", "→", "FREE"];

export default function PageProtocol() {
  const [activeState, setActiveState] = useState("FREE");
  const [animIdx, setAnimIdx]         = useState(0);
  const [playing, setPlaying]         = useState(false);
  const stateKeys = Object.keys(STATE_INFO);

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => {
      setAnimIdx((i) => {
        const next = (i + 1) % stateKeys.length;
        setActiveState(stateKeys[next]);
        if (next === 0) setPlaying(false);
        return next;
      });
    }, 2000);
    return () => clearInterval(t);
  }, [playing]);

  const cur = STATE_INFO[activeState] || STATE_INFO.FREE;

  const bidFormula = [
    { label: "Confidence",    weight: "65%", formula: "conf = rand(0.55, 0.99)",           color: T.cyan,   desc: "Agent's self-assessed probability of task success" },
    { label: "Urgency",       weight: "25%", formula: "urgency = 1 / (1 + steps_left)",    color: T.gold,   desc: "Deadline pressure — tighter deadline = higher urgency" },
    { label: "Priority Boost",weight: "10%", formula: "boost = 1 / agent_priority_rank",   color: T.orange, desc: "Agent's system-level priority hierarchy position" },
  ];

  const clockEvents = [
    ["LOCK_GRANTED",       "clock++, holder=agent_id, version=clock"],
    ["CONTESTED",          "clock++, contenders.push(agent_id)"],
    ["NEGOTIATION_RESOLVED","clock++, winner=highest_bid_agent"],
    ["TASK_COMPLETED",     "clock++, release_lock(), state=FREE"],
    ["LOCK_RELEASED",      "state=FREE, holder=null, contenders=[]"],
  ];

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 900, color: T.white }}>Protocol Visualizer</h2>
        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: T.dim, marginTop: 3 }}>Animated MESI-inspired lock state machine & negotiation protocol</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
        {/* State machine */}
        <Card glow color={cur.color}>
          <SectionHead label="Lock State Machine" sub="MESI-inspired consistency protocol — click a state or animate" />

          {/* State selector buttons */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
            {stateKeys.map((s) => (
              <button key={s} onClick={() => { setActiveState(s); setPlaying(false); }} style={{ padding: "5px 12px", background: activeState === s ? `${STATE_INFO[s].color}22` : T.panel, border: `1px solid ${activeState === s ? STATE_INFO[s].color + "77" : T.border}`, color: activeState === s ? STATE_INFO[s].color : T.dim, borderRadius: 5, fontFamily: "'DM Mono',monospace", fontSize: 8, letterSpacing: ".08em" }}>
                {s}
              </button>
            ))}
          </div>

          {/* Active state display */}
          <div style={{ padding: "24px", background: T.panel, borderRadius: 10, textAlign: "center", marginBottom: 16, border: `1px solid ${cur.color}33`, boxShadow: `0 0 30px ${cur.color}10` }}>
            <div style={{ fontSize: 44, marginBottom: 10, color: cur.color, animation: "float 3s ease-in-out infinite" }}>{cur.icon}</div>
            <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, fontWeight: 900, color: cur.color, marginBottom: 10 }}>{cur.label}</div>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: T.dim, lineHeight: 1.85, maxWidth: 340, margin: "0 auto 14px" }}>{cur.desc}</div>
            <div style={{ padding: "6px 12px", background: `${cur.color}10`, border: `1px solid ${cur.color}22`, borderRadius: 5, display: "inline-block" }}>
              <Mono color={cur.color} size={9}>MESI: {cur.mesi}</Mono>
            </div>
          </div>

          {/* Flow breadcrumb */}
          <div style={{ display: "flex", alignItems: "center", gap: 3, flexWrap: "wrap", justifyContent: "center", marginBottom: 14 }}>
            {FLOW.map((s, i) => (
              <div key={i} style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, color: s === "→" ? T.faint : STATE_INFO[s] ? STATE_INFO[s].color : T.dim, fontWeight: s !== "→" ? "700" : "400" }}>{s}</div>
            ))}
          </div>

          <div style={{ textAlign: "center" }}>
            <button onClick={() => setPlaying(!playing)} style={{ padding: "7px 20px", background: playing ? `${T.orange}15` : `${T.cyan}15`, border: `1px solid ${playing ? T.orange + "44" : T.cyan + "44"}`, color: playing ? T.orange : T.cyan, borderRadius: 6, fontFamily: "'DM Mono',monospace", fontSize: 9 }}>
              {playing ? "◼ STOP ANIMATION" : "▶ ANIMATE FLOW"}
            </button>
          </div>
        </Card>

        {/* Bid formula + clock */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Card>
            <SectionHead label="Auction Bid Formula" sub="Agent decision engine computation" />
            <div style={{ padding: "12px", background: T.panel, borderRadius: 8, textAlign: "center", marginBottom: 14, border: `1px solid ${T.cyan}22` }}>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, color: T.cyan, letterSpacing: ".04em" }}>
                bid = (0.65×conf + 0.25×urgency + 0.10×priority) × 100
              </div>
            </div>
            {bidFormula.map((b) => (
              <div key={b.label} style={{ padding: "10px 12px", background: `${b.color}08`, border: `1px solid ${b.color}22`, borderRadius: 7, marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 12, fontWeight: 700, color: b.color }}>{b.label}</div>
                  <Tag color={b.color}>{b.weight}</Tag>
                </div>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: T.dim, marginBottom: 4, padding: "3px 7px", background: `${b.color}0d`, borderRadius: 3, display: "inline-block" }}>{b.formula}</div>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: T.dim, lineHeight: 1.6 }}>{b.desc}</div>
              </div>
            ))}
          </Card>

          <Card>
            <SectionHead label="Version Clock (Lamport)" sub="Causal ordering of all memory events" />
            <div style={{ padding: "8px 10px", background: T.panel, borderRadius: 6, marginBottom: 10, borderLeft: `2px solid ${T.purple}66`, fontFamily: "'DM Mono',monospace", fontSize: 10, color: T.dim, lineHeight: 1.8 }}>
              Every lock operation increments a global version clock, providing Lamport-style causal ordering across all concurrent agents.
            </div>
            {clockEvents.map(([ev, desc]) => (
              <div key={ev} style={{ display: "flex", gap: 10, padding: "4px 0", borderBottom: `1px solid ${T.faint}`, fontFamily: "'DM Mono',monospace", fontSize: 9 }}>
                <span style={{ color: ev.includes("COMPLET") ? T.green : ev.includes("CONTEST") ? T.orange : ev.includes("RESOLV") ? T.cyan : ev.includes("GRANT") ? T.blue : T.dim, minWidth: 170 }}>{ev}</span>
                <span style={{ color: T.dim }}>{desc}</span>
              </div>
            ))}
          </Card>
        </div>
      </div>

      {/* LangGraph flow */}
      <Card>
        <SectionHead label="LangGraph Execution Graph" sub="Supervisor + worker agent StateGraph topology" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
          {[
            { node: "SupervisorGraph", color: T.cyan,   type: "ORCHESTRATOR", steps: ["initialize()", "dispatch_agents()", "resolve_conflicts()", "compute_metrics()"] },
            { node: "WorkerGraph",     color: T.green,  type: "WORKER ×4",    steps: ["perceive() — observe state", "decide() — compute bid", "act() — request_lock()", "report() — return result"] },
            { node: "SharedMemory",    color: T.gold,   type: "STATE STORE",  steps: ["request_lock(rid,aid,bid)", "resolveContest(rid,winner)", "completeTask(tid,aid,step)", "getSnapshot() → state"] },
            { node: "MemorySaver",     color: T.purple, type: "CHECKPOINT",   steps: ["Per-thread state persist", "Cross-step continuity", "Agent history retention", "Rollback capability"] },
          ].map((n) => (
            <div key={n.node} style={{ padding: "14px", background: T.panel, border: `1px solid ${n.color}22`, borderRadius: 9 }}>
              <div style={{ marginBottom: 4 }}><Tag color={n.color}>{n.type}</Tag></div>
              <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 12, fontWeight: 800, color: n.color, margin: "8px 0 10px" }}>{n.node}</div>
              {n.steps.map((s, i) => (
                <div key={i} style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, color: T.dim, padding: "3px 0", borderBottom: `1px solid ${T.faint}`, lineHeight: 1.5 }}>{s}</div>
              ))}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
