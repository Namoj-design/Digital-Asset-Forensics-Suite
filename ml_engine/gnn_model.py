import torch
import torch.nn.functional as F
from torch_geometric.nn import SAGEConv, GCNConv

class FraudGNN(torch.nn.Module):
    def __init__(self, in_channels, hidden_channels, out_channels=1, model_type='SAGE'):
        super(FraudGNN, self).__init__()
        self.model_type = model_type
        
        if model_type == 'SAGE':
            self.conv1 = SAGEConv(in_channels, hidden_channels)
            self.conv2 = SAGEConv(hidden_channels, hidden_channels)
            self.conv3 = SAGEConv(hidden_channels, out_channels)
        else:
            self.conv1 = GCNConv(in_channels, hidden_channels)
            self.conv2 = GCNConv(hidden_channels, hidden_channels)
            self.conv3 = GCNConv(hidden_channels, out_channels)
            
        self.dropout = torch.nn.Dropout(p=0.3)

    def forward(self, x, edge_index):
        # Layer 1
        x = self.conv1(x, edge_index)
        x = F.relu(x)
        x = self.dropout(x)
        
        # Layer 2
        x = self.conv2(x, edge_index)
        x = F.relu(x)
        x = self.dropout(x)
        
        # Layer 3 (Output)
        x = self.conv3(x, edge_index)
        
        # Sigmoid for binary structural anomaly score
        return torch.sigmoid(x)
