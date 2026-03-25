// AEGIS — In-Browser Shared Memory Engine
// Mirrors the Python backend SharedMemoryStore exactly

import { RESOURCES } from "../constants.js";

export class SharedMemory {
  constructor() {
    this.resources = {};
    this.tasks = {};
    this.clock = 0;
    this.log = [];
  }

  init(resourceIds, tasks) {
    resourceIds.forEach((id) => {
      this.resources[id] = { id, state: "FREE", holder: null, version: 0, contenders: [] };
    });
    tasks.forEach((t) => {
      this.tasks[t.id] = { ...t, done: false, assignedTo: null };
    });
  }

  snapshot() {
    return {
      resources: JSON.parse(JSON.stringify(this.resources)),
      tasks: JSON.parse(JSON.stringify(this.tasks)),
      clock: this.clock,
    };
  }

  requestLock(rid, agentId, bid) {
    this.clock++;
    const r = this.resources[rid];
    if (!r) return { granted: false, reason: "NOT_FOUND" };
    if (r.state === "FREE") {
      r.state = "LOCKED";
      r.holder = agentId;
      r.version = this.clock;
      this._log("LOCK_GRANTED", agentId, rid, bid);
      return { granted: true };
    }
    if (!r.contenders.includes(agentId)) r.contenders.push(agentId);
    r.state = "CONTESTED";
    this._log("CONTESTED", agentId, rid, bid);
    return { granted: false, reason: "CONTESTED", holder: r.holder };
  }

  resolveContest(rid, winnerId, bid) {
    const r = this.resources[rid];
    if (!r) return;
    r.state = "LOCKED";
    r.holder = winnerId;
    r.contenders = [];
    r.version = this.clock;
    this._log("NEGOTIATION_RESOLVED", winnerId, rid, bid);
  }

  completeTask(taskId, agentId, step) {
    const t = this.tasks[taskId];
    if (!t || t.done) return null;
    t.done = true;
    t.assignedTo = agentId;
    const delay = Math.max(0, step - t.deadline);
    const penalty = Math.min(t.reward, 0.5 * delay * t.reward);
    const reward = Math.max(0, t.reward - penalty);
    const r = Object.values(this.resources).find((r) => r.id === t.resourceId);
    if (r && r.holder === agentId) {
      r.state = "FREE";
      r.holder = null;
      r.contenders = [];
    }
    this._log("TASK_COMPLETED", agentId, t.resourceId, reward);
    return { reward, penalty, onTime: step <= t.deadline };
  }

  available() {
    return Object.values(this.tasks).filter((t) => !t.done);
  }

  _log(event, agent, resource, value) {
    this.log.push({
      clock: this.clock,
      event,
      agent,
      resource,
      value: Math.round(value * 100) / 100,
      ts: Date.now(),
    });
  }

  events(n = 150) {
    return this.log.slice(-n);
  }
}

export function generateTasks(steps) {
  return Array.from({ length: 20 }, (_, i) => ({
    id: `TASK·${String(i + 1).padStart(2, "0")}`,
    resourceId: RESOURCES[i % RESOURCES.length],
    deadline: 2 + Math.floor(Math.random() * Math.max(1, steps - 2)),
    reward: Math.round((6 + Math.random() * 14) * 10) / 10,
  }));
}
