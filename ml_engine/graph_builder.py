import pandas as pd
import networkx as nx
import torch
from torch_geometric.data import Data
from feature_engineering import FeatureExtractor

class GraphBuilder:
    def __init__(self, tx_file="Dataset/transactions.csv", labels_file="Dataset/node_labels.csv"):
        self.tx_file = tx_file
        self.labels_file = labels_file
        self.nx_graph = nx.DiGraph()
        
    def build_networkx(self):
        """Constructs a directed NetworkX graph from a transaction list."""
        print("Loading transactions into NetworkX...")
        df = pd.read_csv(self.tx_file)
        
        for _, row in df.iterrows():
            self.nx_graph.add_edge(
                row['from_address'], 
                row['to_address'], 
                amount=row['amount'],
                timestamp=row['timestamp'],
                tx_hash=row['tx_hash']
            )
            
        print(f"Built NetworkX graph with {self.nx_graph.number_of_nodes()} nodes and {self.nx_graph.number_of_edges()} edges")
        return self.nx_graph
        
    def build_pytorch_geometric(self):
        """Converts the NetworkX graph into a PyTorch Geometric Data object with computed features and labels."""
        if self.nx_graph.number_of_nodes() == 0:
            self.build_networkx()
            
        print("Extracting features...")
        extractor = FeatureExtractor(self.nx_graph)
        features_dict = extractor.extract_node_features()
        
        # Mapping addresses to integer IDs
        node_mapping = {n: i for i, n in enumerate(self.nx_graph.nodes())}
        
        # Construct Edge Index (2 x num_edges)
        edge_index = []
        for u, v in self.nx_graph.edges():
            edge_index.append([node_mapping[u], node_mapping[v]])
            
        edge_index = torch.tensor(edge_index, dtype=torch.long).t().contiguous()
        
        # Construct Node Features (num_nodes x num_features)
        x = []
        for node in self.nx_graph.nodes():
            x.append(features_dict[node])
        x = torch.tensor(x, dtype=torch.float)
        
        # Apply labels if available
        y = torch.zeros(self.nx_graph.number_of_nodes(), dtype=torch.float)
        try:
            labels_df = pd.read_csv(self.labels_file)
            labels_dict = dict(zip(labels_df['Address'], labels_df['FLAG'].astype(float)))
            
            for node in self.nx_graph.nodes():
                y[node_mapping[node]] = labels_dict.get(node, 0.0)
        except Exception as e:
            print("Warning: Could not load labels, defaulting to 0", e)

        data = Data(x=x, edge_index=edge_index, y=y)
        data.node_mapping = node_mapping # Keep reference for explainability
        
        print("PyG Data object created successfully.")
        return data, self.nx_graph
