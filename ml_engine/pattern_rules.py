import networkx as nx

class RuleBasedDetector:
    def __init__(self, graph: nx.DiGraph):
        self.graph = graph

    def detect_fan_out(self, threshold=10, time_window=None):
        """Detect wallets dispersing funds to many addresses rapidly"""
        flagged = []
        features = {}
        for node in self.graph.nodes():
            out_deg = self.graph.out_degree(node)
            if out_deg >= threshold:
                flagged.append(node)
                features[node] = {"reason": f"High fan-out (out-degree: {out_deg})", "type": "fan_out"}
        return flagged, features

    def detect_fan_in(self, threshold=10):
        """Detect aggregation wallets"""
        flagged = []
        features = {}
        for node in self.graph.nodes():
            in_deg = self.graph.in_degree(node)
            if in_deg >= threshold:
                flagged.append(node)
                features[node] = {"reason": f"High fan-in (in-degree: {in_deg})", "type": "fan_in"}
        return flagged, features

    def detect_cycles(self, max_length=5):
        """Detect circular flows using simple cycles"""
        cycles = list(nx.simple_cycles(self.graph))
        flagged = []
        features = {}
        for cycle in cycles:
            if isinstance(cycle, list) or isinstance(cycle, tuple):
                if len(cycle) <= max_length and len(cycle) > 2:
                    for node in cycle:
                        if node not in flagged:
                            flagged.append(node)
                            features[node] = {"reason": f"Participant in {len(cycle)}-hop cycle flow", "type": "circular_flow"}
        return flagged, features

    def detect_mixer_behavior(self, min_tx=5):
        """Heuristic: High transactions with exactly equal amounts"""
        flagged = []
        features = {}
        for node in self.graph.nodes():
            out_edges = self.graph.out_edges(node, data=True)
            if len(out_edges) >= min_tx:
                amounts = [d.get('amount', 0) for u, v, d in out_edges]
                # If all amounts are exactly the same and > 0
                if len(set(amounts)) == 1 and amounts[0] > 0:
                    flagged.append(node)
                    features[node] = {"reason": "Repeated identical output values (Mixer heuristic)", "type": "mixer"}
        return flagged, features

    def run_all(self):
        import collections
        results = collections.defaultdict(list)
        detectors = [self.detect_fan_out, self.detect_fan_in, self.detect_cycles, self.detect_mixer_behavior]
        for detector in detectors:
            nodes, features = detector()
            for n in nodes:
                results[n].append(features[n])
        return dict(results)
