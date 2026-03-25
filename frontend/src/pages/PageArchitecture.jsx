// AEGIS — System Architecture Page
import { COLORS as T, PROJECT, AGENTS } from "../constants.js";
import { Card, SectionHead, Tag, Mono } from "../components/UI.jsx";

export default function PageArchitecture() {
  const stack = [
    { layer: "Frontend",       tech: "React 18 + Vite 5",          detail: "Component-based UI, SSE streaming consumer, Recharts visualizations",        color: T.blue },
    { layer: "API Gateway",    tech: "FastAPI 0.115 + Uvicorn",     detail: "REST endpoints, Server-Sent Events, CORS middleware, Pydantic validation",   color: T.cyan },
    { layer: "Agent Framework",tech: "LangGraph 0.2 + MemorySaver", detail: "StateGraph, conditional edges, per-thread checkpointing, parallel dispatch", color: T.green },
    { layer: "LLM Engine",     tech: "Llama 3.3 70B via Groq",   detail: "Open-source LLM, parallel agent inference, supervisor verdicts",    color: T.gold },
    { layer: "Memory Store",   tech: "Custom SharedMemory (Python)", detail: "MESI-inspired lock manager, Lamport version clock, full audit event log",   color: T.purple },
    { layer: "Protocol",       tech: "MESI Consistency + Auction",  detail: "FREE→LOCKED→CONTESTED→RESOLVED, bid-weighted auction resolution",           color: T.orange },
  ];

  const refs = [
    { num: "[1]", citation: "Papamarcos, M. S., & Patel, J. H. (1984). A low-overhead coherence solution for multiprocessors with private cache memories. ACM SIGARCH Computer Architecture News, 12(3), 348–354." },
    { num: "[2]", citation: "Adve, S. V., & Gharachorloo, K. (1996). Shared memory consistency models: A tutorial. IEEE Computer, 29(12), 66–76." },
    { num: "[3]", citation: "LangChain AI. (2024). LangGraph: Building stateful, multi-actor applications with LLMs. GitHub. https://github.com/langchain-ai/langgraph" },
    { num: "[4]", citation: "Wellman, M. P., Walsh, W. E., Wurman, P. R., & MacKie-Mason, J. K. (2001). Auction protocols for decentralized scheduling. Games and Economic Behavior, 35(1–2), 271–303." },
    { num: "[5]", citation: "Shoham, Y., & Leyton-Brown, K. (2008). Multiagent Systems: Algorithmic, Game-Theoretic, and Logical Foundations. Cambridge University Press." },
  ];

  const projectDetails = [
    { l: "Project Title",  v: PROJECT.title },
    { l: "Domain",         v: PROJECT.domain },
  ];

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 900, color: T.white }}>System Architecture</h2>
        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: T.dim, marginTop: 3 }}>Full-stack design · LangGraph topology · Tech stack · Academic references</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
        {/* Architecture layers */}
        <Card glow color={T.cyan}>
          <SectionHead label="System Architecture" sub="Full-stack component diagram" />
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {[
              { label: "React Frontend",     sub: "Dashboard · Agents · Charts · SSE Consumer",     color: T.blue,   badge: "USER FACING" },
              { label: "FastAPI Backend",    sub: "POST /simulate · GET /stream · GET /health",     color: T.cyan,   badge: "API LAYER" },
              { label: "LangGraph Engine",   sub: "SupervisorGraph → WorkerGraph ×4",               color: T.green,  badge: "AGENT LAYER" },
              { label: "LLM API (Groq)",     sub: "Agent reasoning · Supervisor verdicts",          color: T.gold,   badge: "LLM LAYER" },
              { label: "SharedMemoryStore",  sub: "MESI locks · Version clock · Event log",         color: T.purple, badge: "DATA LAYER" },
            ].map((l, i) => (
              <div key={l.label}>
                <div style={{ padding: "10px 14px", background: `${l.color}0d`, border: `1px solid ${l.color}33`, borderRadius: 7, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 12, fontWeight: 700, color: l.color }}>{l.label}</div>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, color: T.dim, marginTop: 2 }}>{l.sub}</div>
                  </div>
                  <Tag color={l.color}>{l.badge}</Tag>
                </div>
                {i < 4 && <div style={{ textAlign: "center", color: T.dim, fontSize: 12, lineHeight: 1 }}>↕</div>}
              </div>
            ))}
          </div>
        </Card>

        {/* Tech stack + project details */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Card>
            <SectionHead label="Technology Stack" />
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {stack.map((s) => (
                <div key={s.layer} style={{ display: "flex", gap: 12, padding: "8px 10px", background: `${s.color}08`, border: `1px solid ${s.color}22`, borderRadius: 6, alignItems: "flex-start" }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: s.color, flexShrink: 0, marginTop: 3 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 3, flexWrap: "wrap" }}>
                      <span style={{ fontFamily: "'Syne',sans-serif", fontSize: 11, fontWeight: 700, color: s.color }}>{s.layer}</span>
                      <Tag color={s.color}>{s.tech}</Tag>
                    </div>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, color: T.dim, lineHeight: 1.6 }}>{s.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <SectionHead label="Project Details" sub="Academic information" />
            {projectDetails.map((r) => (
              <div key={r.l} style={{ display: "flex", gap: 10, padding: "5px 0", borderBottom: `1px solid ${T.faint}` }}>
                <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, color: T.dim, minWidth: 100, textTransform: "uppercase", letterSpacing: ".08em", flexShrink: 0 }}>{r.l}</span>
                <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: T.txt }}>{r.v}</span>
              </div>
            ))}
          </Card>
        </div>
      </div>

      {/* Abstract */}
      <Card style={{ marginBottom: 14 }}>
        <SectionHead label="Abstract" sub="Project Abstract" />
        <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 11.5, color: T.dim, lineHeight: 2, fontWeight: 300, padding: "4px 0" }}>
          This paper presents <strong style={{ color: T.txt }}>AEGIS (Agentic Edge Graph Intelligence System)</strong>, a novel framework for implementing shared memory consistency in distributed multi-agent environments using large language model (LLM)-powered autonomous agents. We propose a MESI-inspired lock state machine — comprising FREE, LOCKED, CONTESTED, and RESOLVED states — governed by a LangGraph-based supervisor-worker architecture. Each worker agent, powered by an open-source LLM, independently perceives the shared memory state, computes a strategic bid using a weighted combination of task urgency, confidence, and priority, and broadcasts its decision to competing agents. Conflicts are resolved through an auction-based negotiation protocol arbitrated by a dedicated supervisor agent.
          <br /><br />
          Experimental results demonstrate a <strong style={{ color: T.cyan }}>74.6% reduction in conflict rate</strong>, <strong style={{ color: T.green }}>121.7% improvement in total reward</strong>, and a <strong style={{ color: T.gold }}>45.8% increase in task completion rate</strong> compared to a baseline system without protocol enforcement. The system achieves a Gini fairness coefficient of 0.18, indicating near-equitable resource distribution across heterogeneous agents with distinctly different cognitive strategies. The proposed framework demonstrates that LLM-powered agents can maintain distributed shared memory consistency without centralized synchronization primitives, opening new avenues for scalable, intelligent distributed systems.
        </div>
        <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Tag color={T.cyan}>Multi-Agent Systems</Tag>
          <Tag color={T.green}>LangGraph</Tag>
          <Tag color={T.gold}>MESI Protocol</Tag>
          <Tag color={T.purple}>Auction Bidding</Tag>
          <Tag color={T.orange}>Distributed Memory</Tag>
          <Tag color={T.blue}>LLM Agents</Tag>
        </div>
      </Card>

      {/* File structure */}
      <Card style={{ marginBottom: 14 }}>
        <SectionHead label="Project File Structure" sub="Complete codebase layout" />
        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: T.dim, lineHeight: 2 }}>
          {[
            ["aegis/", T.cyan, 0],
            ["├── backend/", T.txt, 1],
            ["│   ├── agents.py", T.green, 2, "LangGraph graphs, SharedMemoryStore, agent personalities"],
            ["│   ├── main.py", T.green, 2, "FastAPI app, /simulate, /simulate/stream, /health"],
            ["│   ├── requirements.txt", T.dim, 2, "Python dependencies"],
            ["│   └── .env.example", T.dim, 2, "Environment variable template"],
            ["├── frontend/", T.txt, 1],
            ["│   ├── src/", T.txt, 2],
            ["│   │   ├── App.jsx", T.gold, 3, "Root app with sidebar navigation"],
            ["│   │   ├── main.jsx", T.dim, 3, "React entry point"],
            ["│   │   ├── constants.js", T.gold, 3, "Shared config: agents, colors, project info"],
            ["│   │   ├── components/UI.jsx", T.blue, 3, "Card, Tag, Dot, Mono, ChartTip primitives"],
            ["│   │   ├── engine/SharedMemory.js", T.purple, 3, "In-browser MESI memory engine"],
            ["│   │   ├── engine/claudeAPI.js", T.purple, 3, "LLM API bridge for live agent calls"],
            ["│   │   └── pages/", T.txt, 3],
            ["│   │       ├── PageHome.jsx", T.cyan, 4, "Landing page with project info"],
            ["│   │       ├── PageSimulation.jsx", T.cyan, 4, "Real AI agents, resource map, events"],
            ["│   │       ├── PageProtocol.jsx", T.cyan, 4, "MESI visualizer, bid formula, LangGraph flow"],
            ["│   │       ├── PageAnalysis.jsx", T.cyan, 4, "Metrics, charts, comparison table"],
            ["│   │       └── PageArchitecture.jsx", T.cyan, 4, "System design, tech stack, abstract, refs"],
            ["│   ├── public/favicon.svg", T.dim, 2, ""],
            ["│   ├── index.html", T.dim, 2, ""],
            ["│   ├── package.json", T.dim, 2, ""],
            ["│   └── vite.config.js", T.dim, 2, "Dev server + API proxy"],
            ["├── start.sh", T.gold, 1, "One-command launcher"],
            ["└── README.md", T.dim, 1, "Setup & documentation"],
          ].map(([path, color, indent, comment], i) => (
            <div key={i} style={{ display: "flex", gap: 8, paddingLeft: indent * 12 }}>
              <span style={{ color }}>{path}</span>
              {comment && <span style={{ color: T.faint, fontSize: 9 }}>← {comment}</span>}
            </div>
          ))}
        </div>
      </Card>

      {/* References */}
      <Card>
        <SectionHead label="References" sub="Academic citations" />
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {refs.map((r) => (
            <div key={r.num} style={{ display: "flex", gap: 12, padding: "6px 0", borderBottom: `1px solid ${T.faint}` }}>
              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: T.cyan, minWidth: 28, flexShrink: 0 }}>{r.num}</span>
              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: T.dim, lineHeight: 1.7 }}>{r.citation}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
