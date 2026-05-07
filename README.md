# Ugaoo Business Analytics Project

A business-focused analytics portfolio project built around Ugaoo, a real D2C gardening brand. Combines data analysis, Power BI dashboards, and an AI-powered chatbot using RAG.

## Tech Stack
- Python, FastAPI, pandas, numpy
- React + TypeScript (frontend)
- Ollama + FAISS (RAG backend)
- Power BI (dashboards)
- Docker

## Project Structure
ugao_project/
├── rag_backend/        # FastAPI backend + RAG pipeline
├── ugaoobot/           # React frontend chatbot
├── power bi exported/  # CSVs and analysis notebooks
├── docker-compose.yml  # Run everything with Docker
└── README.md

## How to Run

### 1. Clone the repo
git clone https://github.com/DishuGoyal-tec/ugao_project.git
cd ugao_project

### 2. Set up environment
cp .env.example .env
# Fill in your API keys in .env

### 3. Start backend + Ollama with Docker
docker compose up

### 4. Start frontend
cd ugaoobot
npm install
npm run dev

### 5. Rebuild FAISS index (if needed)
cd rag_backend
python ingest.py

## Screenshots
![Dashboard 1](https://github.com/DishuGoyal-tec/ugao_project/blob/eb9024a08e2ae8bb2863dd30e689e7ff8486cc8d/power%20bi%20exported/Customer%20Analysis%20Dashboard.png)
![Dashboard 2](https://github.com/DishuGoyal-tec/ugao_project/blob/eb9024a08e2ae8bb2863dd30e689e7ff8486cc8d/power%20bi%20exported/Executive%20Dashboard.png)

## Demo
[Watch demo video](https://youtu.be/6YErSi0D5WQ)
