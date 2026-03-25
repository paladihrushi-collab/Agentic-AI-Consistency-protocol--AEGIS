// AEGIS — Simulation Room Page
// Real Claude AI agents reasoning, bidding and negotiating live
import { useState, useRef, useCallback, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { COLORS as T, AGENTS, RESOURCES } from "../constants.js";
import { Card, SectionHead, Tag, Dot, Mono, ChartTip, ProgressBar } from "../components/UI.jsx";
import { SharedMemory, generateTasks } from "../engine/SharedMemory.js";
import { agentDecide, supervisorResolve } from "../engine/claudeAPI.js";

// ── Agent Terminal Card ────────────────────────────────────────────────────
function AgentCard({ agent, state, thought, wins, reward }) {
  const stMap = {
    IDLE:        { l: "STANDBY",     c: T.dim },
    PERCEIVING:  { l: "PERCEIVING",  c: T.blue },
    REASONING:   { l: "REASONING",   c: agent.hex },
    BIDDING:     { l: "BIDDING",     c: T.gold },
    NEGOTIATING: { l: "NEGOTIATING", c: T.orange },
    EXECUTING:   { l: "EXECUTING",   c: T.green },
    WON:         { l: "WON ✓",       c: T.green },
    LOST:        { l: "LOST",        c: T.red },
  };
  const s = stMap[state] || stMap.IDLE;
  const active = ["REASONING", "BIDDING", "NEGOTIATING", "EXECUTING"].includes(state);

  return (
    <div style={{ background: T.card, borderRadius: 12, overflow: "hidden", border: `1px solid ${active ? agent.hex + "55" : T.border}`, boxShadow: active ? `0 0 30px ${agent.hex}10` : "none", transition: "all .4s", position: "relative" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: active ? agent.hex : T.border, transition: "all .4s" }} />

      {/* Header */}
      <div style={{ padding: "14px 16px", borderBottom: `1px solid ${T.border}`, background: active ? `${agent.hex}07` : "transparent", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: `${agent.hex}15`, border: `1.5px solid ${agent.hex}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, color: agent.hex }}>{agent.glyph}</div>
          <div>
            <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 15, fontWeight: 800, color: agent.hex, letterSpacing: ".06em" }}>{agent.id}</div>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, color: T.dim, marginTop: 1 }}>{agent.role}</div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, justifyContent: "flex-end", marginBottom: 4 }}>
            <Dot color={s.c} active={active} size={7} />
            <Mono color={s.c} size={9}>{s.l}</Mono>
          </div>
          {["REASONING", "PERCEIVING"].includes(state) && (
            <div style={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{ width: 4, height: 4, borderRadius: "50%", background: agent.hex, animation: `glow ${0.6 + i * 0.2}s ease-in-out ${i * 0.15}s infinite` }} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Thought bubble */}
      <div style={{ padding: "14px 16px", minHeight: 110 }}>
        {thought ? (
          <div className="slide">
            <div style={{ fontSize: 8, color: T.dim, fontFamily: "'DM Mono',monospace", letterSpacing: ".14em", marginBottom: 6 }}>⟨ COGNITION · STEP {thought.step} ⟩</div>
            <div style={{ fontSize: 10, color: T.txt, fontFamily: "'DM Mono',monospace", lineHeight: 1.8, fontStyle: "italic", padding: "8px 10px", background: T.panel, borderRadius: 6, borderLeft: `2px solid ${agent.hex}66`, marginBottom: 10 }}>
              "{thought.thought}"
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 9, color: T.dim, fontFamily: "'DM Mono',monospace", flex: 1, lineHeight: 1.5 }}>
                📡 "{thought.statement}"
              </div>
              {thought.bid != null && (
                <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 10 }}>
                  <div style={{ fontSize: 9, color: T.dim, fontFamily: "'DM Mono',monospace" }}>BID</div>
                  <div style={{ fontSize: 24, fontFamily: "'Syne',sans-serif", fontWeight: 900, color: agent.hex, lineHeight: 1 }}>
                    {typeof thought.bid === "number" ? thought.bid.toFixed(1) : "—"}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ color: T.dim, fontSize: 10, fontFamily: "'DM Mono',monospace", textAlign: "center", paddingTop: 24, opacity: 0.5 }}>
            awaiting task assignment…
          </div>
        )}
      </div>

      {/* Stats */}
      <div style={{ padding: "8px 16px", borderTop: `1px solid ${T.border}`, background: `${agent.hex}05`, display: "flex", gap: 14 }}>
        {[{ l: "WINS", v: wins }, { l: "REWARD", v: reward.toFixed(1) + "pts" }].map((m) => (
          <div key={m.l} style={{ display: "flex", gap: 5, alignItems: "baseline" }}>
            <span style={{ fontSize: 16, fontFamily: "'Syne',sans-serif", fontWeight: 900, color: agent.hex }}>{m.v}</span>
            <span style={{ fontSize: 8, color: T.dim, fontFamily: "'DM Mono',monospace", letterSpacing: ".1em" }}>{m.l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Resource Map ───────────────────────────────────────────────────────────
function ResourceMap({ resources }) {
  const agHex = Object.fromEntries(AGENTS.map((a) => [a.id, a.hex]));
  const sc = {
    FREE:      { b: T.border,          bg: "transparent",    c: T.dim },
    LOCKED:    { b: T.green + "55",    bg: `${T.green}08`,   c: T.green },
    CONTESTED: { b: T.orange,          bg: `${T.orange}12`,  c: T.orange },
  };
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 5 }}>
      {Object.values(resources).map((r) => {
        const s = sc[r.state] || sc.FREE;
        return (
          <div key={r.id} style={{ padding: "8px 6px", borderRadius: 7, textAlign: "center", border: `1px solid ${s.b}`, background: s.bg, transition: "all .35s", animation: r.state === "CONTESTED" ? "contested 1.2s infinite" : "none", position: "relative" }}>
            {r.holder && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: agHex[r.holder] || T.dim, borderRadius: "7px 7px 0 0" }} />}
            <div style={{ fontSize: 9, fontFamily: "'Syne',sans-serif", fontWeight: 700, color: s.c }}>{r.id}</div>
            <div style={{ fontSize: 7, fontFamily: "'DM Mono',monospace", color: s.c, opacity: 0.8, marginTop: 1 }}>{r.state}</div>
            {r.holder && <div style={{ fontSize: 7, color: agHex[r.holder] || T.dim, fontFamily: "'DM Mono',monospace", marginTop: 1 }}>{r.holder}</div>}
            {r.contenders?.length > 0 && <div style={{ fontSize: 7, color: T.orange, marginTop: 1 }}>⚔{r.contenders.length + 1}</div>}
          </div>
        );
      })}
    </div>
  );
}

// ── Main Simulation Page ────────────────────────────────────────────────────
export default function PageSimulation() {
  const STEPS = 8;
  const [running, setRunning]           = useState(false);
  const [phase, setPhase]               = useState("STANDBY");
  const [step, setStep]                 = useState(0);
  const [progress, setProgress]         = useState(0);
  const [agSt, setAgSt]                 = useState(() => Object.fromEntries(AGENTS.map((a) => [a.id, { state: "IDLE", thought: null, wins: 0, reward: 0 }])));
  const [snap, setSnap]                 = useState({ resources: {} });
  const [events, setEvents]             = useState([]);
  const [verdict, setVerdict]           = useState(null);
  const [isResolving, setIsResolving]   = useState(false);
  const [chart, setChart]               = useState([]);
  const [done, setDone]                 = useState([]);
  const stopRef  = useRef(false);
  const agStRef  = useRef(agSt);
  const evRef    = useRef();
  useEffect(() => { agStRef.current = agSt; }, [agSt]);
  useEffect(() => { if (evRef.current) evRef.current.scrollTop = evRef.current.scrollHeight; }, [events]);

  const setA = (id, u) => setAgSt((p) => ({ ...p, [id]: { ...p[id], ...u } }));

  const run = useCallback(async () => {
    stopRef.current = false;
    const mem = new SharedMemory();
    const tasks = generateTasks(STEPS);
    mem.init(RESOURCES, tasks);
    setAgSt(Object.fromEntries(AGENTS.map((a) => [a.id, { state: "IDLE", thought: null, wins: 0, reward: 0 }])));
    setEvents([]); setChart([]); setDone([]); setVerdict(null);
    setStep(0); setProgress(0); setRunning(true); setPhase("INITIALIZING");
    setSnap(mem.snapshot());
    await new Promise((r) => setTimeout(r, 500));

    for (let s = 1; s <= STEPS && !stopRef.current; s++) {
      setStep(s); setProgress((s - 1) / STEPS);
      const avail = mem.available();
      if (!avail.length) { setPhase("ALL TASKS COMPLETE"); break; }

      const pairs = AGENTS.map((agent, i) => {
        const sorted = [...avail].sort((a, b) => a.deadline - b.deadline);
        return { agent, task: sorted[i % sorted.length] };
      });

      pairs.forEach(({ agent }) => setA(agent.id, { state: "PERCEIVING" }));
      setPhase(`STEP ${s}/${STEPS} — PERCEIVING`);
      await new Promise((r) => setTimeout(r, 400));

      pairs.forEach(({ agent }) => setA(agent.id, { state: "REASONING" }));
      setPhase(`STEP ${s}/${STEPS} — AGENTS REASONING`);

      const decisions = await Promise.all(
        pairs.map(async ({ agent, task }) => {
          const cur = agStRef.current[agent.id];
          const decision = await agentDecide(agent, task, mem.snapshot(), cur, s, STEPS);
          setA(agent.id, { state: "BIDDING", thought: { ...decision, step: s } });
          return { agent, task, decision };
        })
      );

      await new Promise((r) => setTimeout(r, 700));

      const byRes = {};
      decisions.forEach((d) => { (byRes[d.task.resourceId] = byRes[d.task.resourceId] || []).push(d); });
      let stepConflicts = 0, stepReward = 0;

      for (const [rid, group] of Object.entries(byRes)) {
        if (stopRef.current) break;
        group.forEach(({ agent, task, decision }) => mem.requestLock(rid, agent.id, decision.bid || 50));

        let winner;
        if (group.length > 1) {
          stepConflicts++;
          setPhase(`STEP ${s} — ⚔ CONFLICT: ${rid}`);
          group.forEach(({ agent }) => setA(agent.id, { state: "NEGOTIATING" }));
          setIsResolving(true);

          const contestants = group.map(({ agent, decision }) => ({ id: agent.id, bid: decision.bid || 50, statement: decision.statement || "Strategic bid." }));
          const v = await supervisorResolve(contestants, group[0].task, s);
          setVerdict(v); setIsResolving(false);
          mem.resolveContest(rid, v.winner, contestants.find((c) => c.id === v.winner)?.bid || 50);
          winner = group.find(({ agent }) => agent.id === v.winner);
          group.filter(({ agent }) => agent.id !== v.winner).forEach(({ agent }) => setA(agent.id, { state: "LOST" }));
          await new Promise((r) => setTimeout(r, 600));
        } else {
          winner = group[0];
        }

        if (winner) {
          setA(winner.agent.id, { state: "EXECUTING" });
          await new Promise((r) => setTimeout(r, 350));
          const result = mem.completeTask(winner.task.id, winner.agent.id, s);
          if (result) {
            stepReward += result.reward;
            setAgSt((p) => ({ ...p, [winner.agent.id]: { ...p[winner.agent.id], state: "WON", wins: (p[winner.agent.id].wins || 0) + 1, reward: (p[winner.agent.id].reward || 0) + result.reward } }));
            setDone((p) => [...p, { taskId: winner.task.id, agentId: winner.agent.id, label: winner.agent.id, hex: winner.agent.hex, glyph: winner.agent.glyph, reward: result.reward, onTime: result.onTime, step: s }]);
          }
        }
      }

      AGENTS.forEach((a) => setAgSt((p) => { const c = p[a.id]; if (c.state === "WON" || c.state === "LOST") return { ...p, [a.id]: { ...c, state: "IDLE" } }; return p; }));
      setSnap(mem.snapshot()); setEvents(mem.events(100));
      setChart((p) => [...p, { step: s, conflicts: stepConflicts, reward: Math.round(stepReward * 10) / 10 }]);
      setPhase(`STEP ${s} COMPLETE`);
      await new Promise((r) => setTimeout(r, 400));
    }
    setProgress(1); setPhase("SIMULATION COMPLETE"); setRunning(false);
  }, []);

  const totW = Object.values(agSt).reduce((s, a) => s + (a.wins || 0), 0);
  const totR = Object.values(agSt).reduce((s, a) => s + (a.reward || 0), 0);
  const totC = chart.reduce((s, c) => s + (c.conflicts || 0), 0);
  const agHex = Object.fromEntries(AGENTS.map((a) => [a.id, a.hex]));
  const evColor = (e) => e.includes("COMPLETED") ? T.green : e.includes("CONTESTED") ? T.orange : e.includes("RESOLVED") ? T.cyan : e.includes("GRANTED") ? T.blue : T.dim;

  return (
    <div>
      {/* Header row */}
      <div style={{ padding: "10px 0 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 900, color: T.white }}>Simulation Room</h2>
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: T.dim, marginTop: 3 }}>AI agents negotiating shared memory resources in real-time</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", gap: 0, border: `1px solid ${T.border}`, borderRadius: 8, overflow: "hidden" }}>
            {[{ l: "STEP", v: `${step}/${STEPS}`, c: T.cyan }, { l: "WINS", v: totW, c: T.green }, { l: "REWARD", v: totR.toFixed(0), c: T.gold }, { l: "CONFLICTS", v: totC, c: T.orange }].map((m, i) => (
              <div key={m.l} style={{ padding: "7px 14px", background: i % 2 === 0 ? T.panel : T.card, textAlign: "center", borderRight: i < 3 ? `1px solid ${T.border}` : "none" }}>
                <div style={{ fontSize: 15, fontFamily: "'Syne',sans-serif", fontWeight: 900, color: m.c }}>{m.v}</div>
                <div style={{ fontSize: 8, color: T.dim, fontFamily: "'DM Mono',monospace", letterSpacing: ".1em" }}>{m.l}</div>
              </div>
            ))}
          </div>
          {running
            ? <button onClick={() => { stopRef.current = true; }} style={{ padding: "8px 18px", background: `${T.red}15`, border: `1px solid ${T.red}44`, color: T.red, borderRadius: 7, fontFamily: "'DM Mono',monospace", fontSize: 10 }}>◼ STOP</button>
            : <button onClick={run} style={{ padding: "8px 20px", background: `${T.cyan}18`, border: `1px solid ${T.cyan}55`, color: T.cyan, borderRadius: 7, fontFamily: "'DM Mono',monospace", fontSize: 10, boxShadow: `0 0 18px ${T.cyan}22` }}>▶ LAUNCH AGENTS</button>
          }
        </div>
      </div>

      <ProgressBar value={progress} color={T.cyan} />
      <div style={{ marginBottom: 14, marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}>
        <Dot color={running ? T.cyan : T.dim} active={running} size={7} />
        <Mono color={running ? T.cyan : T.dim} size={10}>{phase}</Mono>
      </div>

      {/* 2×2 Agent grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
        {AGENTS.map((a) => {
          const as = agSt[a.id];
          return <AgentCard key={a.id} agent={a} state={as.state} thought={as.thought} wins={as.wins || 0} reward={as.reward || 0} />;
        })}
      </div>

      {/* Bottom row: Supervisor | Resource map | Events+Chart */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 14 }}>
        {/* Supervisor */}
        <Card glow={isResolving} color={T.cyan}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, border: `1.5px solid ${T.cyan}44`, background: `${T.cyan}10`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="14" height="14" viewBox="0 0 14 14"><polygon points="7,1 13,4 13,10 7,13 1,10 1,4" fill="none" stroke={T.cyan} strokeWidth="1.2" /><circle cx="7" cy="7" r="2" fill={T.cyan} /></svg>
            </div>
            <div>
              <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 12, fontWeight: 800, color: T.cyan }}>SUPERVISOR</div>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, color: T.dim }}>LangGraph conflict arbiter</div>
            </div>
            {isResolving && <div style={{ marginLeft: "auto" }}><Dot color={T.cyan} active size={8} /></div>}
          </div>
          {verdict ? (
            <div className="slide" style={{ padding: "10px 12px", background: T.panel, borderRadius: 8, borderLeft: `2px solid ${T.cyan}77` }}>
              <div style={{ fontSize: 8, color: T.cyan, fontFamily: "'DM Mono',monospace", letterSpacing: ".12em", marginBottom: 6 }}>⚖ VERDICT</div>
              <div style={{ fontSize: 10, color: T.txt, fontFamily: "'DM Mono',monospace", lineHeight: 1.75, marginBottom: 8 }}>{verdict.rationale}</div>
              <div style={{ display: "flex", gap: 6 }}><Tag color={T.green}>WINNER: {verdict.winner}</Tag><Tag color={T.cyan}>FAIR: {verdict.fairness_score}/10</Tag></div>
            </div>
          ) : (
            <div style={{ padding: 12, background: T.panel, borderRadius: 8, textAlign: "center" }}>
              <Mono size={10}>{isResolving ? "Resolving conflict…" : "No active conflict"}</Mono>
            </div>
          )}
        </Card>

        {/* Resource map */}
        <Card>
          <SectionHead label="Shared Memory Map" sub={`${Object.values(snap.resources || {}).filter((r) => r.state === "FREE").length}/${RESOURCES.length} resources free`} />
          <ResourceMap resources={snap.resources || {}} />
        </Card>

        {/* Events + Chart */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Card style={{ flex: 1 }}>
            <SectionHead label="Memory Event Stream" />
            <div ref={evRef} style={{ height: 165, overflowY: "auto", fontFamily: "'DM Mono',monospace", fontSize: 9, lineHeight: 1.85 }}>
              {!events.length ? <div style={{ color: T.dim, textAlign: "center", paddingTop: 30 }}>awaiting events…</div>
                : events.map((ev, i) => (
                  <div key={i} className="slide" style={{ display: "flex", gap: 6, padding: "1px 0", borderBottom: `1px solid ${T.faint}` }}>
                    <span style={{ color: T.dim, minWidth: 30 }}>t{ev.clock}</span>
                    <span style={{ color: evColor(ev.event), minWidth: 90 }}>{ev.event}</span>
                    <span style={{ color: agHex[ev.agent] || T.dim, minWidth: 55 }}>{ev.agent}</span>
                    <span style={{ color: T.txt, minWidth: 60 }}>{ev.resource}</span>
                    {ev.value > 0 && <span style={{ color: T.gold, marginLeft: "auto" }}>+{ev.value}</span>}
                  </div>
                ))}
            </div>
          </Card>
          <Card style={{ padding: "12px 14px" }}>
            <SectionHead label="Live Metrics" />
            <ResponsiveContainer width="100%" height={90}>
              <LineChart data={chart} margin={{ top: 0, right: 0, bottom: 0, left: -28 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={T.faint} />
                <XAxis dataKey="step" tick={{ fill: T.dim, fontSize: 8, fontFamily: "'DM Mono',monospace" }} />
                <YAxis tick={{ fill: T.dim, fontSize: 8 }} />
                <Tooltip content={<ChartTip />} />
                <Line type="monotone" dataKey="conflicts" name="Conflicts" stroke={T.orange} strokeWidth={2} dot={{ fill: T.orange, r: 2 }} />
                <Line type="monotone" dataKey="reward" name="Reward" stroke={T.green} strokeWidth={2} dot={{ fill: T.green, r: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </div>
      </div>

      {/* Completed tasks */}
      {done.length > 0 && (
        <Card>
          <SectionHead label={`Completed Tasks · ${done.length} total`} />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {done.slice().reverse().map((d, i) => (
              <div key={i} className="slide" style={{ padding: "8px 12px", borderRadius: 8, background: `${d.hex}0d`, border: `1px solid ${d.hex}33`, display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ fontSize: 16, color: d.hex }}>{d.glyph}</span>
                <div>
                  <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 11, fontWeight: 700, color: d.hex }}>{d.label}</div>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, color: T.dim }}>{d.taskId} · s{d.step}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 14, fontFamily: "'Syne',sans-serif", fontWeight: 900, color: d.onTime ? T.green : T.orange }}>+{d.reward.toFixed(1)}</div>
                  <div style={{ fontSize: 7, color: d.onTime ? T.green : T.orange, fontFamily: "'DM Mono',monospace" }}>{d.onTime ? "ON-TIME" : "LATE"}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Pre-launch intro */}
      {!running && step === 0 && (
        <div style={{ marginTop: 16, padding: "28px", background: `${T.cyan}06`, border: `1px solid ${T.cyan}22`, borderRadius: 12, textAlign: "center" }} className="fadein">
          <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 20, fontWeight: 900, color: T.cyan, marginBottom: 10 }}>Four AI Agents · Powered by LLM</div>
          <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: T.dim, lineHeight: 2, maxWidth: 600, margin: "0 auto 20px" }}>
            Each agent independently reasons about shared memory state, forms a bid strategy based on its personality, and broadcasts a public statement to competitors. When two agents contest the same resource, a Supervisor LLM resolves the conflict.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
            {AGENTS.map((a) => (
              <div key={a.id} style={{ padding: "10px 14px", background: `${a.hex}0d`, border: `1px solid ${a.hex}33`, borderRadius: 8, textAlign: "left", width: 190 }}>
                <div style={{ display: "flex", gap: 7, alignItems: "center", marginBottom: 5 }}>
                  <span style={{ fontSize: 16, color: a.hex }}>{a.glyph}</span>
                  <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 12, fontWeight: 800, color: a.hex }}>{a.id}</div>
                </div>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, color: T.dim, lineHeight: 1.7 }}>{a.role}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
