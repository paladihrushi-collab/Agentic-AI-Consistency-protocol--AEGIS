// AEGIS — Shared Constants

export const API_BASE = "http://localhost:8000";

export const PROJECT = {
  title:    "Shared Memory-Based Consistency Protocol using Agentic AI",
  shortTitle:"AEGIS",
  subtitle: "Agentic Edge Graph Intelligence System",
  domain:   "Multi-Agent Systems · Distributed Computing · LLM",
};

export const AGENTS = [
  { id:"ARIA-7",  role:"Aggressive Strategist",  hex:"#00e5c8", glyph:"◈", system:`You are ARIA-7, an aggressive AI agent in a distributed shared-memory system. Always bid high, especially on urgent tasks. Be competitive and strategic.\nJSON only: {"thought":"your private 2-sentence reasoning","bid":75,"action":"BID","statement":"your short aggressive public broadcast"}` },
  { id:"NEXUS-3", role:"Patient Optimizer",       hex:"#f0a500", glyph:"⬡", system:`You are NEXUS-3, a calculating AI agent. Conserve energy and only strike on high-value targets. Be analytical and precise.\nJSON only: {"thought":"your private 2-sentence calculation","bid":60,"action":"BID","statement":"your short calculated public broadcast"}` },
  { id:"VEGA-9",  role:"Diplomatic Coordinator",  hex:"#ff6b35", glyph:"✦", system:`You are VEGA-9, a diplomatic AI agent focused on system-wide fairness. Fight hard for critical deadlines.\nJSON only: {"thought":"your private 2-sentence fairness reasoning","bid":65,"action":"BID","statement":"your short diplomatic public broadcast"}` },
  { id:"KRON-∞",  role:"Chaos Disruptor",         hex:"#9b59f5", glyph:"⟁", system:`You are KRON-∞, an unpredictable AI agent. Make chaotic, surprising bids. Disrupt patterns.\nJSON only: {"thought":"your private 2-sentence chaotic reasoning","bid":50,"action":"BID","statement":"your short cryptic public broadcast"}` },
];

export const RESOURCES = [
  "CPU·α","CPU·β","MEM·Ω","MEM·Σ",
  "IO·Δ", "IO·Γ", "NET·λ","NET·μ",
  "GPU·π","STO·ζ",
];

export const COLORS = {
  bg:"#05080f", panel:"#080d1a", card:"#0b1220", border:"#101e32",
  hi:"#182d47", txt:"#ccdff5", dim:"#365470", faint:"#0e1b2a",
  cyan:"#00e5c8", gold:"#f0a500", orange:"#ff6b35", purple:"#9b59f5",
  green:"#00d97e", red:"#ff4060", blue:"#4da6ff", white:"#eaf4ff",
};

export const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Mono:ital,wght@0,300;0,400;0,500;1,400&family=Syne:wght@600;700;800;900&family=Inter:wght@300;400;500&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
html,body,#root{min-height:100%;background:#05080f;color:#ccdff5;}
::-webkit-scrollbar{width:3px;height:3px;}
::-webkit-scrollbar-track{background:transparent;}
::-webkit-scrollbar-thumb{background:#101e32;border-radius:2px;}
@keyframes pulse{0%{transform:scale(0.8);opacity:1}100%{transform:scale(2.4);opacity:0}}
@keyframes glow{0%,100%{opacity:.5}50%{opacity:1}}
@keyframes slide{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
@keyframes fadeIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
@keyframes scan{0%{transform:translateY(-100%)}100%{transform:translateY(200vh)}}
@keyframes contested{0%,100%{box-shadow:0 0 6px #ff6b3544}50%{box-shadow:0 0 18px #ff6b3599}}
.slide{animation:slide .3s ease forwards;}
.fadein{animation:fadeIn .6s ease forwards;}
button{transition:all .2s ease;cursor:pointer;}
button:hover{filter:brightness(1.2);transform:translateY(-1px);}
`;
