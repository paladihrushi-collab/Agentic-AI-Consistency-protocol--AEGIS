// AEGIS — Search Engine Module (Full Featured)
// Features: Voice Search, Agent Debate, Protocol Graph, Chat with Results, Export PDF
import { useState, useRef, useCallback, useEffect } from "react";
import { COLORS as T, AGENTS } from "../constants.js";
import { Card, SectionHead, Tag, Dot, Mono } from "../components/UI.jsx";

// ── Agent roles ───────────────────────────────────────────────────────────────
const ROLES = {
  "ARIA-7":  { angle:"Academic & Research",  icon:"📚", color:T.cyan,
    persona:"You are ARIA-7, an aggressive academic research agent. Focus on papers, theories, formal definitions, and academic depth." },
  "NEXUS-3": { angle:"Technical & Practical", icon:"⚙️",  color:T.gold,
    persona:"You are NEXUS-3, a precise technical agent. Focus on implementation details, frameworks, tools, and practical use cases." },
  "VEGA-9":  { angle:"Concepts & Explainers", icon:"📖", color:T.orange,
    persona:"You are VEGA-9, a diplomatic explainer agent. Focus on clear conceptual explanations and intuitive understanding." },
  "KRON-∞":  { angle:"Trends & Insights",     icon:"🔮", color:T.purple,
    persona:"You are KRON-∞, a chaos-driven insights agent. Focus on latest trends, surprising facts, and future directions." },
};
const TYPE_COLOR = { academic:T.cyan, technical:T.gold, concepts:T.orange, trends:T.purple };
const TYPE_ICON  = { academic:"📚", technical:"⚙️", concepts:"📖", trends:"🔮" };
const AGENT_TYPE = { "ARIA-7":"academic","NEXUS-3":"technical","VEGA-9":"concepts","KRON-∞":"trends" };

// ── Groq API ──────────────────────────────────────────────────────────────────
async function callGroq(system, user, maxTokens=400) {
  const key = import.meta.env.VITE_GROQ_API_KEY || "";
  if (!key) return null;
  try {
    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method:"POST",
      headers:{ "Content-Type":"application/json","Authorization":`Bearer ${key}` },
      body: JSON.stringify({ model:"llama-3.3-70b-versatile", max_tokens:maxTokens, temperature:0.75,
        messages:[{role:"system",content:system},{role:"user",content:user}] }),
    });
    const d = await r.json();
    return d.choices?.[0]?.message?.content || null;
  } catch(e){ console.warn("Groq:",e); return null; }
}

function safeJSON(raw, fallback) {
  try {
    let c=(raw||"").trim();
    if(c.includes("```")){c=c.split("```")[1]||c; if(c.startsWith("json"))c=c.slice(4);}
    const s=c.indexOf("{"),e=c.lastIndexOf("}")+1;
    if(s>=0&&e>s)c=c.slice(s,e);
    return JSON.parse(c);
  } catch{return fallback;}
}

// ── Agent search ──────────────────────────────────────────────────────────────
async function agentSearch(agent, query) {
  const role = ROLES[agent.id];
  const bidBase = {"ARIA-7":78,"NEXUS-3":65,"VEGA-9":60,"KRON-∞":55};
  const bid = bidBase[agent.id] + Math.floor(Math.random()*15);
  const sys = `${role.persona}
Respond ONLY in this exact JSON (no markdown):
{"thought":"2-sentence private reasoning","title":"specific result title (max 10 words)","content":"3-4 sentences of real useful information","key_points":["point 1","point 2","point 3"],"bid":${bid},"statement":"short public broadcast to competitors"}`;
  const fallback = { thought:`Analyzing "${query}" from ${role.angle} angle.`, title:`${query} — ${role.angle}`, content:`${query} is an important topic. From a ${role.angle} standpoint, it involves key concepts and practical applications.`, key_points:[`Core concepts of ${query}`,`Practical applications`,`Current research`], bid, statement:`${role.angle} result secured.` };
  const raw = await callGroq(sys, `Generate a ${role.angle} search result for: "${query}"`, 450);
  if(!raw) return fallback;
  const p = safeJSON(raw, fallback);
  return { thought:p.thought||fallback.thought, title:p.title||fallback.title, content:p.content||fallback.content, key_points:p.key_points||fallback.key_points, bid:typeof p.bid==="number"?p.bid:bid, statement:p.statement||fallback.statement };
}

async function supervisorResolve(contestants, query) {
  const info = contestants.map(c=>`${c.id}: bid=${c.bid?.toFixed(1)}, angle="${ROLES[c.id]?.angle}"`).join("\n");
  const top  = contestants.reduce((a,b)=>a.bid>b.bid?a:b);
  const fb   = { winner:top.id, rationale:`${top.id} placed highest bid of ${top.bid?.toFixed(1)} with strongest ${ROLES[top.id]?.angle} coverage.`, fairness_score:8 };
  const raw  = await callGroq(`Resolve search slot conflict. JSON only: {"winner":"<id>","rationale":"2 sentences","fairness_score":<1-10>}`, `Query:"${query}"\n${info}`, 200);
  return safeJSON(raw, fb);
}

async function synthesize(query, results) {
  const ctx = results.map(r=>`[${ROLES[r.agentId]?.angle}]\n${r.title}\n${r.content}`).join("\n\n");
  const raw = await callGroq("You are a research synthesizer. Write a comprehensive 3-paragraph answer combining all agent perspectives. Be informative and directly answer the query.", `Query:"${query}"\n\nAgent results:\n${ctx}`, 600);
  return raw?.trim() || results.map(r=>r.content).join(" ");
}

// ── Slot memory ───────────────────────────────────────────────────────────────
class SlotMemory {
  constructor(n){ this.slots={}; this.log=[]; this.clock=0;
    for(let i=1;i<=n;i++){const id=`Result·${i}`;this.slots[id]={id,state:"FREE",holder:null,result:null,contenders:[],bid:0};} }
  request(sid,agentId,bid){ this.clock++;
    const s=this.slots[sid]; if(!s)return false;
    if(s.state==="FREE"){s.state="LOCKED";s.holder=agentId;s.bid=bid;this._log("SLOT_CLAIMED",agentId,sid,bid);return true;}
    if(!s.contenders.includes(agentId))s.contenders.push(agentId);
    s.state="CONTESTED";this._log("SLOT_CONTESTED",agentId,sid,bid);return false; }
  assign(sid,agentId,result){const s=this.slots[sid];if(s&&s.holder===agentId){s.result=result;this._log("RESULT_ASSIGNED",agentId,sid,0);}}
  resolve(sid,winnerId,bid){const s=this.slots[sid];if(!s)return;s.state="LOCKED";s.holder=winnerId;s.contenders=[];s.bid=bid;this._log("CONTEST_RESOLVED",winnerId,sid,bid);}
  snap(){return JSON.parse(JSON.stringify(this.slots));}
  events(n=80){return this.log.slice(-n);}
  _log(e,a,slot,v){this.log.push({clock:this.clock,event:e,agent:a,slot,value:typeof v==="number"?Math.round(v*100)/100:v});}
}

