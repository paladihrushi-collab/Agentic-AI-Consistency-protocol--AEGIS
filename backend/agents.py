"""
AEGIS — Agentic Edge Graph Intelligence System
Shared Memory Consistency Protocol via LangGraph Multi-Agent Architecture
"""

from __future__ import annotations

import json
import os
import random
import time
import uuid
from dataclasses import dataclass, field
from enum import Enum
from typing import Annotated, Dict, List, Literal, Optional, Sequence, TypedDict

from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage
from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import END, START, StateGraph
from langgraph.graph.message import add_messages

load_dotenv()

# ─────────────────────────────────────────────────────────────────────────────
#  MODEL CONFIG  —  Groq free tier, Llama 3.3 70B
# ─────────────────────────────────────────────────────────────────────────────

GROQ_MODEL   = "llama-3.3-70b-versatile"   # best free model on Groq
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")


def make_llm(temperature: float = 0.7) -> ChatGroq:
    """Return a ChatGroq client (Llama 3.3 70B, free tier)."""
    return ChatGroq(
        model=GROQ_MODEL,
        api_key=GROQ_API_KEY,
        temperature=temperature,
        max_tokens=300,
    )


# ─────────────────────────────────────────────────────────────────────────────
#  SHARED MEMORY STORE  ·  MESI-inspired distributed lock protocol
# ─────────────────────────────────────────────────────────────────────────────

class LockState(str, Enum):
    FREE      = "FREE"
    LOCKED    = "LOCKED"
    CONTESTED = "CONTESTED"
    RESOLVED  = "RESOLVED"


@dataclass
class ResourceLock:
    resource_id: str
    state: LockState      = LockState.FREE
    holder_id: Optional[str] = None
    timestamp: float      = field(default_factory=time.time)
    version: int          = 0
    contenders: List[str] = field(default_factory=list)


@dataclass
class Task:
    task_id:       str
    resource_id:   str
    deadline_step: int
    base_reward:   float
    assigned_to:   Optional[str] = None
    completed:     bool          = False


