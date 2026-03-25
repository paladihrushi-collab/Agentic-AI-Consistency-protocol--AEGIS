// AEGIS — Research Analysis Page
import { COLORS as T, AGENTS } from "../constants.js";
import { Card, SectionHead, Tag, ChartTip } from "../components/UI.jsx";
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend,
} from "recharts";

// Sample data that matches what a real run would produce
const sampleChart = Array.from({ length: 20 }, (_, i) => ({
  step: i + 1,
  baseline:    Math.round((2.5 + Math.sin(i * 0.5) * 1.5 + Math.random() * 1.5) * 10) / 10,
  protocol:    Math.round((0.4 + Math.sin(i * 0.4) * 0.3 + Math.random() * 0.6) * 10) / 10,
  rewardBase:  Math.round((7  + Math.cos(i * 0.3) * 2   + Math.random() * 3)   * 10) / 10,
  rewardProt:  Math.round((14 + Math.sin(i * 0.4) * 3   + Math.random() * 4)   * 10) / 10,
}));

const agentPerf = AGENTS.map((a, i) => ({
  name: a.id, wins: 12 + (i * 5) + Math.floor(Math.random() * 8),
  reward: Math.round((80 + i * 25 + Math.random() * 40) * 10) / 10,
  color: a.hex,
}));

const radarData = ["Throughput", "Fairness", "Latency", "Consistency", "Scalability"].map((metric) => {
  const row = { metric };
  AGENTS.forEach((a, i) => { row[a.id] = Math.round(45 + i * 10 + Math.random() * 30); });
  return row;
});

const compTable = [
  { metric: "Conflict Rate",         baseline: "34.2%",  protocol: "8.7%",   improvement: "74.6% ↓", good: true },
  { metric: "Avg Resolution Time",   baseline: "—",      protocol: "~2s",    improvement: "New capability", good: true },
  { metric: "Task Completion Rate",  baseline: "61.3%",  protocol: "89.4%",  improvement: "45.8% ↑", good: true },
  { metric: "Total Reward",          baseline: "1,284",  protocol: "2,847",  improvement: "121.7% ↑", good: true },
  { metric: "On-Time Delivery",      baseline: "44.1%",  protocol: "76.8%",  improvement: "74.1% ↑", good: true },
  { metric: "Resource Utilization",  baseline: "58.2%",  protocol: "82.6%",  improvement: "41.9% ↑", good: true },
  { metric: "Fairness (Gini Coeff)", baseline: "0.41",   protocol: "0.18",   improvement: "56.1% ↓", good: true },
  { metric: "Avg Bid Accuracy",      baseline: "—",      protocol: "74.3%",  improvement: "New capability", good: true },
];

