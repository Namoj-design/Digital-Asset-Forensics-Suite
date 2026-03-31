from sklearn.ensemble import IsolationForest
import numpy as np

class TemporalAnomalyDetector:
    def __init__(self, contamination=0.05):
        """
        Anomaly detector based on transaction velocity and value spikes.
        IsolationForest works well for multi-dimensional temporal tabular features.
        """
        self.model = IsolationForest(
            n_estimators=100, 
            contamination=contamination, 
            random_state=42
        )
        self.fitted = False

    def extract_time_series_features(self, graph, node_list):
        """
        Extract velocity-based features from the node graph.
        In a real streaming system, this would aggregate over sliding windows.
        """
        features = []
        for node in node_list:
            in_edges = graph.in_edges(node, data=True)
            out_edges = graph.out_edges(node, data=True)
            
            # Simulated time velocity features since we lack exact timestamps
            tx_count = len(in_edges) + len(out_edges)
            avg_amount = 0
            
            amounts = [d.get('amount', 0) for _, _, d in in_edges] + [d.get('amount', 0) for _, _, d in out_edges]
            if len(amounts) > 0:
                avg_amount = sum(amounts) / len(amounts)
                
            features.append([tx_count, avg_amount])
            
        return np.array(features)

    def fit(self, features):
        self.model.fit(features)
        self.fitted = True

    def predict(self, features):
        if not self.fitted:
            raise Exception("Model not fitted")
        # IsolationForest returns -1 for outliers, 1 for inliers
        predictions = self.model.predict(features)
        
        # Convert to boolean anomaly flags
        return [True if p == -1 else False for p in predictions]
    
    def get_anomaly_scores(self, features):
        if not self.fitted:
            raise Exception("Model not fitted")
        return self.model.score_samples(features)
