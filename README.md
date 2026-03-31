# 🔍 Digital Asset Forensics Suite

Welcome to the **Digital Asset Forensics Suite**, an enterprise-grade investigation and risk intelligence platform designed to trace, analyze, and map complex digital asset flows. 

Built with modern forensics operations in mind, the platform bridges the gap between on-chain data and off-chain intelligence, empowering investigators to visualize threat vectors, identify illicit entities, and build conclusive case evidence.

---

## ✨ Core Product Features

### 🎨 Investigator Canvas & Threat Mapping
- **Interactive Node Graphs**: A powerful dark-themed "playground" canvas utilizing robust network graphing to intuitively map out money flows, peeling chains, and obfuscation.
- **Intelligence Map Upgrades**: Beyond simple transaction arcs, the map clusters high-risk intelligence signals—such as TOR exit nodes, mixing services, known VPNs, and malicious hosting providers.
- **Heatmap Analytics**: Automatically flags and visualizes geographic and structural hotspots associated with scam networks and hack proceeds.

### 🧠 Advanced ML Intelligence Engine
The platform isn't just a block explorer; it uses artificial intelligence to do the heavy lifting:
- **Graph Neural Networks (GNN)**: Discovers hidden links and illicit network clusters through structural graph embeddings and heuristic pattern recognition.
- **Temporal Modeling**: Analyzes time-series transaction data to detect correlated behaviors such as sophisticated layering operations and automated tumbling.
- **LLM Investigation Agents**: Auto-generates human-readable summaries of complex transaction histories and builds automated preliminary reports.

### 🛡️ Secure Evidence & Case Management
- **Centralized Evidence Vault**: Secure upload, parsing, and management of raw case logs, CSVs, and transaction sets right into the system.
- **Real-Time Canvas Sync**: Work seamlessly as data uploaded to the Evidence Vault can be easily transformed and mapped directly into the Investigator Canvas.
- **Reporting Module**: Generate unassailable, ready-to-present intelligence reports matching all known intelligence against user-supplied data.

---

## 🏗️ System Architecture

The Forensics Suite is composed of three primary modular layers:

1. **Frontend (Client Application)**
   - **Tech**: React, Vite, TypeScript, Tailwind CSS, Shadcn-UI, React Flow.
   - **Role**: Drives the investigator dashboard, visual canvas, intelligence maps, and the general user interface.

2. **Backend (Investigation Services)**
   - **Tech**: Node.js, Express/Fastify framework, MongoDB, Redis.
   - **Role**: Handles robust API routing, real-time sync across connected investigation clients, database persistence, and orchestration with external blockchain nodes (e.g., Alchemy/Hedera limits).

3. **Machine Learning Engine**
   - **Tech**: Python 3.10+, PyTorch/DGL, NetworkX, Pandas.
   - **Role**: Consumes the structured blockchain sub-graphs to run heuristic behavioral analysis, scoring entities, and extracting deep multi-hop features.

---

## 🚀 Getting Started

To run the full suite locally, you will need to start all three modular components.

### 1. Frontend Development Server
```bash
# Navigate to the project root
npm install
npm run dev
```

### 2. Node.js Backend Services
```bash
# Navigate to the backend directory
cd backend
npm install
# Start the API and orchestration services
npm run dev 
# Or run specific workers like: node server.js
```

### 3. ML Intelligence Engine
```bash
# Navigate to the ML engine directory
cd ml_engine

# Set up the Python virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install the strict dependencies
pip install -r requirements.txt

# Start the inference and processing server
python main.py
```

---

## 🔒 Security & Contribution

As this repository contains proprietary tracing heuristics, predictive models, and sensitive infrastructure definitions, **this is a fully private repository.** Ensure that access controls, authentication keys (such as Alchemy Keys or Hedera Operator credentials), and `.env` files are never committed to the remote origin.

*Engineered by Namo Industries.*
