import networkx as nx
import numpy as np

class FeatureExtractor:
    def __init__(self, graph: nx.DiGraph):
        self.graph = graph

    def extract_node_features(self):
        """
        Extract topological and statistical features for all nodes.
        Returns a dictionary mapping node id to feature vector.
        """
        in_degrees = dict(self.graph.in_degree())
        out_degrees = dict(self.graph.out_degree())
        
        # Centrality
        try:
            pagerank = nx.pagerank(self.graph, alpha=0.85, max_iter=50)
        except:
            pagerank = {n: 0.0 for n in self.graph.nodes()}
            
        try:
            clustering = nx.clustering(self.graph)
        except:
            clustering = {n: 0.0 for n in self.graph.nodes()}

        features = {}
        for node in self.graph.nodes():
            # Calculate value based features
            in_edges = self.graph.in_edges(node, data=True)
            out_edges = self.graph.out_edges(node, data=True)
            
            in_amounts = [d.get('amount', 0) for u, v, d in in_edges]
            out_amounts = [d.get('amount', 0) for u, v, d in out_edges]
            
            total_in = sum(in_amounts)
            total_out = sum(out_amounts)
            
            # Entropy of transactions (Mixer heuristic)
            amounts = in_amounts + out_amounts
            if len(amounts) > 0:
                p = np.array(amounts) / (sum(amounts) + 1e-9)
                entropy = -np.sum(p * np.log2(p + 1e-9))
            else:
                entropy = 0.0

            # Feature vector representation
            features[node] = [
                in_degrees.get(node, 0),
                out_degrees.get(node, 0),
                total_in,
                total_out,
                pagerank.get(node, 0.0) if isinstance(pagerank, dict) else 0.0,
                clustering.get(node, 0.0) if isinstance(clustering, dict) else 0.0,
                entropy
            ]
            
        return features

    def get_feature_matrix(self, node_list):
        features = self.extract_node_features()
        return np.array([features[n] for n in node_list])
