"""
AEGIS — FastAPI Application Entry Point (Groq Edition)
"""

import asyncio, json, os, time, uuid
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from dotenv import load_dotenv
from agents import AEGISSimulation

load_dotenv()

app = FastAPI(
    title="AEGIS API — Groq Edition",
    version="2.0.0",
    description="Shared Memory Consistency Protocol · Llama 3.3 70B via Groq",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class SimRequest(BaseModel):
    steps:  int = 20
    agents: int = 4
    runs:   int = 2

@app.get("/")
def root():
    return {
        "service":     "AEGIS",
        "version":     "2.0.0",
        "llm":         "llama-3.3-70b-versatile via Groq (FREE)",
        "status":      "operational",
    }

@app.post("/simulate")
def simulate(req: SimRequest):
    sim = AEGISSimulation(
        steps=max(5, min(50, req.steps)),
        num_agents=max(2, min(4, req.agents)),
        num_runs=max(1, min(3, req.runs)),
    )
    return sim.run_all()

@app.get("/simulate/stream")
async def simulate_stream(
    steps:  int = Query(default=15, ge=5,  le=40),
    agents: int = Query(default=4,  ge=2,  le=4),
    runs:   int = Query(default=1,  ge=1,  le=2),
):
    async def generator():
        sim = AEGISSimulation(steps=steps, num_agents=agents, num_runs=runs)
        yield f"data: {json.dumps({'type':'start','model':'llama-3.3-70b-versatile','config':{'steps':steps,'agents':agents,'runs':runs}})}\n\n"
        await asyncio.sleep(0.01)

        for run_i in range(1, runs + 1):
            run_id = f"RUN-{run_i:02d}-{uuid.uuid4().hex[:4]}"
            yield f"data: {json.dumps({'type':'run_start','run_id':run_id,'run_number':run_i})}\n\n"
            result = await asyncio.get_event_loop().run_in_executor(None, sim.run_single, run_id)

            for ev in result.get("store_events", [])[-80:]:
                yield f"data: {json.dumps({'type':'store_event','event':ev,'run_id':run_id})}\n\n"
                await asyncio.sleep(0.004)

            for pt in result.get("chart", []):
                yield f"data: {json.dumps({'type':'chart_point','point':pt,'run_id':run_id})}\n\n"
                await asyncio.sleep(0.003)

            yield f"data: {json.dumps({'type':'run_complete','run_id':run_id,'metrics':result['metrics'],'agent_wins':result['agent_wins'],'progress':run_i/runs})}\n\n"

        final = await asyncio.get_event_loop().run_in_executor(None, sim.run_all)
        yield f"data: {json.dumps({'type':'complete','result':final})}\n\n"

    return StreamingResponse(generator(), media_type="text/event-stream",
                             headers={"Cache-Control":"no-cache","X-Accel-Buffering":"no"})

@app.get("/health")
def health():
    key_set = bool(os.environ.get("GROQ_API_KEY", ""))
    return {"status": "ok", "groq_key_set": key_set, "ts": time.time()}

@app.get("/agents")
def get_agents():
    from agents import AGENT_PERSONALITIES, RESOURCES
    return {
        "agents": [{"id": aid, **{k: v for k, v in p.items() if k != "system"}}
                   for aid, p in AGENT_PERSONALITIES.items()],
        "resources": RESOURCES,
    }
