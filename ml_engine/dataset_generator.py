import pandas as pd
import numpy as np
import random
import os

def generate_transaction_dataset(nodes_csv="Dataset/processed_nodes.csv", output_file="Dataset/transactions.csv"):
    """
    Reads the real node features extracted from the PDF Dataset and synthesizes a realistic
    transaction graph (edges) to facilitate GNN structural training.
    Injects structural fraud patterns (Fan-outs, Mixers) between flagged nodes.
    """
    # Load real nodes
    if not os.path.exists(nodes_csv):
        print(f"Dataset {nodes_csv} not found, generating fully synthetic nodes & edges...")
        df = pd.DataFrame()
        normal_nodes = [f"0x_norm_{i}" for i in range(1000)]
        fraud_nodes = [f"0x_fraud_{i}" for i in range(100)]
    else:
        df = pd.read_csv(nodes_csv)
        df = df.head(5000)
        normal_nodes = df[df['FLAG'] == '0']['Address'].tolist()
        fraud_nodes = df[df['FLAG'] == '1']['Address'].tolist()
    
    if len(normal_nodes) == 0:
        normal_nodes = [f"0x_norm_{i}" for i in range(1000)]
    if len(fraud_nodes) == 0:
        fraud_nodes = [f"0x_fraud_{i}" for i in range(100)]
        
    transactions = []
    
    # Generate background normal transactions (Random graph)
    print("Generating background normal transactions...")
    for _ in range(len(normal_nodes) * 3):
        src = random.choice(normal_nodes)
        dst = random.choice(normal_nodes)
        if src != dst:
            transactions.append({
                "from_address": src,
                "to_address": dst,
                "amount": round(random.uniform(0.1, 5.0), 4),
                "timestamp": 1700000000 + random.randint(0, 100000),
                "tx_hash": f"0x_tx_{len(transactions)}"
            })
            
    # Inject Fan-Out Fraud Pattern (One fraudster sending to many normals)
    print("Injecting Fan-Out patterns...")
    for fraudster in fraud_nodes[:20]:
        victims = random.sample(normal_nodes, 15)
        for v in victims:
            transactions.append({
                "from_address": fraudster,
                "to_address": v,
                "amount": round(random.uniform(10.0, 50.0), 4),
                "timestamp": 1700000000 + random.randint(0, 100), # Burst
                "tx_hash": f"0x_tx_{len(transactions)}"
            })
            
    # Inject Mixer Pattern (Many to One to Many with equal amounts)
    print("Injecting Mixer patterns...")
    for mixer in fraud_nodes[20:40]:
        depositors = random.sample(normal_nodes, 10)
        withdrawers = random.sample(normal_nodes, 10)
        
        # Deposits
        for d in depositors:
            transactions.append({
                "from_address": d,
                "to_address": mixer,
                "amount": 10.0,
                "timestamp": 1700000000 + random.randint(0, 200),
                "tx_hash": f"0x_tx_{len(transactions)}"
            })
            
        # Withdrawals
        for w in withdrawers:
            transactions.append({
                "from_address": mixer,
                "to_address": w,
                "amount": 9.9, # Minus fee
                "timestamp": 1700000000 + random.randint(300, 500),
                "tx_hash": f"0x_tx_{len(transactions)}"
            })
            
    # Save to CSV
    tx_df = pd.DataFrame(transactions)
    tx_df.to_csv(output_file, index=False)
    print(f"Generated {len(tx_df)} transactions and saved to {output_file}")
    
    # Save a metadata file for node labels mapping
    df[['Address', 'FLAG']].to_csv('Dataset/node_labels.csv', index=False)
    return True

if __name__ == "__main__":
    generate_transaction_dataset()
