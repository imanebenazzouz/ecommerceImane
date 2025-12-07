#!/usr/bin/env python3
"""
Script de migration pour ajouter les colonnes supplémentaires à la table products.

Ce script ajoute les colonnes suivantes à la table products:
- characteristics (TEXT, nullable) - Caractéristiques du produit
- usage_advice (TEXT, nullable) - Conseil d'utilisation
- commitment (TEXT, nullable) - Engagement (garantie, retour, etc.)
- composition (TEXT, nullable) - Composition du produit

Usage:
    python migrate_add_product_fields.py
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
    """Ajoute les nouvelles colonnes à la table products."""
    print("🔄 Connexion à la base de données PostgreSQL...")
    
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()
        
        print("✅ Connexion réussie!")
        
        # Liste des colonnes à ajouter
        columns_to_add = [
            ('characteristics', 'TEXT', 'Caractéristiques du produit'),
            ('usage_advice', 'TEXT', 'Conseil d\'utilisation'),
            ('commitment', 'TEXT', 'Engagement (garantie, retour, etc.)'),
            ('composition', 'TEXT', 'Composition du produit'),
        ]
        
        added_columns = []
        existing_columns = []
        
        print("\n🔍 Vérification des colonnes dans la table products...")
        
        for column_name, column_type, description in columns_to_add:
            if column_exists(cursor, 'products', column_name):
                print(f"   ✓ La colonne '{column_name}' existe déjà")
                existing_columns.append(column_name)
            else:
                print(f"   ➕ Ajout de la colonne '{column_name}' ({description})...")
                cursor.execute(f"""
                    ALTER TABLE products 
                    ADD COLUMN {column_name} {column_type};
                """)
                added_columns.append(column_name)
        
        if not added_columns:
            print("\n✅ Aucune migration nécessaire, toutes les colonnes existent déjà!")
            cursor.close()
            conn.close()
            return True
        
        # Commit des changements
        conn.commit()
        
        print("\n" + "="*60)
        print("📊 RÉSUMÉ DE LA MIGRATION")
        print("="*60)
        if added_columns:
            print(f"✅ Colonnes ajoutées ({len(added_columns)}):")
            for col in added_columns:
                print(f"   - {col}")
        if existing_columns:
            print(f"\nℹ️  Colonnes déjà présentes ({len(existing_columns)}):")
            for col in existing_columns:
                print(f"   - {col}")
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
    print("🔧 MIGRATION: Ajout des colonnes supplémentaires à products")
    print("="*60)
    print()
    
    success = migrate()
    
    if success:
        print("\n✅ Vous pouvez maintenant relancer votre application!")
    else:
        print("\n❌ La migration a échoué. Vérifiez les erreurs ci-dessus.")
        sys.exit(1)

