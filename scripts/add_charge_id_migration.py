#!/usr/bin/env python3
"""
Script de migration pour ajouter la colonne charge_id à la table payments.

Ce script ajoute la colonne charge_id à la table payments dans PostgreSQL
pour permettre le stockage de l'ID de transaction Stripe nécessaire aux remboursements.

Usage:
    python scripts/add_charge_id_migration.py
"""

import os
import sys
from pathlib import Path

# Ajouter le répertoire parent au path pour les imports
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root / "ecommerce-backend"))

from dotenv import load_dotenv
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

# Charger les variables d'environnement
config_env_path = project_root / "config.env"
if config_env_path.exists():
    load_dotenv(dotenv_path=config_env_path)
else:
    load_dotenv()

def get_database_url():
    """Récupère l'URL de connexion à la base de données depuis les variables d'environnement."""
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        # Construire l'URL depuis les variables individuelles
        db_user = os.getenv("DB_USER", "ecommerce")
        db_password = os.getenv("DB_PASSWORD", "ecommerce123")
        db_host = os.getenv("DB_HOST", "localhost")
        db_port = os.getenv("DB_PORT", "5432")
        db_name = os.getenv("DB_NAME", "ecommerce")
        database_url = f"postgresql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"
    return database_url

def parse_database_url(url):
    """Parse une URL de base de données PostgreSQL."""
    # Format: postgresql://user:password@host:port/database
    url = url.replace("postgresql://", "")
    parts = url.split("@")
    user_pass = parts[0].split(":")
    host_port_db = parts[1].split("/")
    host_port = host_port_db[0].split(":")
    
    return {
        "user": user_pass[0],
        "password": user_pass[1] if len(user_pass) > 1 else "",
        "host": host_port[0],
        "port": host_port[1] if len(host_port) > 1 else "5432",
        "database": host_port_db[1] if len(host_port_db) > 1 else "ecommerce"
    }

def add_charge_id_column():
    """Ajoute la colonne charge_id à la table payments."""
    database_url = get_database_url()
    db_params = parse_database_url(database_url)
    
    print("🚀 Migration : Ajout de la colonne charge_id à la table payments")
    print("=" * 60)
    print(f"📋 Connexion à la base de données : {db_params['host']}:{db_params['port']}/{db_params['database']}")
    
    try:
        # Connexion à PostgreSQL
        conn = psycopg2.connect(
            host=db_params["host"],
            port=db_params["port"],
            database=db_params["database"],
            user=db_params["user"],
            password=db_params["password"]
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()
        
        print("✅ Connexion réussie à la base de données")
        
        # Vérifier si la colonne existe déjà
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'payments' 
            AND column_name = 'charge_id'
        """)
        
        if cursor.fetchone():
            print("ℹ️  La colonne charge_id existe déjà dans la table payments")
            print("✅ Aucune modification nécessaire")
        else:
            # Ajouter la colonne
            print("📝 Ajout de la colonne charge_id...")
            cursor.execute("""
                ALTER TABLE payments 
                ADD COLUMN charge_id VARCHAR(255)
            """)
            print("✅ Colonne charge_id ajoutée avec succès")
        
        # Vérifier que la colonne existe maintenant
        cursor.execute("""
            SELECT 
                column_name, 
                data_type, 
                character_maximum_length,
                is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'payments' 
            AND column_name = 'charge_id'
        """)
        
        result = cursor.fetchone()
        if result:
            print("\n📊 Informations sur la colonne charge_id:")
            print(f"   - Nom: {result[0]}")
            print(f"   - Type: {result[1]}")
            print(f"   - Longueur max: {result[2]}")
            print(f"   - Nullable: {result[3]}")
        
        cursor.close()
        conn.close()
        
        print("\n" + "=" * 60)
        print("✅ Migration terminée avec succès!")
        print("💡 Vous pouvez maintenant utiliser les paiements avec charge_id")
        
    except psycopg2.OperationalError as e:
        print(f"\n❌ Erreur de connexion à la base de données: {e}")
        print("\n💡 Vérifiez que:")
        print("   1. PostgreSQL est démarré")
        print("   2. Les informations de connexion dans config.env sont correctes")
        print("   3. La base de données existe")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Erreur lors de la migration: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    add_charge_id_column()