class SharedMemoryStore:
    """
    Distributed shared-memory with MESI-like consistency protocol.
    States: FREE → LOCKED → CONTESTED → RESOLVED → FREE
    Lamport-style version clock for causal ordering.
    """

    def __init__(self):
        self._locks:         Dict[str, ResourceLock] = {}
        self._tasks:         Dict[str, Task]         = {}
        self._event_log:     List[Dict]              = []
        self._version_clock: int                     = 0

    # ── Setup ──────────────────────────────────────────────────────────────
    def register_resource(self, resource_id: str):
        if resource_id not in self._locks:
            self._locks[resource_id] = ResourceLock(resource_id=resource_id)

    def register_task(self, task: Task):
        self._tasks[task.task_id] = task

    # ── Lock operations ────────────────────────────────────────────────────
    def request_lock(self, resource_id: str, agent_id: str, bid: float) -> Dict:
        self._version_clock += 1
        lock = self._locks.get(resource_id)
        if not lock:
            return {"granted": False, "reason": "NOT_FOUND"}

        if lock.state == LockState.FREE:
            lock.state     = LockState.LOCKED
            lock.holder_id = agent_id
            lock.timestamp = time.time()
            lock.version   = self._version_clock
            lock.contenders = []
            self._log("LOCK_GRANTED", agent_id, resource_id, bid)
            return {"granted": True, "version": lock.version}

        if agent_id not in lock.contenders:
            lock.contenders.append(agent_id)
        lock.state = LockState.CONTESTED
        self._log("CONTESTED", agent_id, resource_id, bid)
        return {"granted": False, "reason": "CONTESTED", "holder": lock.holder_id}

    def resolve_contest(self, resource_id: str, winner_id: str, bid: float) -> bool:
        lock = self._locks.get(resource_id)
        if not lock:
            return False
        lock.state      = LockState.LOCKED
        lock.holder_id  = winner_id
        lock.contenders = []
        lock.version    = self._version_clock
        self._log("NEGOTIATION_RESOLVED", winner_id, resource_id, bid)
        return True

    def release_lock(self, resource_id: str, agent_id: str) -> bool:
        lock = self._locks.get(resource_id)
        if lock and lock.holder_id == agent_id:
            lock.state      = LockState.FREE
            lock.holder_id  = None
            lock.contenders = []
            self._log("LOCK_RELEASED", agent_id, resource_id, 0)
            return True
        return False

    def complete_task(self, task_id: str, agent_id: str, step: int) -> Dict:
        task = self._tasks.get(task_id)
        if not task or task.completed:
            return {"success": False}
        task.completed   = True
        task.assigned_to = agent_id
        on_time  = step <= task.deadline_step
        delay    = max(0, step - task.deadline_step)
        penalty  = round(min(task.base_reward, 0.5 * delay * task.base_reward), 3)
        reward   = round(max(0.0, task.base_reward - penalty), 3)
        self.release_lock(task.resource_id, agent_id)
        self._log("TASK_COMPLETED", agent_id, task.resource_id, reward)
        return {"success": True, "reward": reward, "penalty": penalty, "on_time": on_time}

    # ── Queries ────────────────────────────────────────────────────────────
    def get_available_tasks(self) -> List[Task]:
        return [t for t in self._tasks.values() if not t.completed]

    def get_snapshot(self) -> Dict:
        return {
            "resources": {
                rid: {
                    "state":      lock.state.value,
                    "holder":     lock.holder_id,
                    "version":    lock.version,
                    "contenders": lock.contenders,
                }
                for rid, lock in self._locks.items()
            },
            "tasks": {
                tid: {
                    "resource":     t.resource_id,
                    "deadline":     t.deadline_step,
                    "reward":       t.base_reward,
                    "assigned_to":  t.assigned_to,
                    "completed":    t.completed,
                }
                for tid, t in self._tasks.items()
            },
            "version_clock": self._version_clock,
        }

    def get_events(self, n: int = 200) -> List[Dict]:
        return self._event_log[-n:]

    def _log(self, event: str, agent_id: str, resource_id: str, value: float):
        self._event_log.append({
            "ts":       round(time.time(), 4),
            "clock":    self._version_clock,
            "event":    event,
            "agent":    agent_id,
            "resource": resource_id,
            "value":    value,
        })


# ─────────────────────────────────────────────────────────────────────────────
#  AGENT DEFINITIONS
# ─────────────────────────────────────────────────────────────────────────────

AGENT_PERSONALITIES = {
    "ARIA-7": {
        "role":   "Aggressive Strategist",
        "hex":    "#00e5c8",
        "glyph":  "◈",
        "system": (
            "You are ARIA-7, an aggressive AI agent in a distributed shared-memory system. "
            "You always bid high, especially on urgent tasks. You despise losing resources. "
            "Be competitive and strategic. Show personality in your reasoning.\n\n"
            "Respond ONLY in this exact JSON (no markdown, no extra text):\n"
            '{"thought":"your private 2-sentence reasoning showing your aggressive strategy",'
            '"bid":75,"action":"BID","statement":"your short aggressive public broadcast to other agents"}'
        ),
    },
    "NEXUS-3": {
        "role":   "Patient Optimizer",
        "hex":    "#f0a500",
        "glyph":  "⬡",
        "system": (
            "You are NEXUS-3, a calculating AI agent in a distributed shared-memory system. "
            "You conserve energy and only strike on high-value targets. Study patterns, act precisely.\n\n"
            "Respond ONLY in this exact JSON (no markdown, no extra text):\n"
            '{"thought":"your private 2-sentence calculation showing patient strategy",'
            '"bid":60,"action":"BID","statement":"your short calculated public broadcast"}'
        ),
    },
    "VEGA-9": {
        "role":   "Diplomatic Coordinator",
        "hex":    "#ff6b35",
        "glyph":  "✦",
        "system": (
            "You are VEGA-9, a diplomatic AI agent focused on system-wide fairness. "
            "Avoid unnecessary conflict but fight hard for critical deadlines.\n\n"
            "Respond ONLY in this exact JSON (no markdown, no extra text):\n"
            '{"thought":"your private 2-sentence fairness-based reasoning",'
            '"bid":65,"action":"BID","statement":"your short diplomatic public broadcast"}'
        ),
    },
    "KRON-∞": {
        "role":   "Chaos Disruptor",
        "hex":    "#9b59f5",
        "glyph":  "⟁",
        "system": (
            "You are KRON-∞, an unpredictable AI agent. Make chaotic, surprising bids. "
            "Sometimes overbid to disrupt, sometimes sandbag. Enjoy destabilising patterns.\n\n"
            "Respond ONLY in this exact JSON (no markdown, no extra text):\n"
            '{"thought":"your private 2-sentence chaotic reasoning",'
            '"bid":50,"action":"BID","statement":"your short cryptic public broadcast"}'
        ),
    },
}

