import torch
import torch.nn as nn
import torch.optim as optim
from graph_builder import GraphBuilder
from gnn_model import FraudGNN
from sklearn.metrics import roc_auc_score, precision_score, recall_score
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def train():
    print("Initializing Graph Builder...")
    # Generate data structure if not exists
    tx_file = os.path.join(BASE_DIR, "Dataset", "transactions.csv")
    if not os.path.exists(tx_file):
        from dataset_generator import generate_transaction_dataset
        success = generate_transaction_dataset()
        if not success:
            return
            
    builder = GraphBuilder()
    data, _ = builder.build_pytorch_geometric()
    
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    data = data.to(device)
    
    in_channels = data.x.shape[1]
    hidden_channels = 64
    
    model = FraudGNN(in_channels=in_channels, hidden_channels=hidden_channels).to(device)
    optimizer = optim.Adam(model.parameters(), lr=0.01, weight_decay=5e-4)
    criterion = nn.BCELoss()
    
    # Train / Test split
    num_nodes = data.num_nodes
    indices = torch.randperm(num_nodes)
    train_idx = indices[:int(0.8 * num_nodes)]
    test_idx = indices[int(0.8 * num_nodes):]
    
    print("Starting Training Loop...")
    for epoch in range(1, 201):
        model.train()
        optimizer.zero_grad()
        out = model(data.x, data.edge_index).squeeze()
        loss = criterion(out[train_idx], data.y[train_idx])
        loss.backward()
        optimizer.step()
        
        if epoch % 20 == 0:
            model.eval()
            with torch.no_grad():
                pred = model(data.x, data.edge_index).squeeze()
                test_loss = criterion(pred[test_idx], data.y[test_idx])
                
                # Metrics
                y_true = data.y[test_idx].cpu().numpy()
                y_pred_prob = pred[test_idx].cpu().numpy()
                y_pred_class = (y_pred_prob > 0.5).astype(int)
                
                try:
                    auc = roc_auc_score(y_true, y_pred_prob)
                    precision = precision_score(y_true, y_pred_class, zero_division=0)
                    recall = recall_score(y_true, y_pred_class, zero_division=0)
                except ValueError:
                    auc = precision = recall = 0.0
                    
                print(f"Epoch {epoch:03d} | Train Loss: {loss:.4f} | Test Loss: {test_loss:.4f} | AUC: {auc:.4f} | Prec: {precision:.4f} | Rec: {recall:.4f}")
                
    # Save the model
    torch.save(model.state_dict(), "ml_engine/fraud_gnn.pth")
    print("Model saved to ml_engine/fraud_gnn.pth")

if __name__ == "__main__":
    train()