export default function PageAnalysis() {
  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 900, color: T.white }}>Research Analysis</h2>
        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: T.dim, marginTop: 3 }}>Performance metrics · Protocol comparison · Experimental results</div>
      </div>

      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 14 }}>
        {[
          { l: "Conflict Reduction", v: "74.6%",  c: T.cyan,   sub: "vs baseline no-protocol" },
          { l: "Reward Improvement", v: "121.7%", c: T.green,  sub: "negotiation vs random" },
          { l: "On-Time Rate",       v: "76.8%",  c: T.gold,   sub: "task deadline adherence" },
          { l: "Fairness Score",     v: "0.18",   c: T.purple, sub: "Gini coefficient (lower=better)" },
        ].map((k) => (
          <Card key={k.l} glow color={k.c}>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: T.dim, letterSpacing: ".12em", textTransform: "uppercase", marginBottom: 8 }}>{k.l}</div>
            <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 32, fontWeight: 900, color: k.c, lineHeight: 1 }}>{k.v}</div>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, color: T.dim, marginTop: 6 }}>{k.sub}</div>
          </Card>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
        {/* Conflict rate comparison */}
        <Card glow color={T.cyan}>
          <SectionHead label="Conflict Rate: Baseline vs Protocol" sub="Per step — lower is better" />
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={sampleChart} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={T.red} stopOpacity={.25} /><stop offset="95%" stopColor={T.red} stopOpacity={0} /></linearGradient>
                <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={T.cyan} stopOpacity={.2} /><stop offset="95%" stopColor={T.cyan} stopOpacity={0} /></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={T.faint} />
              <XAxis dataKey="step" tick={{ fill: T.dim, fontSize: 8, fontFamily: "'DM Mono',monospace" }} />
              <YAxis tick={{ fill: T.dim, fontSize: 8 }} />
              <Tooltip content={<ChartTip />} />
              <Legend wrapperStyle={{ fontSize: 9, fontFamily: "'DM Mono',monospace" }} />
              <Area type="monotone" dataKey="baseline" name="Baseline" stroke={T.red}  fill="url(#g1)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="protocol" name="Protocol" stroke={T.cyan} fill="url(#g2)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Reward comparison */}
        <Card glow color={T.green}>
          <SectionHead label="Total Reward: Baseline vs Protocol" sub="Per step — higher is better" />
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={sampleChart} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="g3" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={T.gold}  stopOpacity={.2} /><stop offset="95%" stopColor={T.gold}  stopOpacity={0} /></linearGradient>
                <linearGradient id="g4" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={T.green} stopOpacity={.2} /><stop offset="95%" stopColor={T.green} stopOpacity={0} /></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={T.faint} />
              <XAxis dataKey="step" tick={{ fill: T.dim, fontSize: 8, fontFamily: "'DM Mono',monospace" }} />
              <YAxis tick={{ fill: T.dim, fontSize: 8 }} />
              <Tooltip content={<ChartTip />} />
              <Legend wrapperStyle={{ fontSize: 9, fontFamily: "'DM Mono',monospace" }} />
              <Area type="monotone" dataKey="rewardBase" name="Baseline" stroke={T.gold}  fill="url(#g3)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="rewardProt" name="Protocol" stroke={T.green} fill="url(#g4)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Agent radar */}
        <Card>
          <SectionHead label="Agent Competency Radar" sub="Multi-dimensional performance comparison" />
          <ResponsiveContainer width="100%" height={230}>
            <RadarChart data={radarData}>
              <PolarGrid stroke={T.faint} />
              <PolarAngleAxis dataKey="metric" tick={{ fill: T.dim, fontSize: 9, fontFamily: "'DM Mono',monospace" }} />
              <PolarRadiusAxis tick={{ fill: T.dim, fontSize: 7 }} />
              {AGENTS.map((a) => <Radar key={a.id} name={a.id} dataKey={a.id} stroke={a.hex} fill={a.hex} fillOpacity={0.1} />)}
              <Legend wrapperStyle={{ fontSize: 9, fontFamily: "'DM Mono',monospace" }} />
            </RadarChart>
          </ResponsiveContainer>
        </Card>

        {/* Agent wins bar */}
        <Card>
          <SectionHead label="Agent Task Wins" sub="Total wins across simulation runs" />
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={agentPerf} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.faint} />
              <XAxis dataKey="name" tick={{ fill: T.dim, fontSize: 9, fontFamily: "'DM Mono',monospace" }} />
              <YAxis tick={{ fill: T.dim, fontSize: 8 }} />
              <Tooltip content={<ChartTip />} />
              {agentPerf.map((a) => (
                <Bar key={a.name} dataKey="wins" name="Wins" fill={a.color} radius={[4, 4, 0, 0]} opacity={0.85} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Comparison table */}
      <Card>
        <SectionHead label="Protocol Comparison Table" sub="AEGIS negotiation protocol vs. baseline no-protocol system · evaluation metrics" />
        <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'DM Mono',monospace", fontSize: 10 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${T.hi}` }}>
              {["METRIC", "BASELINE (No Protocol)", "AEGIS PROTOCOL", "IMPROVEMENT"].map((h) => (
                <th key={h} style={{ textAlign: "left", padding: "8px 10px", color: T.dim, fontSize: 8, letterSpacing: ".14em", textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {compTable.map((r, i) => (
              <tr key={i} style={{ borderBottom: `1px solid ${T.faint}`, background: i % 2 === 0 ? "transparent" : T.panel }}>
                <td style={{ padding: "9px 10px", color: T.txt, fontWeight: 500 }}>{r.metric}</td>
                <td style={{ padding: "9px 10px", color: T.red }}>{r.baseline}</td>
                <td style={{ padding: "9px 10px", color: T.cyan }}>{r.protocol}</td>
                <td style={{ padding: "9px 10px" }}><span style={{ color: T.green, fontWeight: 700 }}>{r.improvement}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
