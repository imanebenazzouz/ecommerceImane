#!/usr/bin/env bash
# Lance le backend et le frontend en même temps.
# Usage : ./start.sh   (ou bash start.sh)
# Arrêt : Ctrl+C (arrête les deux).

set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

# Arrêter le backend à la sortie du script (y compris Ctrl+C)
cleanup() {
  echo ""
  echo "Arrêt du backend (PID $BACKEND_PID)..."
  kill "$BACKEND_PID" 2>/dev/null || true
  exit 0
}
trap cleanup EXIT INT TERM

echo "Démarrage du backend (API) sur http://localhost:8000 ..."
cd "$ROOT/ecommerce-backend"
python3 api.py &
BACKEND_PID=$!
cd "$ROOT"

# Laisser le backend un peu démarrer
sleep 2

echo "Démarrage du frontend sur http://localhost:5173 ..."
cd "$ROOT/ecommerce-front"
npm run dev