// ── PDF Export ────────────────────────────────────────────────────────────────
function exportPDF(query, results, summary, debateLog) {
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>AEGIS Search — ${query}</title>
<style>
  body{font-family:Arial,sans-serif;max-width:800px;margin:40px auto;color:#1a1a2e;padding:0 20px;}
  h1{color:#00e5c8;border-bottom:3px solid #00e5c8;padding-bottom:10px;}
  h2{color:#4a4a8a;margin-top:30px;}
  h3{color:#2a2a6a;margin:15px 0 5px;}
  .meta{color:#666;font-size:12px;margin-bottom:30px;}
  .result{border:1px solid #ddd;border-radius:8px;padding:16px;margin:12px 0;background:#f9f9ff;}
  .result-rank{font-size:20px;font-weight:bold;color:#00e5c8;}
  .result-title{font-size:16px;font-weight:bold;margin:4px 0;}
  .result-agent{font-size:11px;color:#888;margin-bottom:8px;}
  .result-content{font-size:13px;line-height:1.7;color:#333;}
  .key-points{margin-top:10px;padding-left:16px;}
  .key-points li{font-size:12px;color:#555;margin:3px 0;}
  .summary{background:#f0fff8;border-left:4px solid #00d97e;padding:16px;border-radius:0 8px 8px 0;margin:16px 0;}
  .summary p{font-size:13px;line-height:1.8;color:#333;margin:0;}
  .debate{background:#fff8f0;border:1px solid #ff6b35;border-radius:8px;padding:16px;margin:12px 0;}
  .debate-turn{margin:8px 0;padding:8px;border-radius:4px;font-size:12px;line-height:1.6;}
  .footer{margin-top:40px;font-size:11px;color:#aaa;text-align:center;border-top:1px solid #eee;padding-top:16px;}
  .badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;margin-right:6px;}
</style></head><body>
<h1>⬡ AEGIS Search Results</h1>
<div class="meta">Query: <strong>${query}</strong> &nbsp;|&nbsp; Generated: ${new Date().toLocaleString()} &nbsp;|&nbsp; Agents: ${AGENTS.map(a=>a.id).join(", ")}</div>

<h2>Synthesized Answer</h2>
<div class="summary"><p>${(summary||"").replace(/\n/g,"<br/>")}</p></div>

<h2>Agent Results (${results.length} perspectives)</h2>
${results.map(r=>`
<div class="result">
  <div class="result-rank">#${r.rank}</div>
  <div class="result-title">${r.title||""}</div>
  <div class="result-agent">${r.agentGlyph||""} ${r.agentId||""} &nbsp;·&nbsp; ${ROLES[r.agentId]?.angle||""} &nbsp;·&nbsp; bid: ${r.bid?.toFixed?.(1)||""}</div>
  <div class="result-content">${r.content||""}</div>
  ${r.key_points?.length?`<ul class="key-points">${r.key_points.map(p=>`<li>${p}</li>`).join("")}</ul>`:""}
</div>`).join("")}

${debateLog?.length?`
<h2>Agent Debate Log</h2>
${debateLog.map(d=>`<div class="debate-turn" style="background:${d.side==="FOR"?"#e8fff4":"#fff0f0"}">
  <strong>${d.agent} (${d.side}):</strong> ${d.argument}
</div>`).join("")}`:""}

<div class="footer">Generated by AEGIS · Agentic Edge Graph Intelligence System · Multi-Agent Search Protocol</div>
</body></html>`;

  const blob = new Blob([html], {type:"text/html"});
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href=url; a.download=`AEGIS_Search_${query.replace(/\s+/g,"_")}_${Date.now()}.html`;
  a.click(); URL.revokeObjectURL(url);
}

// ── Protocol Graph Component ──────────────────────────────────────────────────
function ProtocolGraph({ events }) {
  const stateSeq = ["FREE","LOCK_REQUEST","LOCKED","CONTESTED","NEGOTIATION","RESOLVED"];
  const stateColor = { FREE:T.dim, LOCK_REQUEST:T.blue, LOCKED:T.green, CONTESTED:T.orange, NEGOTIATION:T.purple, RESOLVED:T.cyan };

  // Build transition history from events
  const transitions = [];
  events.forEach(ev => {
    if(ev.event==="SLOT_CLAIMED")   transitions.push({from:"FREE",to:"LOCKED",agent:ev.agent,slot:ev.slot});
    if(ev.event==="SLOT_CONTESTED") transitions.push({from:"LOCKED",to:"CONTESTED",agent:ev.agent,slot:ev.slot});
    if(ev.event==="CONTEST_RESOLVED") transitions.push({from:"CONTESTED",to:"RESOLVED",agent:ev.agent,slot:ev.slot});
    if(ev.event==="RESULT_ASSIGNED") transitions.push({from:"RESOLVED",to:"FREE",agent:ev.agent,slot:ev.slot});
  });

  const current = transitions.length>0 ? transitions[transitions.length-1].to : "FREE";

  return (
    <div>
      <div style={{display:"flex",alignItems:"center",gap:0,marginBottom:14,overflowX:"auto",paddingBottom:4}}>
        {stateSeq.map((s,i)=>(
          <div key={s} style={{display:"flex",alignItems:"center",flexShrink:0}}>
            <div style={{textAlign:"center"}}>
              <div style={{width:52,height:52,borderRadius:"50%",border:`2px solid ${current===s?stateColor[s]:T.border}`,background:current===s?`${stateColor[s]}20`:T.panel,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,transition:"all .4s",boxShadow:current===s?`0 0 16px ${stateColor[s]}55`:"none"}}>
                {current===s&&<div style={{width:12,height:12,borderRadius:"50%",background:stateColor[s],animation:"pulse 1.2s infinite"}}/>}
                {current!==s&&<div style={{width:8,height:8,borderRadius:"50%",background:T.border}}/>}
              </div>
              <div style={{fontFamily:"'DM Mono',monospace",fontSize:7,color:current===s?stateColor[s]:T.dim,marginTop:4,textAlign:"center",maxWidth:56}}>{s}</div>
            </div>
            {i<stateSeq.length-1&&<div style={{width:20,height:1,background:T.border,flexShrink:0,margin:"0 2px",marginBottom:16}}/>}
          </div>
        ))}
      </div>
      {transitions.length>0&&(
        <div style={{maxHeight:80,overflowY:"auto"}}>
          {transitions.slice().reverse().map((t,i)=>(
            <div key={i} style={{display:"flex",gap:8,fontFamily:"'DM Mono',monospace",fontSize:8,color:T.dim,padding:"2px 0",borderBottom:`1px solid ${T.faint}`}}>
              <span style={{color:stateColor[t.from]||T.dim,minWidth:70}}>{t.from}</span>
              <span style={{color:T.dim}}>→</span>
              <span style={{color:stateColor[t.to]||T.cyan,minWidth:70}}>{t.to}</span>
              <span style={{color:AGENTS.find(a=>a.id===t.agent)?.hex||T.dim}}>{t.agent}</span>
              <span style={{color:T.dim,marginLeft:"auto"}}>{t.slot}</span>
            </div>
          ))}
        </div>
      )}
      {!transitions.length&&<div style={{textAlign:"center",padding:"10px 0"}}><Mono size={9}>Run a search to see transitions</Mono></div>}
    </div>
  );
}

// ── Debate Panel ──────────────────────────────────────────────────────────────
function DebatePanel({ query, results }) {
  const [topic,      setTopic]      = useState(query||"");
  const [debating,   setDebating]   = useState(false);
  const [debateLog,  setDebateLog]  = useState([]);
  const [verdict,    setVerdict]    = useState(null);
  const logRef = useRef();

  useEffect(()=>{ if(logRef.current) logRef.current.scrollTop=logRef.current.scrollHeight; },[debateLog]);

  const runDebate = async () => {
    if(!topic.trim()) return;
    setDebating(true); setDebateLog([]); setVerdict(null);

    const FOR  = AGENTS[0]; // ARIA-7
    const AGN  = AGENTS[3]; // KRON-∞

    // Round 1 — Opening arguments
    const rounds = [
      { label:"Opening", forPrompt:`Make a strong opening argument FOR: "${topic}". Be specific and persuasive. 3 sentences.`, agnPrompt:`Make a strong opening argument AGAINST: "${topic}". Be provocative and specific. 3 sentences.` },
      { label:"Rebuttal", forPrompt:`Rebut the AGAINST position on "${topic}". Specifically attack their weakest point. 2-3 sentences.`, agnPrompt:`Rebut the FOR position on "${topic}". Find the fatal flaw in their argument. 2-3 sentences.` },
      { label:"Closing",  forPrompt:`Make a compelling closing argument FOR "${topic}". End with a memorable statement. 2 sentences.`, agnPrompt:`Make a final devastating argument AGAINST "${topic}". End with a memorable counter. 2 sentences.` },
    ];

    const log = [];

    for(const round of rounds) {
      setDebateLog(p=>[...p,{type:"round",label:round.label}]);
      await new Promise(r=>setTimeout(r,200));

      const [forArg, agnArg] = await Promise.all([
        callGroq(`You are ${FOR.id}, aggressive debater. Argue FOR the position. Be direct, no hedging.`, round.forPrompt, 200),
        callGroq(`You are ${AGN.id}, chaos debater. Argue AGAINST the position. Be provocative, no hedging.`, round.agnPrompt, 200),
      ]);

      const forEntry = {type:"arg",agent:FOR.id,hex:FOR.hex,glyph:FOR.glyph,side:"FOR", argument:forArg||`Strong argument for ${topic} based on evidence and research.`};
      const agnEntry = {type:"arg",agent:AGN.id,hex:AGN.hex,glyph:AGN.glyph,side:"AGAINST", argument:agnArg||`Counter-argument against ${topic} from unconventional angle.`};
      log.push(forEntry,agnEntry);
      setDebateLog(p=>[...p,forEntry]);
      await new Promise(r=>setTimeout(r,300));
      setDebateLog(p=>[...p,agnEntry]);
      await new Promise(r=>setTimeout(r,400));
    }

    // Supervisor verdict
    const forArgs  = log.filter(l=>l.side==="FOR").map(l=>l.argument).join(" ");
    const agnArgs  = log.filter(l=>l.side==="AGAINST").map(l=>l.argument).join(" ");
    const vRaw = await callGroq(
      `You are SUPERVISOR judging a debate. Give a fair verdict. JSON only: {"winner":"FOR or AGAINST","rationale":"2-sentence verdict explaining who argued better and why","score_for":<1-10>,"score_against":<1-10>}`,
      `Topic: "${topic}"\nFOR arguments: ${forArgs}\nAGAINST arguments: ${agnArgs}`, 250
    );
    const vFb = {winner:"FOR",rationale:`Both sides argued well. FOR presented more structured evidence for "${topic}".`,score_for:7,score_against:6};
    setVerdict(safeJSON(vRaw, vFb));
    setDebating(false);
  };

  return (
    <div>
      <div style={{display:"flex",gap:8,marginBottom:14}}>
        <input value={topic} onChange={e=>setTopic(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!debating&&runDebate()}
          placeholder="Enter debate topic…"
          style={{flex:1,padding:"9px 14px",background:T.card,border:`1px solid ${T.border}`,borderRadius:8,color:T.txt,fontSize:12,fontFamily:"'Inter',sans-serif",outline:"none"}}/>
        <button onClick={runDebate} disabled={debating||!topic.trim()} style={{padding:"9px 18px",background:`${T.orange}18`,border:`1px solid ${T.orange}44`,color:T.orange,borderRadius:8,fontFamily:"'DM Mono',monospace",fontSize:10,cursor:debating?"not-allowed":"pointer"}}>
          {debating?"DEBATING…":"⚔ DEBATE"}
        </button>
      </div>

      {/* Debaters */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
        {[{agent:AGENTS[0],side:"FOR",color:T.green},{agent:AGENTS[3],side:"AGAINST",color:T.red}].map(({agent,side,color})=>(
          <div key={side} style={{padding:"10px 14px",background:`${color}08`,border:`1px solid ${color}33`,borderRadius:8,display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:22,color:agent.hex}}>{agent.glyph}</span>
            <div>
              <div style={{fontFamily:"'Syne',sans-serif",fontSize:12,fontWeight:800,color:agent.hex}}>{agent.id}</div>
              <Tag color={color}>{side}</Tag>
            </div>
          </div>
        ))}
      </div>

      {/* Debate log */}
      <div ref={logRef} style={{height:220,overflowY:"auto",display:"flex",flexDirection:"column",gap:6,marginBottom:10}}>
        {!debateLog.length&&<div style={{textAlign:"center",paddingTop:40,color:T.dim,fontFamily:"'DM Mono',monospace",fontSize:9}}>Enter a topic and click DEBATE to start…</div>}
        {debateLog.map((d,i)=>{
          if(d.type==="round") return(
            <div key={i} style={{textAlign:"center",fontFamily:"'DM Mono',monospace",fontSize:8,color:T.dim,padding:"4px 0",borderTop:`1px solid ${T.border}`,borderBottom:`1px solid ${T.border}`}}>── {d.label.toUpperCase()} ──</div>
          );
          return(
            <div key={i} className="slide" style={{padding:"10px 12px",borderRadius:8,background:d.side==="FOR"?`${T.green}0a`:`${T.red}0a`,border:`1px solid ${d.side==="FOR"?T.green+"33":T.red+"33"}`}}>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:5}}>
                <span style={{color:d.hex,fontSize:14}}>{d.glyph}</span>
                <span style={{fontFamily:"'Syne',sans-serif",fontSize:11,fontWeight:800,color:d.hex}}>{d.agent}</span>
                <Tag color={d.side==="FOR"?T.green:T.red}>{d.side}</Tag>
              </div>
              <div style={{fontFamily:"'Inter',sans-serif",fontSize:11,color:T.txt,lineHeight:1.7,fontWeight:300}}>{d.argument}</div>
            </div>
          );
        })}
      </div>

      {/* Verdict */}
      {verdict&&(
        <div className="slide" style={{padding:"12px 14px",background:`${T.cyan}0a`,border:`1px solid ${T.cyan}44`,borderRadius:8}}>
          <div style={{fontSize:8,color:T.cyan,fontFamily:"'DM Mono',monospace",letterSpacing:".12em",marginBottom:6}}>⚖ SUPERVISOR VERDICT</div>
          <div style={{fontFamily:"'Inter',sans-serif",fontSize:11,color:T.txt,lineHeight:1.7,marginBottom:8}}>{verdict.rationale}</div>
          <div style={{display:"flex",gap:8}}>
            <Tag color={verdict.winner==="FOR"?T.green:T.dim}>FOR: {verdict.score_for}/10</Tag>
            <Tag color={verdict.winner==="AGAINST"?T.red:T.dim}>AGAINST: {verdict.score_against}/10</Tag>
            <Tag color={T.cyan}>WINNER: {verdict.winner}</Tag>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Chat Panel ────────────────────────────────────────────────────────────────
function ChatPanel({ query, results, summary }) {
  const [messages, setMessages] = useState([]);
  const [input,    setInput]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const chatRef = useRef();

  useEffect(()=>{ if(chatRef.current) chatRef.current.scrollTop=chatRef.current.scrollHeight; },[messages]);

  const context = results.map(r=>`[${ROLES[r.agentId]?.angle}]\n${r.title}\n${r.content}\nKey points: ${r.key_points?.join(", ")}`).join("\n\n");

  const send = async () => {
    if(!input.trim()||loading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages(p=>[...p,{role:"user",text:userMsg}]);
    setLoading(true);

    const sys = `You are AEGIS assistant. The user searched for "${query}". Here are the search results:\n\n${context}\n\nSummary: ${summary}\n\nAnswer follow-up questions based on this context. Be concise and helpful.`;
    const raw = await callGroq(sys, userMsg, 400);
    const reply = raw?.trim() || "I couldn't generate a response. Please try again.";
    setMessages(p=>[...p,{role:"assistant",text:reply}]);
    setLoading(false);
  };

  if(!results.length) return(
    <div style={{textAlign:"center",padding:"40px 0",color:T.dim,fontFamily:"'DM Mono',monospace",fontSize:9}}>
      Run a search first to enable chat with results
    </div>
  );

  return(
    <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
      <div ref={chatRef} style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:8,marginBottom:10,minHeight:200,maxHeight:280}}>
        {!messages.length&&(
          <div style={{color:T.dim,fontFamily:"'DM Mono',monospace",fontSize:9,textAlign:"center",paddingTop:30}}>
            Ask anything about your search results…
            <div style={{display:"flex",flexWrap:"wrap",gap:6,justifyContent:"center",marginTop:12}}>
              {["Explain point 1 simply","Give me code for this","What are the limitations?","Compare the agent perspectives"].map(s=>(
                <button key={s} onClick={()=>{setInput(s);}} style={{padding:"4px 10px",background:T.panel,border:`1px solid ${T.border}`,borderRadius:20,color:T.dim,fontFamily:"'DM Mono',monospace",fontSize:8,cursor:"pointer"}}>{s}</button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m,i)=>(
          <div key={i} className="slide" style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start"}}>
            <div style={{maxWidth:"82%",padding:"10px 14px",borderRadius:m.role==="user"?"12px 12px 4px 12px":"12px 12px 12px 4px",background:m.role==="user"?`${T.cyan}18`:T.panel,border:`1px solid ${m.role==="user"?T.cyan+"44":T.border}`,fontFamily:"'Inter',sans-serif",fontSize:11,color:T.txt,lineHeight:1.75}}>
              {m.text}
            </div>
          </div>
        ))}
        {loading&&(
          <div style={{display:"flex",gap:4,padding:"8px 0"}}>
            {[0,1,2].map(i=><div key={i} style={{width:6,height:6,borderRadius:"50%",background:T.cyan,animation:`glow ${0.6+i*0.2}s ${i*0.15}s ease-in-out infinite`}}/>)}
          </div>
        )}
      </div>
      <div style={{display:"flex",gap:8}}>
        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()}
          placeholder="Ask a follow-up question…"
          style={{flex:1,padding:"9px 14px",background:T.card,border:`1px solid ${T.border}`,borderRadius:8,color:T.txt,fontSize:12,fontFamily:"'Inter',sans-serif",outline:"none"}}/>
        <button onClick={send} disabled={loading||!input.trim()} style={{padding:"9px 16px",background:`${T.cyan}18`,border:`1px solid ${T.cyan}44`,color:T.cyan,borderRadius:8,fontFamily:"'DM Mono',monospace",fontSize:10,cursor:loading?"not-allowed":"pointer"}}>SEND</button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function PageSearch() {
  const [query,    setQuery]    = useState("");
  const [running,  setRunning]  = useState(false);
  const [phase,    setPhase]    = useState("READY");
  const [progress, setProgress] = useState(0);
  const [agSt,     setAgSt]     = useState(()=>Object.fromEntries(AGENTS.map(a=>[a.id,{state:"IDLE",thought:null,bid:null,statement:null}])));
  const [slots,    setSlots]    = useState({});
  const [events,   setEvents]   = useState([]);
  const [results,  setResults]  = useState([]);
  const [summary,  setSummary]  = useState(null);
  const [verdict,  setVerdict]  = useState(null);
  const [debateLog,setDebateLog]= useState([]);
  const [activeTab,setActiveTab]= useState("results"); // results|chat|debate|graph
  const [listening,setListening]= useState(false);
  const evRef   = useRef();
  const recognRef = useRef(null);
  useEffect(()=>{ if(evRef.current) evRef.current.scrollTop=evRef.current.scrollHeight; },[events]);
  const setA = (id,u)=>setAgSt(p=>({...p,[id]:{...p[id],...u}}));
  const sleep = ms=>new Promise(r=>setTimeout(r,ms));
  const hasKey = !!import.meta.env.VITE_GROQ_API_KEY;

  // ── Voice Search ────────────────────────────────────────────────────────────
  const startVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if(!SR){ alert("Voice search not supported in this browser. Try Chrome."); return; }
    const r = new SR();
    r.lang="en-US"; r.interimResults=false; r.maxAlternatives=1;
    r.onstart  = ()=>setListening(true);
    r.onend    = ()=>setListening(false);
    r.onerror  = ()=>setListening(false);
    r.onresult = e=>{ const t=e.results[0][0].transcript; setQuery(t); setTimeout(()=>runSearch(t),300); };
    recognRef.current = r;
    r.start();
  };

  const stopVoice = ()=>{ recognRef.current?.stop(); setListening(false); };

  // ── Search ──────────────────────────────────────────────────────────────────
  const runSearch = useCallback(async (q) => {
    if(!q?.trim()) return;
    const mem = new SlotMemory(4);
    setAgSt(Object.fromEntries(AGENTS.map(a=>[a.id,{state:"IDLE",thought:null,bid:null,statement:null}])));
    setSlots({}); setEvents([]); setResults([]); setSummary(null); setVerdict(null); setDebateLog([]);
    setRunning(true); setProgress(0); setActiveTab("results");

    setPhase("AGENTS PERCEIVING QUERY");
    AGENTS.forEach(a=>setA(a.id,{state:"PERCEIVING"}));
    await sleep(500);

    setPhase("AGENTS SEARCHING & REASONING");
    AGENTS.forEach(a=>setA(a.id,{state:"REASONING"}));
    setProgress(0.15);

    const decisions = await Promise.all(AGENTS.map(async (agent)=>{
      const result = await agentSearch(agent, q);
      setA(agent.id,{state:"BIDDING",thought:result.thought,statement:result.statement,bid:Math.round(result.bid*10)/10});
      return {agent,result};
    }));

    await sleep(400); setProgress(0.4);
    setPhase("MESI PROTOCOL — BIDDING FOR SLOTS");

    decisions.forEach(({agent,result},i)=>mem.request(`Result·${i+1}`,agent.id,result.bid));
    if(decisions.length>=2) mem.request("Result·1",decisions[1].agent.id,decisions[1].result.bid);
    setSlots(mem.snap()); setEvents(mem.events());
    await sleep(500); setProgress(0.55);

    const contested=Object.values(mem.snap()).filter(s=>s.state==="CONTESTED");
    if(contested.length>0){
      setPhase(`⚔ CONFLICT — SUPERVISOR RESOLVING`);
      AGENTS.slice(0,2).forEach(a=>setA(a.id,{state:"NEGOTIATING"}));
      await sleep(300);
      for(const slot of contested){
        const contenders=[slot.holder,...(slot.contenders||[])].filter(Boolean);
        const contestants=decisions.filter(d=>contenders.includes(d.agent.id)).map(d=>({id:d.agent.id,bid:d.result.bid}));
        const v=await supervisorResolve(contestants,q);
        const winner=v.winner||contestants[0]?.id;
        mem.resolve(slot.id,winner,contestants.find(c=>c.id===winner)?.bid||70);
        setVerdict({...v,slot:slot.id});
        AGENTS.forEach(a=>{if(contenders.includes(a.id))setA(a.id,{state:a.id===winner?"WON":"LOST"});});
        await sleep(600);
      }
    }
    setProgress(0.7);

    setPhase("ASSIGNING RESULTS");
    decisions.forEach(({agent,result},i)=>{
      const sid=`Result·${i+1}`; const s=mem.snap()[sid];
      if(s?.holder===agent.id){mem.assign(sid,agent.id,result);setA(agent.id,{state:"EXECUTING"});}
    });

    const finalSnap=mem.snap();
    const finalResults=Object.values(finalSnap).filter(s=>s.result)
      .sort((a,b)=>parseInt(a.id.split("·")[1])-parseInt(b.id.split("·")[1]))
      .map((s,rank)=>({...s.result,slot:s.id,agentId:s.holder,agentHex:AGENTS.find(a=>a.id===s.holder)?.hex||T.dim,agentGlyph:AGENTS.find(a=>a.id===s.holder)?.glyph||"●",type:AGENT_TYPE[s.holder]||"academic",rank:rank+1}));

    const assigned=new Set(finalResults.map(r=>r.agentId));
    decisions.filter(d=>!assigned.has(d.agent.id)).forEach(d=>{
      finalResults.push({...d.result,slot:`Result·${finalResults.length+1}`,agentId:d.agent.id,agentHex:d.agent.hex,agentGlyph:d.agent.glyph,type:AGENT_TYPE[d.agent.id]||"academic",rank:finalResults.length+1});
    });

    setSlots(mem.snap()); setEvents(mem.events()); setResults(finalResults);
    AGENTS.forEach(a=>setAgSt(p=>{const c=p[a.id];if(c.state==="WON"||c.state==="EXECUTING")return p;return{...p,[a.id]:{...c,state:"IDLE"}};}));
    setProgress(0.82); await sleep(300);

    setPhase("SYNTHESIZING FINAL ANSWER");
    const sumText=await synthesize(q,finalResults);
    setSummary(sumText);
    setProgress(1); setPhase("SEARCH COMPLETE"); setRunning(false);
    AGENTS.forEach(a=>setA(a.id,{state:"IDLE"}));
  },[]);

  const stateColor={IDLE:T.dim,PERCEIVING:T.blue,REASONING:T.cyan,BIDDING:T.gold,NEGOTIATING:T.orange,EXECUTING:T.green,WON:T.green,LOST:T.red};
  const evColor=e=>e.includes("RESOLVED")?T.cyan:e.includes("CONTEST")?T.orange:e.includes("CLAIMED")?T.green:e.includes("ASSIGNED")?T.blue:T.dim;
  const agHex=Object.fromEntries(AGENTS.map(a=>[a.id,a.hex]));

  const TABS = [
    {id:"results", label:"📋 Results"},
    {id:"chat",    label:"💬 Chat"},
    {id:"debate",  label:"⚔ Debate"},
    {id:"graph",   label:"📊 Protocol Graph"},
  ];

  return (
    <div>
      {/* Header */}
      <div style={{marginBottom:18}}>
        <h2 style={{fontFamily:"'Syne',sans-serif",fontSize:22,fontWeight:900,color:T.white}}>AEGIS Search</h2>
        <div style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:T.dim,marginTop:3}}>
          4 AI agents simultaneously search, reason and negotiate the best answer
        </div>
      </div>

      {!hasKey&&(
        <div style={{padding:"10px 16px",background:`${T.orange}10`,border:`1px solid ${T.orange}44`,borderRadius:8,marginBottom:14,fontFamily:"'DM Mono',monospace",fontSize:10,color:T.orange}}>
          ⚠ Add VITE_GROQ_API_KEY=gsk_... to frontend/.env to enable live AI search
        </div>
      )}

      {/* Search bar */}
      <div style={{marginBottom:14}}>
        <div style={{display:"flex",gap:8,marginBottom:10}}>
          <div style={{flex:1,position:"relative"}}>
            <input value={query} onChange={e=>setQuery(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&!running&&query.trim()&&runSearch(query)}
              placeholder={listening?"🎤 Listening…":"Search anything — deep learning, MESI protocol, neural networks…"}
              style={{width:"100%",padding:"13px 46px 13px 46px",background:listening?`${T.cyan}10`:T.card,border:`1px solid ${listening?T.cyan:running?T.cyan+"66":T.border}`,borderRadius:10,color:T.txt,fontSize:13,fontFamily:"'Inter',sans-serif",outline:"none",transition:"all .3s",boxSizing:"border-box"}}/>
            <span style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",fontSize:18,opacity:0.45}}>🔍</span>
            {/* Voice button */}
            <button onClick={listening?stopVoice:startVoice}
              style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",padding:"5px 8px",background:listening?`${T.red}22`:`${T.cyan}11`,border:`1px solid ${listening?T.red+"55":T.cyan+"33"}`,borderRadius:6,color:listening?T.red:T.dim,fontSize:14,cursor:"pointer",transition:"all .2s"}}>
              {listening?"⏹":"🎤"}
            </button>
          </div>
          <button onClick={()=>!running&&query.trim()&&runSearch(query)} disabled={running||!query.trim()}
            style={{padding:"13px 24px",background:running?`${T.dim}22`:`${T.cyan}18`,border:`1px solid ${running?T.dim+"33":T.cyan+"55"}`,color:running?T.dim:T.cyan,borderRadius:10,fontFamily:"'Syne',sans-serif",fontSize:13,fontWeight:700,cursor:running?"not-allowed":"pointer",boxShadow:running?"none":`0 0 18px ${T.cyan}22`,whiteSpace:"nowrap"}}>
            {running?"SEARCHING…":"SEARCH"}
          </button>
          {results.length>0&&(
            <button onClick={()=>exportPDF(query,results,summary,debateLog)}
              style={{padding:"13px 18px",background:`${T.purple}18`,border:`1px solid ${T.purple}44`,color:T.purple,borderRadius:10,fontFamily:"'DM Mono',monospace",fontSize:10,cursor:"pointer",whiteSpace:"nowrap"}}>
              ⬇ PDF
            </button>
          )}
        </div>
        {/* Suggestions */}
        {!running&&!results.length&&(
          <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
            <Mono size={9}>Try: </Mono>
            {["deep learning","MESI protocol","transformer architecture","reinforcement learning","distributed systems","neural networks"].map(s=>(
              <button key={s} onClick={()=>{setQuery(s);setTimeout(()=>runSearch(s),50);}}
                style={{padding:"4px 11px",background:T.panel,border:`1px solid ${T.border}`,borderRadius:20,color:T.dim,fontFamily:"'DM Mono',monospace",fontSize:8,cursor:"pointer"}}>{s}</button>
            ))}
          </div>
        )}
        {running&&(
          <div style={{display:"flex",alignItems:"center",gap:7,marginTop:6}}>
            <Dot color={T.cyan} active size={7}/><Mono color={T.cyan} size={9}>{phase}</Mono>
          </div>
        )}
        {listening&&(
          <div style={{display:"flex",alignItems:"center",gap:7,marginTop:6}}>
            <Dot color={T.red} active size={7}/><Mono color={T.red} size={9}>LISTENING — speak your query now…</Mono>
          </div>
        )}
      </div>

      {/* Progress */}
      <div style={{height:2,background:T.border,borderRadius:2,marginBottom:14,overflow:"hidden"}}>
        <div style={{height:"100%",width:`${progress*100}%`,background:`linear-gradient(90deg,${T.cyan}88,${T.cyan})`,transition:"width .5s ease",boxShadow:`0 0 8px ${T.cyan}`}}/>
      </div>

      {/* Agent terminals + slot map */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          {AGENTS.map(agent=>{
            const as=agSt[agent.id]; const role=ROLES[agent.id];
            const sc=stateColor[as.state]||T.dim;
            const active=["REASONING","BIDDING","NEGOTIATING","PERCEIVING","EXECUTING"].includes(as.state);
            return(
              <div key={agent.id} style={{background:T.card,borderRadius:10,overflow:"hidden",border:`1px solid ${active?agent.hex+"55":T.border}`,boxShadow:active?`0 0 20px ${agent.hex}10`:"none",transition:"all .35s",position:"relative"}}>
                <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:active?agent.hex:T.border,transition:"all .35s"}}/>
                <div style={{padding:"10px 12px",borderBottom:`1px solid ${T.border}`,background:active?`${agent.hex}07`:"transparent",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div style={{display:"flex",alignItems:"center",gap:7}}>
                    <span style={{fontSize:16,color:agent.hex}}>{agent.glyph}</span>
                    <div>
                      <div style={{fontFamily:"'Syne',sans-serif",fontSize:12,fontWeight:800,color:agent.hex}}>{agent.id}</div>
                      <div style={{fontFamily:"'DM Mono',monospace",fontSize:7,color:T.dim}}>{role.icon} {role.angle}</div>
                    </div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{display:"flex",alignItems:"center",gap:4,justifyContent:"flex-end"}}><Dot color={sc} active={active} size={6}/><Mono color={sc} size={8}>{as.state}</Mono></div>
                    {as.bid&&<div style={{fontFamily:"'Syne',sans-serif",fontSize:15,fontWeight:900,color:agent.hex,lineHeight:1,marginTop:2}}>{as.bid}</div>}
                  </div>
                </div>
                <div style={{padding:"10px 12px",minHeight:90}}>
                  {as.thought?(
                    <div className="slide">
                      <div style={{fontSize:9,color:T.txt,fontFamily:"'DM Mono',monospace",lineHeight:1.75,fontStyle:"italic",marginBottom:5,borderLeft:`2px solid ${agent.hex}55`,paddingLeft:7}}>"{as.thought}"</div>
                      {as.statement&&<div style={{fontSize:8,color:T.dim,fontFamily:"'DM Mono',monospace",lineHeight:1.5}}>📡 "{as.statement}"</div>}
                    </div>
                  ):<div style={{color:T.dim,fontSize:9,fontFamily:"'DM Mono',monospace",textAlign:"center",paddingTop:22,opacity:0.45}}>{running?"searching…":"idle"}</div>}
                </div>
              </div>
            );
          })}
        </div>

        {/* Slot map + events */}
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <Card>
            <SectionHead label="Result Slot Map" sub="Shared memory — MESI protocol"/>
            <div style={{display:"flex",flexDirection:"column",gap:5}}>
              {Array.from({length:4},(_,i)=>{
                const sid=`Result·${i+1}`; const slot=slots[sid];
                const ag=slot?.holder?AGENTS.find(a=>a.id===slot.holder):null;
                const sc=slot?.state==="CONTESTED"?T.orange:slot?.state==="LOCKED"?T.green:T.dim;
                return(
                  <div key={sid} style={{padding:"7px 12px",borderRadius:7,display:"flex",alignItems:"center",gap:10,background:slot?.state==="CONTESTED"?`${T.orange}0d`:slot?.state==="LOCKED"?`${T.green}08`:T.panel,border:`1px solid ${slot?.state==="CONTESTED"?T.orange+"66":slot?.state==="LOCKED"?T.green+"33":T.border}`,animation:slot?.state==="CONTESTED"?"contested 1.2s infinite":"none",transition:"all .35s"}}>
                    <div style={{width:26,height:26,borderRadius:5,background:ag?`${ag.hex}18`:T.faint,border:`1px solid ${ag?ag.hex+"44":T.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,color:ag?.hex||T.dim,flexShrink:0}}>{ag?ag.glyph:"#"}</div>
                    <div style={{flex:1}}>
                      <div style={{fontFamily:"'Syne',sans-serif",fontSize:10,fontWeight:700,color:sc}}>{sid}</div>
                      {slot?.result&&<div style={{fontFamily:"'DM Mono',monospace",fontSize:7,color:T.dim,marginTop:1}}>{slot.result.title?.slice(0,42)}…</div>}
                    </div>
                    <div style={{textAlign:"right",flexShrink:0}}>
                      <Tag color={sc}>{slot?.state||"FREE"}</Tag>
                      {slot?.bid>0&&<div style={{fontFamily:"'DM Mono',monospace",fontSize:7,color:T.gold,marginTop:2}}>bid:{slot.bid}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
          <Card glow={!!verdict} color={T.cyan} style={{flex:1}}>
            <SectionHead label="Supervisor + Events"/>
            {verdict?(
              <div className="slide" style={{padding:"10px 12px",background:T.panel,borderRadius:8,borderLeft:`2px solid ${T.cyan}77`,marginBottom:10}}>
                <div style={{fontSize:8,color:T.cyan,fontFamily:"'DM Mono',monospace",letterSpacing:".12em",marginBottom:5}}>⚖ {verdict.slot} RESOLVED</div>
                <div style={{fontSize:10,color:T.txt,fontFamily:"'DM Mono',monospace",lineHeight:1.75,marginBottom:7}}>{verdict.rationale}</div>
                <div style={{display:"flex",gap:6}}><Tag color={T.green}>WINNER: {verdict.winner}</Tag><Tag color={T.cyan}>FAIR: {verdict.fairness_score}/10</Tag></div>
              </div>
            ):(
              <div style={{padding:"8px 12px",background:T.panel,borderRadius:8,textAlign:"center",marginBottom:10}}><Mono size={9}>{running?"Monitoring…":"No conflicts yet"}</Mono></div>
            )}
            <div ref={evRef} style={{height:90,overflowY:"auto",fontFamily:"'DM Mono',monospace",fontSize:8,lineHeight:1.9}}>
              {!events.length?<div style={{color:T.dim,textAlign:"center",paddingTop:18}}>awaiting events…</div>
                :events.map((ev,i)=>(
                  <div key={i} style={{display:"flex",gap:5,padding:"1px 0",borderBottom:`1px solid ${T.faint}`}}>
                    <span style={{color:T.faint,minWidth:22}}>t{ev.clock}</span>
                    <span style={{color:evColor(ev.event),minWidth:115}}>{ev.event}</span>
                    <span style={{color:agHex[ev.agent]||T.dim,minWidth:50}}>{ev.agent}</span>
                    <span style={{color:T.txt}}>{ev.slot}</span>
                  </div>
                ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Tab panel */}
      {(results.length>0||true)&&(
        <Card>
          {/* Tab bar */}
          <div style={{display:"flex",gap:0,borderBottom:`1px solid ${T.border}`,marginBottom:16,marginTop:-4}}>
            {TABS.map(tab=>(
              <button key={tab.id} onClick={()=>setActiveTab(tab.id)}
                style={{padding:"8px 16px",background:"transparent",border:"none",borderBottom:`2px solid ${activeTab===tab.id?T.cyan:"transparent"}`,color:activeTab===tab.id?T.cyan:T.dim,fontFamily:"'DM Mono',monospace",fontSize:9,letterSpacing:".06em",cursor:"pointer",transition:"all .2s"}}>
                {tab.label}
              </button>
            ))}
            {results.length>0&&(
              <button onClick={()=>exportPDF(query,results,summary,debateLog)}
                style={{marginLeft:"auto",padding:"8px 14px",background:"transparent",border:"none",borderBottom:"2px solid transparent",color:T.purple,fontFamily:"'DM Mono',monospace",fontSize:9,cursor:"pointer"}}>
                ⬇ Export PDF
              </button>
            )}
          </div>

          {/* Results tab */}
          {activeTab==="results"&&(
            results.length>0?(
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                <div>
                  <SectionHead label={`Ranked Results · ${results.length} agents`} sub="Negotiated by MESI — ranked by bid"/>
                  <div style={{display:"flex",flexDirection:"column",gap:10}}>
                    {results.map((r,i)=>(
                      <div key={i} className="fadein" style={{padding:"14px",borderRadius:9,background:i===0?`${r.agentHex}0d`:T.panel,border:`1px solid ${i===0?r.agentHex+"44":T.border}`}}>
                        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                          <span style={{fontFamily:"'Syne',sans-serif",fontSize:13,fontWeight:900,color:r.agentHex}}>#{r.rank}</span>
                          <span style={{fontFamily:"'Syne',sans-serif",fontSize:12,fontWeight:700,color:T.txt,flex:1}}>{r.title}</span>
                        </div>
                        <div style={{display:"flex",gap:5,marginBottom:8,flexWrap:"wrap"}}>
                          <Tag color={TYPE_COLOR[r.type]||T.dim}>{TYPE_ICON[r.type]} {r.type}</Tag>
                          <Tag color={r.agentHex}>{r.agentGlyph} {r.agentId}</Tag>
                          <Tag color={T.dim}>bid:{r.bid?.toFixed?.(1)||r.bid}</Tag>
                        </div>
                        <div style={{fontFamily:"'Inter',sans-serif",fontSize:11,color:T.dim,lineHeight:1.75,fontWeight:300,marginBottom:8}}>{r.content}</div>
                        {r.key_points?.map((p,j)=>(
                          <div key={j} style={{display:"flex",gap:6,fontFamily:"'DM Mono',monospace",fontSize:8,color:T.dim,marginBottom:2}}>
                            <span style={{color:r.agentHex}}>›</span>{p}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <SectionHead label="AI Synthesized Summary" sub="Multi-agent consensus answer"/>
                  {summary?(
                    <div>
                      <div style={{padding:"16px",background:T.panel,borderRadius:10,borderLeft:`2px solid ${T.green}77`,marginBottom:14}}>
                        <div style={{fontSize:8,color:T.green,fontFamily:"'DM Mono',monospace",letterSpacing:".14em",marginBottom:10}}>⟨ SYNTHESIZED ANSWER ⟩</div>
                        <div style={{fontFamily:"'Inter',sans-serif",fontSize:12,color:T.txt,lineHeight:1.9,fontWeight:300,whiteSpace:"pre-line"}}>{summary}</div>
                      </div>
                      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                        {results.map((r,i)=>(
                          <div key={i} style={{padding:"6px 10px",background:`${r.agentHex}0d`,border:`1px solid ${r.agentHex}33`,borderRadius:6}}>
                            <div style={{fontFamily:"'DM Mono',monospace",fontSize:8,color:r.agentHex}}>{r.agentGlyph} {r.agentId}</div>
                            <div style={{fontFamily:"'DM Mono',monospace",fontSize:7,color:T.dim,marginTop:1}}>{ROLES[r.agentId]?.angle}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ):<div style={{textAlign:"center",padding:"40px 0"}}><Mono color={T.dim} size={10}>{running?"Synthesizing…":"No summary yet"}</Mono></div>}
                </div>
              </div>
            ):(
              <div style={{textAlign:"center",padding:"50px 0"}} className="fadein">
                <div style={{fontSize:44,marginBottom:16}}>🔍</div>
                <div style={{fontFamily:"'Syne',sans-serif",fontSize:18,fontWeight:800,color:T.dim,marginBottom:10}}>Enter any query to launch agents</div>
                <div style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:T.dim,lineHeight:2,maxWidth:520,margin:"0 auto",opacity:0.7}}>
                  Voice search 🎤 · Agent debate ⚔ · Protocol graph 📊 · Chat with results 💬 · PDF export ⬇
                </div>
              </div>
            )
          )}

          {/* Chat tab */}
          {activeTab==="chat"&&(
            <div>
              <SectionHead label="Chat with Results" sub="Ask follow-up questions about the search results"/>
              <ChatPanel query={query} results={results} summary={summary}/>
            </div>
          )}

          {/* Debate tab */}
          {activeTab==="debate"&&(
            <div>
              <SectionHead label="Agent vs Agent Debate" sub="ARIA-7 argues FOR · KRON-∞ argues AGAINST · Supervisor gives verdict"/>
              <DebatePanel query={query} results={results}/>
            </div>
          )}

          {/* Graph tab */}
          {activeTab==="graph"&&(
            <div>
              <SectionHead label="Real-Time Protocol Graph" sub="Live MESI state transitions as they happen"/>
              <ProtocolGraph events={events}/>
              {events.length>0&&(
                <div style={{marginTop:14,display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
                  {[
                    {l:"Total Events",   v:events.length,            c:T.cyan},
                    {l:"Slots Claimed",  v:events.filter(e=>e.event==="SLOT_CLAIMED").length,    c:T.green},
                    {l:"Contests",       v:events.filter(e=>e.event==="SLOT_CONTESTED").length,  c:T.orange},
                    {l:"Resolutions",    v:events.filter(e=>e.event==="CONTEST_RESOLVED").length,c:T.purple},
                  ].map(m=>(
                    <div key={m.l} style={{padding:"10px 14px",background:`${m.c}0a`,border:`1px solid ${m.c}33`,borderRadius:8,textAlign:"center"}}>
                      <div style={{fontFamily:"'Syne',sans-serif",fontSize:22,fontWeight:900,color:m.c}}>{m.v}</div>
                      <div style={{fontFamily:"'DM Mono',monospace",fontSize:8,color:T.dim,marginTop:3}}>{m.l}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
