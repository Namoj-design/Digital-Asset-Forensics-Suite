import os
import json
import torch
from datetime import datetime
import networkx as nx

from graph_builder import GraphBuilder
from feature_engineering import FeatureExtractor
from pattern_rules import RuleBasedDetector
from temporal_model import TemporalAnomalyDetector
from gnn_model import FraudGNN

class InferencePipeline:
    def __init__(self, model_path="ml_engine/fraud_gnn.pth"):
        self.builder = GraphBuilder()
        self.data, self.nx_graph = self.builder.build_pytorch_geometric()
        
        self.rule_detector = RuleBasedDetector(self.nx_graph)
        
        # Temporal Anomaly
        self.temporal = TemporalAnomalyDetector()
        self.temporal_features = self.temporal.extract_time_series_features(self.nx_graph, list(self.nx_graph.nodes()))
        self.temporal.fit(self.temporal_features)
        
        # GNN Model
        self.device = torch.device('cpu')
        in_channels = self.data.x.shape[1]
        self.gnn = FraudGNN(in_channels=in_channels, hidden_channels=64).to(self.device)
        
        if os.path.exists(model_path):
            self.gnn.load_state_dict(torch.load(model_path, map_location=self.device))
        self.gnn.eval()
        
        # Ensure we have predictions ready
        with torch.no_grad():
            self.gnn_preds = self.gnn(self.data.x, self.data.edge_index).squeeze().numpy()

    def analyze_local_subgraph(self, target_wallet, k_hops=2):
        """
        Extract k-hop subgraph around the target wallet for real-time inference.
        """
        if target_wallet not in self.nx_graph:
            return {"error": "Target wallet not found in graph."}
            
        # Compile local subgraph
        subgraph_nodes = nx.single_source_shortest_path_length(self.nx_graph, target_wallet, cutoff=k_hops).keys()
        subgraph = self.nx_graph.subgraph(subgraph_nodes)
        
        results = []
        
        # 1. Rule-Based Detections
        # Run localized detection
        local_rules = RuleBasedDetector(subgraph).run_all()
        
        for node in subgraph_nodes:
            is_suspicious = False
            reasons = []
            features_triggered = []
            
            # Rule based matches
            if node in local_rules:
                for rule in local_rules[node]:
                    reasons.append(rule["reason"])
                    features_triggered.append(rule["type"])
                    is_suspicious = True
                    
            # Temporal matches
            node_idx_in_list = list(self.nx_graph.nodes()).index(node)
            temp_feat = [self.temporal_features[node_idx_in_list]]
            is_temp_anomaly = self.temporal.predict(temp_feat)[0]
            
            if is_temp_anomaly:
                reasons.append("Temporal anomaly: Abnormal transaction volume/frequency.")
                features_triggered.append("burst_activity")
                is_suspicious = True
                
            # GNN Matches
            node_internal_id = self.data.node_mapping[node]
            gnn_score = float(self.gnn_preds[node_internal_id])
            
            if gnn_score > 0.7:
                reasons.append(f"GNN structural classification flags as malicious (Score: {gnn_score:.2f})")
                features_triggered.append("structural_anomaly")
                is_suspicious = True
                
            if is_suspicious:
                # Find connected edges within subgraph to structure explainability
                connected_edges = []
                for u, v, d in subgraph.in_edges(node, data=True):
                    connected_edges.append(d.get('tx_hash', f"hash_{u}_{v}"))
                for u, v, d in subgraph.out_edges(node, data=True):
                    connected_edges.append(d.get('tx_hash', f"hash_{u}_{v}"))
                    
                severity = "high" if gnn_score > 0.8 else "medium"
                    
                results.append({
                    "pattern_type": features_triggered[0] if features_triggered else "unknown",
                    "nodes": [node],
                    "edges": [x for i, x in enumerate(set(connected_edges)) if i < 5] + (["..."] if len(connected_edges) > 5 else []), # Summary
                    "confidence": float(int(gnn_score * 10000)) / 10000.0,
                    "explanation": {
                        "reason": " | ".join(reasons),
                        "features_triggered": features_triggered
                    },
                    "timestamp": datetime.utcnow().isoformat() + "Z",
                    "severity": severity
                })
                
        return results

# Streaming Integration Placeholder
class KafkaInferenceStream:
    def __init__(self, pipeline):
        self.pipeline = pipeline
        
    def stream_listener(self):
        # placeholder for confluent_kafka Consumer
        print("Listening for real-time transactions on Kafka topic 'tx-stream'...")
        # on message -> build localized edge -> run self.pipeline.analyze_local_subgraph -> produce to 'alerts'

if __name__ == "__main__":
    import sys
    pipeline = InferencePipeline()
    
    target = sys.argv[1] if len(sys.argv) > 1 else list(pipeline.nx_graph.nodes())[0]  
    print(f"\\n--- RUNNING INFERENCE ON WALLET: {target} (2-hops) ---")
    
    report = pipeline.analyze_local_subgraph(target, k_hops=2)
    
    print("\\n[OUTPUT JSON SCHEMA]")
    print(json.dumps(report, indent=4))
