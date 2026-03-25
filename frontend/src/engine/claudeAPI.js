// AEGIS — Groq API Bridge (Frontend)
// Uses Llama 3.3 70B via Groq — FREE at https://console.groq.com

const GROQ_MODEL   = "llama-3.3-70b-versatile";
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || "";

async function callGroq(system, user, maxTokens = 300) {
  if (!GROQ_API_KEY) return null;
  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model:       GROQ_MODEL,
        max_tokens:  maxTokens,
        temperature: 0.8,
        messages: [
          { role: "system", content: system },
          { role: "user",   content: user   },
        ],
      }),
    });
    const data = await response.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (err) {
    console.warn("Groq API error:", err);
    return null;
  }
}

function safeParseJSON(raw, fallback) {
  try {
    let c = (raw || "").trim();
    if (c.includes("```")) { c = c.split("```")[1] || c; if (c.startsWith("json")) c = c.slice(4); }
    const s = c.indexOf("{"), e = c.lastIndexOf("}") + 1;
    if (s >= 0 && e > s) c = c.slice(s, e);
    return JSON.parse(c);
  } catch { return fallback; }
}

const FALLBACKS = {
  "ARIA-7":  (b) => ({ thought: `Must secure this resource at all costs. Bid ${b.toFixed(1)} dominates.`, bid: b, action: "BID", statement: "Stand aside — this resource is mine." }),
  "NEXUS-3": (b) => ({ thought: `Calculated optimal bid ${b.toFixed(1)} based on deadline urgency.`,       bid: b, action: "BID", statement: "Optimal bid computed. Proceeding." }),
  "VEGA-9":  (b) => ({ thought: `Fairness bid ${b.toFixed(1)} is equitable yet competitive.`,              bid: b, action: "BID", statement: "A fair bid for a fair outcome." }),
  "KRON-∞":  (b) => ({ thought: `Chaos bid ${b.toFixed(1)} will disrupt their models completely.`,         bid: b, action: "BID", statement: "Your predictions are already wrong." }),
};

export async function agentDecide(agent, task, snapshot, agentStats, step, totalSteps) {
  const fallbackBid = Math.round((50 + Math.random() * 35) * 10) / 10;
  const usr = `Step ${step}/${totalSteps}. Task: ${JSON.stringify({ id: task.id, resource: task.resourceId, deadline: task.deadline, reward: task.reward })}. Resource: ${JSON.stringify(snapshot.resources?.[task.resourceId] || {})}. My wins: ${agentStats.wins || 0}. Respond ONLY in JSON.`;
  const raw = await callGroq(agent.system, usr, 280);
  if (!raw) return (FALLBACKS[agent.id] || FALLBACKS["ARIA-7"])(fallbackBid);
  return safeParseJSON(raw, (FALLBACKS[agent.id] || FALLBACKS["ARIA-7"])(fallbackBid));
}

export async function supervisorResolve(contestants, taskInfo, step) {
  const info    = contestants.map((c) => `${c.id}: bid=${c.bid?.toFixed(1)}, says:"${c.statement}"`).join("\n");
  const system  = `You are SUPERVISOR of a multi-agent system. Resolve conflict. JSON only: {"winner":"<id>","rationale":"2 sentences","fairness_score":<1-10>}`;
  const user    = `Resource: ${taskInfo.resourceId} Task: ${taskInfo.id} Reward: ${taskInfo.reward} Step: ${step}\n${info}`;
  const top     = contestants.reduce((a, b) => (a.bid > b.bid ? a : b));
  const fallback= { winner: top.id, rationale: `${top.id} placed highest bid of ${top.bid?.toFixed(1)}. Auction protocol awards the lock.`, fairness_score: 7 };
  const raw     = await callGroq(system, user, 200);
  if (!raw) return fallback;
  return safeParseJSON(raw, fallback);
}
