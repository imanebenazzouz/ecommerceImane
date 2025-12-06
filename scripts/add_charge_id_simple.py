#!/usr/bin/env python3
"""
Script de migration simple pour ajouter la colonne charge_id à la table payments.

Usage:
    python3 scripts/add_charge_id_simple.py
"""

import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

# Paramètres de connexion (modifiez si nécessaire)
DB_HOST = "localhost"
DB_PORT = "5432"
DB_NAME = "ecommerce"
DB_USER = "ecommerce"
DB_PASSWORD = "ecommerce123"

def add_charge_id_column():
    """Ajoute la colonne charge_id à la table payments."""
    print("🚀 Migration : Ajout de la colonne charge_id à la table payments")
    print("=" * 60)
    print(f"📋 Connexion à la base de données : {DB_HOST}:{DB_PORT}/{DB_NAME}")
    
    try:
        # Connexion à PostgreSQL
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            database=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD
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
        print("   2. Les informations de connexion sont correctes")
        print("   3. La base de données existe")
        print("\n📝 Pour modifier les paramètres de connexion, éditez ce script")
        return False
    except Exception as e:
        print(f"\n❌ Erreur lors de la migration: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    return True

if __name__ == "__main__":
    success = add_charge_id_column()
    exit(0 if success else 1)