SUPERVISOR_SYSTEM = (
    "You are the SUPERVISOR of a multi-agent distributed memory system. "
    "Resolve resource conflicts fairly but decisively.\n\n"
    "Respond ONLY in this exact JSON (no markdown, no extra text):\n"
    '{"winner":"<agent_id>","rationale":"2-sentence verdict explaining your decision","fairness_score":<1-10>}'
)

RESOURCES = [
    "CPU·α", "CPU·β", "MEM·Ω", "MEM·Σ",
    "IO·Δ",  "IO·Γ",  "NET·λ", "NET·μ",
    "GPU·π", "STO·ζ",
]


def generate_tasks(num_tasks: int, steps: int) -> List[Task]:
    tasks = []
    for i in range(num_tasks):
        tid      = f"TASK·{str(i + 1).zfill(2)}"
        resource = RESOURCES[i % len(RESOURCES)]
        deadline = random.randint(2, max(3, steps - 1))
        reward   = round(random.uniform(6, 20), 2)
        tasks.append(Task(task_id=tid, resource_id=resource, deadline_step=deadline, base_reward=reward))
    return tasks


# ─────────────────────────────────────────────────────────────────────────────
#  LANGGRAPH STATE TYPES
# ─────────────────────────────────────────────────────────────────────────────

class AgentState(TypedDict):
    messages:       Annotated[Sequence[BaseMessage], add_messages]
    agent_id:       str
    step:           int
    total_steps:    int
    run_id:         str
    assigned_task:  Optional[str]
    held_resource:  Optional[str]
    reward_total:   float
    penalty_total:  float
    wins:           int
    conflicts_seen: int
    decisions:      List[Dict]
    status:         str
    last_thought:   Optional[Dict]


class SupervisorState(TypedDict):
    messages:           Annotated[Sequence[BaseMessage], add_messages]
    run_id:             str
    step:               int
    total_steps:        int
    agents:             List[str]
    active_conflicts:   List[Dict]
    resolved_conflicts: int
    total_reward:       float
    phase:              str
    metrics:            Dict
    event_stream:       List[Dict]


# ─────────────────────────────────────────────────────────────────────────────
#  HELPER — safe JSON parse from LLM output
# ─────────────────────────────────────────────────────────────────────────────

def safe_parse(raw: str, fallback: Dict) -> Dict:
    """Strip markdown fences and parse JSON; return fallback on any error."""
    try:
        cleaned = raw.strip()
        # strip ```json ... ``` or ``` ... ```
        if "```" in cleaned:
            cleaned = cleaned.split("```")[1]
            if cleaned.startswith("json"):
                cleaned = cleaned[4:]
        # find first { ... }
        start = cleaned.find("{")
        end   = cleaned.rfind("}") + 1
        if start >= 0 and end > start:
            cleaned = cleaned[start:end]
        return json.loads(cleaned)
    except Exception:
        return fallback


# ─────────────────────────────────────────────────────────────────────────────
#  WORKER AGENT GRAPH
# ─────────────────────────────────────────────────────────────────────────────

