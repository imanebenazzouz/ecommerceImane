#!/bin/bash
# Script de démarrage unifié pour l'e-commerce en développement
# ==============================================================
#
# Ce script permet de démarrer l'application en mode développement :
# - Backend : API FastAPI avec hot-reload sur port 8000
# - Frontend : Application React avec Vite sur port 5173
# - Base de données : PostgreSQL via Docker si nécessaire
#
# Fonctionnalités :
# - Détection automatique des ports occupés
# - Installation automatique des dépendances
# - Gestion des environnements virtuels Python
# - Démarrage de PostgreSQL via Docker si nécessaire
#
# Usage :
#   ./start.sh backend   # Démarrer uniquement l'API
#   ./start.sh frontend # Démarrer uniquement React
#   ./start.sh all      # Démarrer les deux (défaut)
#   ./start.sh help     # Afficher l'aide

set -e

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction pour afficher les messages colorés
print_message() {
    echo -e "${2}${1}${NC}"
}

# Fonction pour vérifier si un port est utilisé
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # Port utilisé
    else
        return 1  # Port libre
    fi
}

# Fonction pour démarrer le backend
start_backend() {
    print_message "🚀 Démarrage du backend..." $BLUE
    
    cd ecommerce-backend
    
    # Charger la configuration email (Brevo) si présente
    if [ -f "config_email.sh" ]; then
        print_message "📧 Chargement de la configuration email (config_email.sh)" $YELLOW
        source config_email.sh
    fi
    
    # Vérifier si l'environnement virtuel existe
    if [ ! -d "venv" ]; then
        print_message "📦 Création de l'environnement virtuel..." $YELLOW
        python3 -m venv venv
    fi
    
    # Activer l'environnement virtuel
    source venv/bin/activate
    
    # Installer systématiquement les dépendances (évite les modules manquants comme psycopg2)
    print_message "📥 Installation des dépendances Python..." $YELLOW
    if [ -f "requirements_python313.txt" ]; then
        pip install --upgrade --no-cache-dir -r requirements_python313.txt
    else
        pip install --upgrade --no-cache-dir -r requirements.txt
    fi
    
    # Vérifier si PostgreSQL est disponible
    if ! pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
        print_message "⚠️  PostgreSQL n'est pas démarré. Démarrage avec Docker..." $YELLOW
        if command -v docker-compose &> /dev/null; then
            docker-compose up -d postgres
            sleep 5
        else
            print_message "❌ Docker Compose non disponible. Veuillez démarrer PostgreSQL manuellement." $RED
            exit 1
        fi
    fi
    
    # Initialiser la base de données
    print_message "🗄️  Initialisation de la base de données..." $YELLOW
    python init_db.py
    
    # Vérifier si le port 8000 est libre
    if check_port 8000; then
        print_message "⚠️  Le port 8000 est déjà utilisé. Arrêt du processus..." $YELLOW
        lsof -ti:8000 | xargs kill -9 2>/dev/null || true
        sleep 2
    fi
    
    # Démarrer l'API
    print_message "🌐 Démarrage de l'API sur http://localhost:8000" $GREEN
    print_message "📚 Documentation: http://localhost:8000/docs" $GREEN
    uvicorn api:app --host 0.0.0.0 --port 8000 --reload
}

# Fonction pour démarrer le frontend
start_frontend() {
    print_message "🎨 Démarrage du frontend..." $BLUE
    
    cd ecommerce-front
    
    # Vérifier si node_modules existe
    if [ ! -d "node_modules" ]; then
        print_message "📦 Installation des dépendances Node.js..." $YELLOW
        npm install
    fi
    
    # Vérifier si le port 5173 est libre
    if check_port 5173; then
        print_message "⚠️  Le port 5173 est déjà utilisé. Arrêt du processus..." $YELLOW
        lsof -ti:5173 | xargs kill -9 2>/dev/null || true
        sleep 2
    fi
    
    # Démarrer le serveur de développement
    print_message "🌐 Démarrage du frontend sur http://localhost:5173" $GREEN
    npm run dev
}

# Fonction pour démarrer les deux
start_all() {
    print_message "🚀 Démarrage complet de l'application e-commerce..." $BLUE
    
    # Démarrer le backend en arrière-plan
    start_backend &
    BACKEND_PID=$!
    
    # Attendre que le backend soit prêt
    print_message "⏳ Attente du démarrage du backend..." $YELLOW
    sleep 5
    
    # Démarrer le frontend
    start_frontend &
    FRONTEND_PID=$!
    
    # Fonction de nettoyage
    cleanup() {
        print_message "🛑 Arrêt des services..." $YELLOW
        kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
        exit 0
    }
    
    # Capturer les signaux d'arrêt
    trap cleanup SIGINT SIGTERM
    
    # Attendre que les processus se terminent
    wait
}

# Fonction d'aide
show_help() {
    echo "Usage: $0 [backend|frontend|all]"
    echo ""
    echo "Options:"
    echo "  backend   Démarrer uniquement le backend (API)"
    echo "  frontend  Démarrer uniquement le frontend (React)"
    echo "  all       Démarrer les deux services"
    echo "  help      Afficher cette aide"
    echo ""
    echo "Exemples:"
    echo "  $0 backend    # Démarrer l'API sur http://localhost:8000"
    echo "  $0 frontend   # Démarrer React sur http://localhost:5173"
    echo "  $0 all        # Démarrer les deux services"
}

# Vérifier les arguments
case "${1:-all}" in
    backend)
        start_backend
        ;;
    frontend)
        start_frontend
        ;;
    all)
        start_all
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        print_message "❌ Option invalide: $1" $RED
        show_help
        exit 1
        ;;
esac
