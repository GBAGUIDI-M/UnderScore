#!/bin/bash

# Terminer les processus enfants si le script est arrêté
trap 'kill %1; kill %2' SIGINT

echo "🚀 Démarrage du backend (FastAPI)..."
cd "/home/mannonde/Downloads/AIMS Data/prototype/backend"
../.venv/bin/uvicorn main:app --reload --port 8000 &

echo "🚀 Démarrage du frontend (Next.js)..."
cd "/home/mannonde/Downloads/AIMS Data/prototype/frontend"
npm run dev &

echo ""
echo "✅ Tout est lancé !"
echo "👉 Site Web : http://localhost:3000"
echo "👉 Intelligence Artificielle : http://localhost:8000"
echo ""
echo "⚠️  Laissez ce terminal ouvert. Appuyez sur Ctrl+C pour tout arrêter."

# Attend que les processus en arrière-plan se terminent
wait