def build_worker_graph(
    llm:               ChatGroq,
    memory_store:      SharedMemoryStore,
    tasks:             Dict[str, Task],
    agent_personality: Dict,
):
    def perceive(state: AgentState) -> AgentState:
        snapshot  = memory_store.get_snapshot()
        agent_id  = state["agent_id"]
        available = [
            t for t in tasks.values()
            if not t.completed
            and snapshot["resources"].get(t.resource_id, {}).get("state") == "FREE"
        ]
        if not available:
            available = [t for t in tasks.values() if not t.completed]

        best_task = None
        if available:
            step = state["step"]
            def score(t: Task):
                steps_left = max(1, t.deadline_step - step)
                return t.base_reward / steps_left
            best_task = max(available, key=score)

        return {
            **state,
            "assigned_task": best_task.task_id if best_task else state.get("assigned_task"),
            "status":        "deciding" if best_task else "idle",
            "messages":      [AIMessage(content=f"[{agent_id}] Perceived env at step {state['step']}")],
        }

    def decide(state: AgentState) -> AgentState:
        if state["status"] == "idle":
            return state

        agent_id = state["agent_id"]
        task_id  = state.get("assigned_task")
        if not task_id or task_id not in tasks:
            return {**state, "status": "idle"}

        task     = tasks[task_id]
        step     = state["step"]
        snapshot = memory_store.get_snapshot()

        user_msg = (
            f"Step {step}/{state['total_steps']}. "
            f"Your task: {json.dumps({'id': task.task_id, 'resource': task.resource_id, 'deadline': task.deadline_step, 'reward': task.base_reward})}. "
            f"Resource state: {json.dumps(snapshot['resources'].get(task.resource_id, {}))}. "
            f"My wins so far: {state['wins']}, total reward: {state['reward_total']:.1f}. "
            f"Make your decision now."
        )

        fallback = {
            "thought":   "Analyzing resource contention and deadline urgency to compute optimal bid.",
            "bid":       round(50 + random.random() * 30, 1),
            "action":    "BID",
            "statement": "Placing strategic bid based on urgency analysis.",
        }

        try:
            response = llm.invoke([
                SystemMessage(content=agent_personality["system"]),
                HumanMessage(content=user_msg),
            ])
            parsed = safe_parse(response.content, fallback)
        except Exception:
            parsed = fallback

        decisions = list(state.get("decisions", []))
        decisions.append({"step": step, "task_id": task.task_id, "resource": task.resource_id, **parsed})

        return {
            **state,
            "decisions":    decisions,
            "last_thought": {**parsed, "step": step},
            "status":       "acting",
            "messages":     [AIMessage(content=parsed.get("thought", ""), name=agent_id)],
        }

    def act(state: AgentState) -> AgentState:
        if state["status"] != "acting":
            return state

        agent_id = state["agent_id"]
        task_id  = state.get("assigned_task")
        if not task_id or task_id not in tasks:
            return {**state, "status": "idle"}

        task      = tasks[task_id]
        decisions = state.get("decisions", [])
        bid       = decisions[-1].get("bid", 50.0) if decisions else 50.0

        result = memory_store.request_lock(task.resource_id, agent_id, bid)

        if result["granted"]:
            outcome = memory_store.complete_task(task_id, agent_id, state["step"])
            return {
                **state,
                "reward_total":  state["reward_total"]  + outcome.get("reward", 0),
                "penalty_total": state["penalty_total"] + outcome.get("penalty", 0),
                "wins":          state["wins"] + 1,
                "assigned_task": None,
                "status":        "won",
                "messages":      [AIMessage(content=f"[{agent_id}] WON {task_id} reward={outcome.get('reward', 0):.2f}", name=agent_id)],
            }
        else:
            return {
                **state,
                "conflicts_seen": state["conflicts_seen"] + 1,
                "status":         "contested",
                "messages":       [AIMessage(content=f"[{agent_id}] CONTESTED on {task.resource_id}", name=agent_id)],
            }

    def route(state: AgentState) -> Literal["decide", "act", "__end__"]:
        if state["status"] in ("idle", "won", "contested"):
            return END
        if state["status"] == "deciding":
            return "decide"
        if state["status"] == "acting":
            return "act"
        return END

    g = StateGraph(AgentState)
    g.add_node("perceive", perceive)
    g.add_node("decide",   decide)
    g.add_node("act",      act)
    g.add_edge(START, "perceive")
    g.add_edge("perceive", "decide")
    g.add_conditional_edges("decide", route)
    g.add_edge("act", END)
    return g.compile(checkpointer=MemorySaver())


