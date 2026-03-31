import json
import requests
import traceback
from typing import Optional

class InvestigativeAgent:
    def __init__(self, ollama_url="http://localhost:11434/api/generate", model="llama3"):
        self.ollama_url = ollama_url
        self.model = model
        
        # Tools definitions (Normally we would hook these deeply into specific ML pipelines,
        # but for the orchestrator, we proxy to the existing components or stub advanced ones).
        self.tools = {
            "expand_wallet": self._tool_expand_wallet,
            "get_risk_score": self._tool_get_risk_score,
            "get_entity_info": self._tool_get_entity_info
        }

    def _call_llm(self, prompt, format="json"):
        try:
            payload = {
                "model": self.model,
                "prompt": prompt,
                "stream": False,
                "format": format
            }
            resp = requests.post(self.ollama_url, json=payload, timeout=120)
            if resp.status_code == 200:
                data = resp.json()
                return data.get("response", "")
            else:
                print(f"[Ollama Error] Status {resp.status_code}: {resp.text}")
                return "{}"
        except Exception as e:
            print(f"[Ollama Exception] {e}")
            return "{}"

    def _tool_expand_wallet(self, address):
        try:
            resp = requests.post("http://localhost:3000/api/investigation/expand", 
                                 json={"address": address, "chain": "ethereum", "limit": 5},
                                 timeout=15)
            if resp.status_code == 200:
                data = resp.json()
                if data.get("success"):
                    nodes = data["data"].get("nodes", [])
                    edges = data["data"].get("edges", [])
                    return {
                        "discovered_nodes": nodes,
                        "discovered_edges": edges
                    }
            return {"error": f"Failed fetching trace: {resp.text}"}
        except Exception as e:
            return {"error": "Sub-wallet fetch failed timeout or unreachable."}

    def _tool_get_risk_score(self, address):
        return {"risk_score": 87, "reason": "High exposure to sanctioned entities and zero-hop mixing."}

    def _tool_get_entity_info(self, address):
        return {"labels": ["Darknet Market", "High Risk"], "first_seen": "2023-01-10", "last_active": "2023-11-05"}

    def run(self, message: str, case_id: Optional[str] = None):
        system_prompt = """
You are an autonomous AI blockchain investigator (TRM Co-Case Agent clone).
You must use tools ONLY when you specifically need to investigate a wallet address provided by the user.
If the user is just saying hello, asking a general question, or you already have enough information, DO NOT use any tools.

CRITICAL GRAPH AUTOMATION RULE:
When you use `expand_wallet`, it returns "discovered_nodes" and "discovered_edges". 
You MUST include these EXACT objects inside your "graph_updates" array in your final response to physically draw them on the User's canvas.

Available Tools:
1. expand_wallet(address) - Returns direct interactions for a wallet.
2. get_risk_score(address) - Returns ML risk assessment.
3. get_entity_info(address) - Returns known identity/labels.

To use a tool, you MUST output EXACTLY this JSON Format and nothing else:
{"action": "tool", "tool": "tool_name", "args": {"address": "0x..."}}

To reply to the user (either to say hello, ask for an address, or provide a final report), you MUST output EXACTLY this JSON format and nothing else:
{"action": "final", "summary": "Your response to the user here...", "actions_taken": ["..."], "findings": ["..."], "risk_score": 0, "graph_updates": [], "next_steps": ["..."]}

Never wrap JSON in logic blocks. Output raw JSON.
        """
        
        session_context = f"\nUser Query: {message}\n"
        max_steps = 5
        actions_taken = []
        
        for step in range(max_steps):
            full_prompt = system_prompt + session_context + "\nDecide your next step (JSON only):\n"
            
            response_json = self._call_llm(full_prompt)
            print(f"[Agent Step {step}] LLM Output: {response_json}")
            
            try:
                parsed = json.loads(response_json)
            except json.JSONDecodeError:
                # Fallback handler if LLM disobeys strict JSON
                parsed = {
                    "action": "final",
                    "summary": f"Failed to parse LLM response. Raw output: {response_json[:100]}",
                    "actions_taken": actions_taken,
                    "findings": [],
                    "risk_score": 50,
                    "graph_updates": [],
                    "next_steps": ["Refine prompt or check model capabilities"]
                }
                return parsed

            action_type = parsed.get("action")
            
            if action_type == "final":
                parsed["actions_taken"] = actions_taken + parsed.get("actions_taken", [])
                return parsed
                
            elif action_type == "tool":
                tool_name = parsed.get("tool")
                args = parsed.get("args", {})
                
                if tool_name in self.tools:
                    result = self.tools[tool_name](args.get("address"))
                    actions_taken.append(f"Used {tool_name} on {args.get('address')}")
                    session_context += f"\nTool {tool_name}({args}) returned: {json.dumps(result)}\n"
                else:
                    session_context += f"\nError: Tool {tool_name} does not exist.\n"
            else:
                # Force final if confused
                return self._fallback_error("Unknown action type returned by LLM.")
                
        # If loop exhausts without final
        return self._fallback_error("Max reasoning steps reached without final conclusion.")
        
    def _fallback_error(self, message):
         return {
            "summary": f"Agent error: {message}",
            "actions_taken": [],
            "findings": [],
            "risk_score": 0,
            "graph_updates": [],
            "next_steps": []
        }

if __name__ == "__main__":
    agent = InvestigativeAgent()
    print("Testing Agent...")
    res = agent.run("Please analyze wallet 0x1a2b3c4d5e6f and trace its exposure.")
    print(json.dumps(res, indent=2))
