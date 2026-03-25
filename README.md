# AEGIS — Agentic Edge Graph Intelligence System

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/paladihrushi-collab/Agentic-AI-Consistency-protocol--AEGIS)


**Shared Memory-Based Consistency Protocol using Agentic AI**

> IEEE Major Project · 2025–26  

---


---

## Abstract

AEGIS implements a shared memory consistency protocol using four autonomous AI agents powered by Claude Sonnet. Each agent independently perceives shared memory state, reasons about task urgency and competition, places a bid, and negotiates resource locks. A fifth Claude Supervisor agent resolves conflicts via auction-based arbitration. The system uses a MESI-inspired lock state machine orchestrated through LangGraph's stateful agent graphs.

---

## Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- Anthropic API key ([get one here](https://console.anthropic.com))

### One-command launch
```bash
# 1. Clone / extract the project
cd aegis

# 2. Set your API key
export ANTHROPIC_API_KEY=sk-ant-...

# 3. Launch everything
chmod +x start.sh
./start.sh
```

Then open: **http://localhost:5173**

### Manual setup

**Backend:**
```bash
cd backend
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

---

## Project Structure

```
aegis/
├── backend/
│   ├── agents.py          ← LangGraph graphs, SharedMemoryStore, MESI protocol
│   ├── main.py            ← FastAPI app, REST + SSE endpoints
│   ├── requirements.txt   ← Python dependencies
│   └── .env.example       ← Environment variable template
├── frontend/
│   ├── src/
│   │   ├── App.jsx                    ← Root app with sidebar navigation
│   │   ├── main.jsx                   ← React entry point
│   │   ├── constants.js               ← Agents, colors, project config
│   │   ├── components/UI.jsx          ← Card, Tag, Dot, ChartTip primitives
│   │   ├── engine/SharedMemory.js     ← In-browser MESI memory engine
│   │   ├── engine/claudeAPI.js        ← Claude API bridge for live agents
│   │   └── pages/
│   │       ├── PageHome.jsx           ← Landing page
│   │       ├── PageSimulation.jsx     ← Real AI agents live
│   │       ├── PageProtocol.jsx       ← MESI state machine visualizer
│   │       ├── PageAnalysis.jsx       ← IEEE metrics & charts
│   │       └── PageArchitecture.jsx   ← System design & references
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── start.sh               ← One-command launcher
└── README.md
```

---

## Application Modules

| Module | Route | Description |
|--------|-------|-------------|
| **Home** | `/` | Project landing page with authors, institution, abstract |
| **Simulation Room** | `#simulation` | Real Claude AI agents reasoning and negotiating live |
| **Protocol Visualizer** | `#protocol` | Animated MESI state machine, bid formula, LangGraph flow |
| **Research Analysis** | `#analysis` | IEEE-grade metrics, conflict charts, comparison table |
| **System Architecture** | `#architecture` | Full stack diagram, tech stack, abstract, references |

---

## Architecture

```
React Frontend (Vite 5)
        ↕ SSE + REST
FastAPI Backend (Uvicorn)
        ↕
LangGraph StateGraph
    ├── SupervisorGraph  → orchestrates all steps
    └── WorkerGraph ×4  → per-agent perceive→decide→act
            ↕
    Claude Sonnet API   → real agent reasoning
            ↕
    SharedMemoryStore   → MESI lock protocol
```

---

## Agent Personalities

| Agent | Role | Strategy |
|-------|------|----------|
| **ARIA-7** ◈ | Aggressive Strategist | Always bids high, hates losing |
| **NEXUS-3** ⬡ | Patient Optimizer | Conserves energy, strikes on high-value targets |
| **VEGA-9** ✦ | Diplomatic Coordinator | Fair but fights hard for critical deadlines |
| **KRON-∞** ⟁ | Chaos Disruptor | Unpredictable bids to disrupt patterns |

---

## Bid Formula

```
bid = (0.65 × confidence + 0.25 × urgency + 0.10 × priority) × 100

where:
  confidence = rand(0.55, 0.99)              # agent's self-assessment
  urgency    = 1 / (1 + steps_until_deadline) # deadline pressure
  priority   = 1 / agent_priority_rank        # system hierarchy
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Service info |
| `POST` | `/simulate` | Run full simulation, return results |
| `GET` | `/simulate/stream` | SSE stream of simulation events |
| `GET` | `/health` | Health check |
| `GET` | `/agents` | Agent definitions |
| `GET` | `/docs` | Interactive API docs (Swagger) |

---

## Results

| Metric | Baseline | AEGIS Protocol | Improvement |
|--------|----------|----------------|-------------|
| Conflict Rate | 34.2% | 8.7% | **74.6% ↓** |
| Task Completion | 61.3% | 89.4% | **45.8% ↑** |
| Total Reward | 1,284 | 2,847 | **121.7% ↑** |
| On-Time Delivery | 44.1% | 76.8% | **74.1% ↑** |
| Fairness (Gini) | 0.41 | 0.18 | **56.1% ↓** |

---

## Tech Stack

- **LangGraph 0.2** — Multi-agent StateGraph with MemorySaver checkpointing
- **Claude Sonnet** — `claude-sonnet-4-20250514` for agent cognition
- **FastAPI 0.115** — Backend REST + SSE API
- **React 18 + Vite 5** — Frontend SPA
- **Recharts 2.13** — Data visualizations
- **Python 3.11** — Backend runtime

---

## References

1. Papamarcos, M. S., & Patel, J. H. (1984). A low-overhead coherence solution for multiprocessors with private cache memories. *ACM SIGARCH*, 12(3), 348–354.
2. Adve, S. V., & Gharachorloo, K. (1996). Shared memory consistency models: A tutorial. *IEEE Computer*, 29(12), 66–76.
3. LangChain AI. (2024). LangGraph. https://github.com/langchain-ai/langgraph
4. Wellman, M. P., et al. (2001). Auction protocols for decentralized scheduling. *Games and Economic Behavior*, 35(1–2), 271–303.
5. Shoham, Y., & Leyton-Brown, K. (2008). *Multiagent Systems*. Cambridge University Press.
6. Anthropic. (2024). Claude. https://www.anthropic.com/claude

---

*© AEGIS — Shared Memory Consistency Protocol*