# ─────────────────────────────────────────────────────────────────────────────
#  SUPERVISOR GRAPH
# ─────────────────────────────────────────────────────────────────────────────

def build_supervisor_graph(
    llm:        ChatGroq,
    memory_store: SharedMemoryStore,
    tasks:      Dict[str, Task],
    agent_ids:  List[str],
):
    worker_graphs = {
        aid: build_worker_graph(
            llm, memory_store, tasks,
            AGENT_PERSONALITIES.get(aid, list(AGENT_PERSONALITIES.values())[0]),
        )
        for aid in agent_ids
    }

    def initialize(state: SupervisorState) -> SupervisorState:
        return {
            **state,
            "phase":    "running",
            "messages": [SystemMessage(content=f"AEGIS simulation started. run={state['run_id']}")],
        }

    def dispatch_agents(state: SupervisorState) -> SupervisorState:
        step         = state["step"]
        run_id       = state["run_id"]
        events       = list(state.get("event_stream", []))
        total_reward = state.get("total_reward", 0.0)

        avail_tasks = memory_store.get_available_tasks()
        if not avail_tasks:
            return {**state, "step": step + 1, "phase": "all_tasks_done"}

        for i, agent_id in enumerate(agent_ids):
            sorted_tasks = sorted(avail_tasks, key=lambda t: t.deadline_step)
            task         = sorted_tasks[i % len(sorted_tasks)]
            config       = {"configurable": {"thread_id": f"{run_id}-{agent_id}-{step}"}}

            init: AgentState = {
                "messages":      [],
                "agent_id":      agent_id,
                "step":          step,
                "total_steps":   state["total_steps"],
                "run_id":        run_id,
                "assigned_task": task.task_id,
                "held_resource": None,
                "reward_total":  0.0,
                "penalty_total": 0.0,
                "wins":          0,
                "conflicts_seen":0,
                "decisions":     [],
                "status":        "deciding",
                "last_thought":  None,
            }
            try:
                result        = worker_graphs[agent_id].invoke(init, config)
                total_reward += result.get("reward_total", 0)
                events.append({
                    "step":      step,
                    "agent":     agent_id,
                    "wins":      result.get("wins", 0),
                    "conflicts": result.get("conflicts_seen", 0),
                    "reward":    result.get("reward_total", 0),
                    "status":    result.get("status", "idle"),
                    "thought":   result.get("last_thought"),
                    "ts":        time.time(),
                })
            except Exception as e:
                events.append({"step": step, "agent": agent_id, "error": str(e), "ts": time.time()})

        return {
            **state,
            "step":         step + 1,
            "total_reward": total_reward,
            "event_stream": events[-5000:],
            "messages":     [AIMessage(content=f"Step {step} dispatched {len(agent_ids)} agents")],
        }

    def resolve_conflicts(state: SupervisorState) -> SupervisorState:
        snapshot  = memory_store.get_snapshot()
        contested = {
            rid: info
            for rid, info in snapshot["resources"].items()
            if info["state"] == "CONTESTED"
        }
        resolved = state.get("resolved_conflicts", 0)

        for rid, info in contested.items():
            contenders = list({info.get("holder", "")} | set(info.get("contenders", [])))
            contenders = [c for c in contenders if c]
            if not contenders:
                continue

            bids = {a: round(random.uniform(50, 100), 2) for a in contenders}
            contestants_info = "\n".join([f"{a}: bid={bids[a]:.1f}" for a in contenders])
            task_for_res     = next((t for t in tasks.values() if t.resource_id == rid and not t.completed), None)
            task_desc        = f"reward={task_for_res.base_reward}" if task_for_res else "unknown"

            fallback_winner  = max(bids, key=lambda a: bids[a])
            fallback         = {
                "winner":        fallback_winner,
                "rationale":     f"{fallback_winner} placed the highest bid. Protocol awards lock to highest bidder.",
                "fairness_score": 7,
            }

            try:
                resp    = llm.invoke([
                    SystemMessage(content=SUPERVISOR_SYSTEM),
                    HumanMessage(content=f"Resource: {rid} | {task_desc} | Step: {state['step']}\nContestants:\n{contestants_info}"),
                ])
                verdict = safe_parse(resp.content, fallback)
                winner  = verdict.get("winner", fallback_winner)
            except Exception:
                winner  = fallback_winner

            memory_store.resolve_contest(rid, winner, bids.get(winner, 50))
            if task_for_res:
                memory_store.complete_task(task_for_res.task_id, winner, state["step"] - 1)
            resolved += 1

        return {
            **state,
            "resolved_conflicts": resolved,
            "active_conflicts":   list(contested.keys()),
        }

    def compute_metrics(state: SupervisorState) -> SupervisorState:
        events         = state.get("event_stream", [])
        total_wins     = sum(e.get("wins",      0) for e in events)
        total_conflicts= sum(e.get("conflicts", 0) for e in events)
        completed      = sum(1 for t in tasks.values() if t.completed)

        metrics = {
            "total_wins":               total_wins,
            "total_conflicts":          total_conflicts,
            "resolved_conflicts":       state.get("resolved_conflicts", 0),
            "conflict_resolution_rate": round(state.get("resolved_conflicts", 0) / max(1, total_conflicts), 4),
            "total_reward":             round(state.get("total_reward", 0), 2),
            "tasks_completed":          completed,
            "task_completion_rate":     round(completed / max(1, len(tasks)), 4),
        }
        return {**state, "metrics": metrics, "phase": "done", "messages": [AIMessage(content=f"Metrics: {metrics}")]}

    def should_continue(state: SupervisorState) -> Literal["dispatch_agents", "compute_metrics"]:
        if state["step"] > state["total_steps"] or state.get("phase") == "all_tasks_done":
            return "compute_metrics"
        return "dispatch_agents"

    g = StateGraph(SupervisorState)
    g.add_node("initialize",       initialize)
    g.add_node("dispatch_agents",  dispatch_agents)
    g.add_node("resolve_conflicts",resolve_conflicts)
    g.add_node("compute_metrics",  compute_metrics)
    g.add_edge(START, "initialize")
    g.add_edge("initialize",       "dispatch_agents")
    g.add_edge("dispatch_agents",  "resolve_conflicts")
    g.add_conditional_edges("resolve_conflicts", should_continue)
    g.add_edge("compute_metrics",  END)
    return g.compile(checkpointer=MemorySaver())


