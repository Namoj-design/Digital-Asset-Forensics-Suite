from fastapi import FastAPI
from pydantic import BaseModel
from typing import Optional
import traceback
import sys
import os

# Add parent path to allow imports if needed
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from inference import InferencePipeline
from llm_agent import InvestigativeAgent

app = FastAPI()

# Initialize pipeline globally
try:
    print("Initializing InferencePipeline...")
    pipeline = InferencePipeline()
except Exception as e:
    print(f"Failed to initialize InferencePipeline: {e}")
    pipeline = None

class RequestModel(BaseModel):
    wallet: str
    chain: str
    depth: int = 2

class CopilotRequest(BaseModel):
    message: str
    case_id: Optional[str] = None
    canvas_id: Optional[str] = None

# Initialize Copilot Agent
try:
    copilot_agent = InvestigativeAgent()
except Exception as e:
    print(f"Failed to initialize Copilot Agent: {e}")
    copilot_agent = None

@app.post("/ai/copilot")
def ai_copilot(req: CopilotRequest):
    if not copilot_agent:
        return {"error": "AI Copilot Agent not loaded"}
    try:
        result = copilot_agent.run(req.message, req.case_id)
        return result
    except Exception as e:
        print(traceback.format_exc())
        return {"error": str(e)}

@app.post("/analyze")
def analyze(req: RequestModel):
    if not pipeline:
        return {"error": "ML Model failed to load"}
        
    try:
        target = req.wallet.lower()
        
        # The inference pipeline expects a specific address to run k_hop around
        report = pipeline.analyze_local_subgraph(target, k_hops=req.depth)
        
        if isinstance(report, dict) and "error" in report:
             # Just return a graceful empty structure if wallet isn't in graph
             return {
                 "wallet": target,
                 "risk_score": 10,
                 "patterns": [],
                 "entities": [],
                 "explanation": "Wallet lacks sufficient historical graph context for deep ML analysis.",
                 "confidence": 0.50,
                 "graph_updates": {
                     "suspicious_nodes": [],
                     "suggested_edges": []
                 }
             }
             
        if not report:
             return {
                 "wallet": target,
                 "risk_score": 20,
                 "patterns": [],
                 "entities": [],
                 "explanation": "No suspicious behavior detected in immediate network.",
                 "confidence": 0.95,
                 "graph_updates": {
                     "suspicious_nodes": [],
                     "suggested_edges": []
                 }
             }
             
        suspicious_nodes = []
        patterns = set()
        reasons = []
        max_score = 20.0
        
        for p in report:
            suspicious_nodes.extend(p['nodes'])
            patterns.add(p['pattern_type'])
            reasons.append(p['explanation']['reason'])
            
            score = float(p.get('confidence', 0.5)) * 100
            if score > max_score: max_score = score
            
        return {
            "wallet": target,
            "risk_score": int(max_score),
            "patterns": list(patterns),
            "entities": list(set(suspicious_nodes)),
            "explanation": " | ".join(set(reasons))[:500],
            "confidence": 0.91,
            "graph_updates": {
                "suspicious_nodes": list(set(suspicious_nodes)),
                "suggested_edges": [{"source": target, "target": n, "type": "predicted"} for n in list(set(suspicious_nodes)) if n != target]
            }
        }
    except Exception as e:
        print(traceback.format_exc())
        return {"error": str(e)}
