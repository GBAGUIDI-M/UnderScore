# Predictor Pro

A complete football prediction platform using a custom XGBoost AI pipeline.

## Features
- **FastAPI Backend**: Reusable endpoints for triggering model training, fetching single match predictions (with Poisson probability calculations), extracting model insights via SHAP, and processing batch CSV predictions.
- **Next.js Frontend**: Clean, blue-themed SaaS dashboard. Features interactive forms, dynamic `recharts` graphs for both individual match breakdowns and global model importance.

## Running the Application

### Option 1: Docker Compose (Recommended)
You can launch both the frontend and backend simultaneously using Docker Compose:
```bash
docker compose up -d --build
```
This will mount the data CSV volumes locally into the container and start:
- Frontend on `http://localhost:3000`
- Backend API on `http://localhost:8000`

### Option 2: Local Development
**1. Start Backend**
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```
**2. Start Frontend**
```bash
cd frontend
npm install
npm run dev
```

The app will be available at `http://localhost:3000`.

## Endpoints overview
- `POST /predict`: Submit HomeTeam & AwayTeam to retrieve prediction probabilities.
- `POST /train`: Retrain the pipeline utilizing Data aggregation + Optuna hyperparameters optimization. Will automatically save all pipeline models locally.
- `GET /explain`: Extract the top 15 most important features according to SHAP.
- `POST /batch`: Batch run predictions on a CSV file.

Enjoy the platform!