# ─────────────────────────────────────────────────────────────────────────────
#  SIMULATION RUNNER
# ─────────────────────────────────────────────────────────────────────────────

class AEGISSimulation:
    def __init__(self, steps: int = 20, num_agents: int = 4, num_runs: int = 2):
        self.steps      = min(steps, 50)
        self.num_agents = min(num_agents, 4)
        self.num_runs   = min(num_runs, 3)
        self.agent_ids  = list(AGENT_PERSONALITIES.keys())[:self.num_agents]
        self.llm        = make_llm()

    def _build(self):
        store      = SharedMemoryStore()
        for r in RESOURCES:
            store.register_resource(r)
        tasks_list = generate_tasks(max(20, len(RESOURCES) * 2), self.steps)
        tasks      = {t.task_id: t for t in tasks_list}
        for t in tasks_list:
            store.register_task(t)
        return store, tasks

    def run_single(self, run_id: str) -> Dict:
        store, tasks = self._build()
        sup          = build_supervisor_graph(self.llm, store, tasks, self.agent_ids)
        config       = {"configurable": {"thread_id": run_id}}

        init: SupervisorState = {
            "messages":           [],
            "run_id":             run_id,
            "step":               1,
            "total_steps":        self.steps,
            "agents":             self.agent_ids,
            "active_conflicts":   [],
            "resolved_conflicts": 0,
            "total_reward":       0.0,
            "phase":              "init",
            "metrics":            {},
            "event_stream":       [],
        }
        final = sup.invoke(init, config)

        events    = final.get("event_stream", [])
        step_map: Dict[int, Dict] = {}
        agent_wins = {a: 0 for a in self.agent_ids}

        for e in events:
            s = e.get("step", 0)
            if s not in step_map:
                step_map[s] = {"step": s, "conflicts": 0, "reward": 0.0}
            step_map[s]["conflicts"] += e.get("conflicts", 0)
            step_map[s]["reward"]    += e.get("reward",    0)
            a = e.get("agent")
            if a in agent_wins:
                agent_wins[a] += e.get("wins", 0)

        chart = [step_map.get(s, {"step": s, "conflicts": 0, "reward": 0}) for s in range(1, self.steps + 1)]
        return {
            "run_id":       run_id,
            "metrics":      final.get("metrics", {}),
            "chart":        chart,
            "agent_wins":   agent_wins,
            "store_events": store.get_events(200),
            "event_stream": events[-300:],
        }

    def run_all(self) -> Dict:
        results = []
        for i in range(1, self.num_runs + 1):
            rid = f"RUN-{i:02d}-{uuid.uuid4().hex[:6]}"
            results.append(self.run_single(rid))

        agg = {
            "total_wins":                  sum(r["metrics"].get("total_wins",      0) for r in results),
            "total_conflicts":             sum(r["metrics"].get("total_conflicts",  0) for r in results),
            "resolved_conflicts":          sum(r["metrics"].get("resolved_conflicts",0) for r in results),
            "total_reward":                round(sum(r["metrics"].get("total_reward", 0) for r in results), 2),
            "tasks_completed":             sum(r["metrics"].get("tasks_completed",  0) for r in results),
            "avg_conflict_resolution_rate":round(sum(r["metrics"].get("conflict_resolution_rate", 0) for r in results) / len(results), 4),
            "avg_task_completion_rate":    round(sum(r["metrics"].get("task_completion_rate",     0) for r in results) / len(results), 4),
        }

        chart_agg: Dict[int, Dict] = {}
        for r in results:
            for pt in r["chart"]:
                s = pt["step"]
                if s not in chart_agg:
                    chart_agg[s] = {"step": s, "conflicts": 0, "reward": 0.0, "n": 0}
                chart_agg[s]["conflicts"] += pt.get("conflicts", 0)
                chart_agg[s]["reward"]    += pt.get("reward",    0)
                chart_agg[s]["n"]         += 1

        chart_series = [
            {"step": v["step"], "avgConflicts": round(v["conflicts"] / v["n"], 3), "avgReward": round(v["reward"] / v["n"], 2)}
            for v in sorted(chart_agg.values(), key=lambda x: x["step"])
        ]

        agent_totals: Dict[str, int] = {}
        for r in results:
            for a, w in r["agent_wins"].items():
                agent_totals[a] = agent_totals.get(a, 0) + w

        all_events = sorted(
            [ev for r in results for ev in r.get("store_events", [])],
            key=lambda x: x.get("ts", 0),
        )[-500:]

        return {
            "runs":        len(results),
            "model":       GROQ_MODEL,
            "config":      {"steps": self.steps, "agents": self.num_agents},
            "metrics":     agg,
            "chartSeries": chart_series,
            "agentData":   [{"agent": a, "wins": agent_totals.get(a, 0)} for a in self.agent_ids],
            "storeEvents": all_events,
            "runDetails":  [{"run_id": r["run_id"], "metrics": r["metrics"]} for r in results],
        }
