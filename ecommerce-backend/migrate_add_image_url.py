#!/usr/bin/env python3
"""
Script de migration pour ajouter la colonne image_url à la table products.

Ce script ajoute la colonne image_url (VARCHAR(500), nullable) à la table products
si elle n'existe pas déjà.

Usage:
    python migrate_add_image_url.py
"""

import os
import sys
import psycopg2

# Utiliser la même URL que dans database.py
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://ecommerce:ecommerce123@127.0.0.1:5432/ecommerce")

def column_exists(cursor, table_name, column_name):
    """Vérifie si une colonne existe dans une table."""
    cursor.execute("""
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = %s 
            AND column_name = %s
        );
    """, (table_name, column_name))
    return cursor.fetchone()[0]

def migrate():
    """Ajoute la colonne image_url à la table products."""
    print("🔄 Connexion à la base de données PostgreSQL...")
    
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()
        
        print("✅ Connexion réussie!")
        print("\n🔍 Vérification de la colonne image_url dans la table products...")
        
        # Vérifier si la colonne existe déjà
        if column_exists(cursor, 'products', 'image_url'):
            print("   ✓ La colonne 'image_url' existe déjà dans la table 'products'")
            print("\n✅ Aucune migration nécessaire, la table est à jour!")
            cursor.close()
            conn.close()
            return True
        
        # Ajouter la colonne
        print("   ➕ Ajout de la colonne 'image_url' (VARCHAR(500), nullable)...")
        cursor.execute("""
            ALTER TABLE products 
            ADD COLUMN image_url VARCHAR(500);
        """)
        
        # Commit des changements
        conn.commit()
        
        print("   ✅ Colonne 'image_url' ajoutée avec succès!")
        
        print("\n" + "="*60)
        print("📊 RÉSUMÉ DE LA MIGRATION")
        print("="*60)
        print("✅ Colonne 'image_url' ajoutée à la table 'products'")
        print("="*60)
        print("✅ Migration terminée avec succès!")
        
        cursor.close()
        conn.close()
        return True
        
    except psycopg2.Error as e:
        print(f"\n❌ Erreur PostgreSQL : {e}")
        print(f"   Code d'erreur : {e.pgcode}")
        if hasattr(e, 'pgerror'):
            print(f"   Message : {e.pgerror}")
        return False
    except Exception as e:
        print(f"\n❌ Erreur : {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("="*60)
    print("🔧 MIGRATION: Ajout de la colonne image_url à products")
    print("="*60)
    print()
    
    success = migrate()
    
    if success:
        print("\n✅ Vous pouvez maintenant relancer votre application!")
    else:
        print("\n❌ La migration a échoué. Vérifiez les erreurs ci-dessus.")
        sys.exit(1)