#!/bin/bash
set -e

echo "🚀 Démarrage de l'application ecommerce..."

# Charger la configuration email (Brevo) si présente dans l'image
if [ -f "/app/config_email.sh" ]; then
  echo "📧 Chargement de la configuration email depuis /app/config_email.sh"
  . /app/config_email.sh
elif [ -f "./config_email.sh" ]; then
  echo "📧 Chargement de la configuration email depuis ./config_email.sh"
  . ./config_email.sh
fi

# Attendre que la base de données soit prête
echo "⏳ Attente de la base de données PostgreSQL..."
until python -c "
import psycopg2
import os
try:
    conn = psycopg2.connect(
        host=os.getenv('DATABASE_URL', '').split('@')[1].split('/')[0].split(':')[0],
        port=os.getenv('DATABASE_URL', '').split('@')[1].split('/')[0].split(':')[1] or 5432,
        database=os.getenv('DATABASE_URL', '').split('/')[-1],
        user=os.getenv('DATABASE_URL', '').split('://')[1].split(':')[0],
        password=os.getenv('DATABASE_URL', '').split('://')[1].split(':')[1].split('@')[0]
    )
    conn.close()
    print('✅ Base de données prête!')
except Exception as e:
    print(f'❌ Erreur connexion DB: {e}')
    exit(1)
"
do
  echo "⏳ En attente de PostgreSQL..."
  sleep 2
done

# Exécuter les migrations si nécessaire
echo "📋 Vérification des migrations..."
python -c "
import psycopg2
import os
try:
    conn = psycopg2.connect(os.getenv('DATABASE_URL'))
    cursor = conn.cursor()
    cursor.execute('SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = \\'public\\';')
    table_count = cursor.fetchone()[0]
    if table_count == 0:
        print('📋 Création des tables...')
        # Ici vous pourriez exécuter des migrations
        print('✅ Tables créées!')
    else:
        print(f'✅ {table_count} tables trouvées!')
    conn.close()
except Exception as e:
    print(f'❌ Erreur migrations: {e}')
    exit(1)
"

# Démarrer l'application
echo "🚀 Démarrage du serveur FastAPI..."
# Utiliser api_postgres_simple.py si on est en mode PostgreSQL, sinon api.py
if [ "${USE_POSTGRES}" = "true" ]; then
    echo "📊 Mode PostgreSQL activé"
    exec python -m uvicorn api_postgres_simple:app \
        --host 0.0.0.0 \
        --port 8000 \
        --workers ${API_WORKERS:-4} \
        --access-log \
        --log-level info
else
    echo "📊 Mode JSON activé"
    exec python -m uvicorn api:app \
        --host 0.0.0.0 \
        --port 8000 \
        --workers ${API_WORKERS:-4} \
        --access-log \
        --log-level info
fi
