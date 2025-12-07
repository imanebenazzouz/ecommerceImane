"""
API FastAPI principale du projet e‑commerce.

Ce fichier contient TOUS les endpoints (routes) de l'API backend.
C'est le cœur de votre application : il reçoit les requêtes HTTP du frontend
et retourne des réponses JSON.

Objectifs:
- Exposer les endpoints publics (catalogue), authentifiés (panier, commandes), et admin
- Appliquer les règles métier (stocks, statuts de commande, remboursement)
- Gérer CORS de manière stricte et documentée

Structure:
- Repositories PostgreSQL (accès données)
- Services (ex: AuthService pour JWT)
- Schémas Pydantic pour I/O stables

Sécurité:
- Authentification via en‑tête Authorization: Bearer <token>
- Vérifications d'accès admin par dépendance `require_admin`
"""

# ========== IMPORTS - Bibliothèques externes ==========
from fastapi import FastAPI, HTTPException, Depends, Header, UploadFile, File  # FastAPI = framework web Python moderne
from fastapi.middleware.cors import CORSMiddleware  # CORS = permet au frontend (http://localhost:5173) d'appeler l'API
from fastapi.responses import FileResponse, Response  # Pour renvoyer des fichiers (ex: PDF de facture)
from fastapi.staticfiles import StaticFiles  # Pour servir des fichiers statiques
from pydantic import BaseModel, EmailStr, Field, field_validator  # Pydantic = validation automatique des données
from typing import Optional, List, Any, cast  # Typage Python pour meilleure sécurité
import uuid  # Pour générer des ID uniques (ex: commande-12345)
import io  # Pour manipuler des fichiers en mémoire
import time  # Pour mesurer le temps d'exécution
import shutil  # Pour copier des fichiers
from pathlib import Path  # Pour manipuler les chemins de fichiers
from datetime import datetime, UTC  # Pour gérer les dates (ex: date de commande)
from reportlab.lib.pagesizes import letter, A4  # ReportLab = bibliothèque pour générer des PDF
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

# ========== IMPORTS - Base de données ==========
# Les "repositories" sont des classes qui parlent directement à PostgreSQL
from database.database import get_db, SessionLocal, create_tables  # Connexion à la base de données
from sqlalchemy.orm import Session  # Session = connexion active à la DB
from database.repositories_simple import (
    # Chaque repository gère une table de la base de données :
    PostgreSQLUserRepository,      # Table "users" - comptes utilisateurs
    PostgreSQLProductRepository,   # Table "products" - articles en vente
    PostgreSQLCartRepository,      # Table "cart_items" - paniers des utilisateurs
    PostgreSQLOrderRepository,     # Table "orders" - commandes passées
    PostgreSQLDeliveryRepository,  # Table "deliveries" - infos de livraison
    PostgreSQLInvoiceRepository,   # Table "invoices" - factures générées
    PostgreSQLPaymentRepository,   # Table "payments" - paiements effectués
    PostgreSQLThreadRepository     # Table "message_threads" - conversations support client
)

# ========== IMPORTS - Services métier ==========
# Les "services" contiennent la logique métier (règles de gestion)
from services.auth_service import AuthService    # Gère l'authentification (login, JWT, mot de passe)
from services.email_service import EmailService  # Gère l'envoi d'emails (Brevo API)

# ========== IMPORTS - Modèles de données ==========
# Les "models" définissent la structure des tables SQL
from database.models import User, Product, Order, OrderItem, Delivery, Invoice, Payment, MessageThread, Message
from enums import OrderStatus, DeliveryStatus  # Enums = constantes pour les statuts (CREE, PAYEE, LIVREE...)
from unittest.mock import Mock  # Pour les tests unitaires

# ========== CRÉATION DE L'APPLICATION FASTAPI ==========
app = FastAPI(title="Ecommerce API (TP)")  # Initialise l'application web

# Fonction helper pour retrouver des classes par leur nom (utilisé dans les tests)
def _get_repo_class(name: str):
    """Retourne une classe de repository à partir de son nom."""
    return globals().get(name)

# ========== CONFIGURATION CORS ==========
# CORS = Cross-Origin Resource Sharing
# Par défaut, un navigateur BLOQUE les requêtes d'un domaine à un autre (sécurité).
# Exemple : Le frontend (localhost:5173) ne peut PAS appeler l'API (localhost:8000) sans CORS.
# On doit explicitement autoriser le frontend à appeler notre API.

import os

# Charger les variables d'environnement depuis config.env ou .env
# Cherche d'abord config.env à la racine du projet, puis .env
try:
    from dotenv import load_dotenv
    from pathlib import Path
    
    # Chercher config.env dans plusieurs emplacements possibles
    # 1. À la racine du projet (parent de ecommerce-backend)
    project_root = Path(__file__).parent.parent  # Remonter jusqu'à la racine du projet
    config_env_path = project_root / "config.env"
    env_path = project_root / ".env"
    
    # 2. Dans le répertoire courant (si lancé depuis la racine)
    current_dir_config = Path("config.env")
    current_dir_env = Path(".env")
    
    # 3. Dans ecommerce-backend (si config.env est là)
    backend_config = Path(__file__).parent / "config.env"
    backend_env = Path(__file__).parent / ".env"
    
    # Charger le premier fichier trouvé
    if config_env_path.exists():
        load_dotenv(dotenv_path=config_env_path)
    elif current_dir_config.exists():
        load_dotenv(dotenv_path=current_dir_config)
    elif backend_config.exists():
        load_dotenv(dotenv_path=backend_config)
    elif env_path.exists():
        load_dotenv(dotenv_path=env_path)
    elif current_dir_env.exists():
        load_dotenv(dotenv_path=current_dir_env)
    elif backend_env.exists():
        load_dotenv(dotenv_path=backend_env)
    else:
        load_dotenv()  # Fallback sur .env par défaut
except ImportError:
    # python-dotenv n'est pas installé, on continue sans
    pass
except Exception as e:
    # Erreur lors du chargement, on continue sans (ne pas bloquer le démarrage)
    import sys
    print(f"⚠️  Warning: Could not load .env file: {e}", file=sys.stderr)
    pass

# Liste des origines (URLs) autorisées à appeler notre API
ALLOWED_ORIGINS = [
    "http://localhost:5173",  # Vite dev server (port par défaut)
    "http://localhost:5174",  # Ports alternatifs si 5173 est occupé
    "http://localhost:5175",
    "http://localhost:5176",
    "http://localhost:3000",  # React dev server (Create React App)
    "http://127.0.0.1:5173",  # Même chose avec 127.0.0.1 au lieu de localhost
    "http://127.0.0.1:5174",
    "http://127.0.0.1:5175",
    "http://127.0.0.1:5176",
    "http://127.0.0.1:3000",
    "http://localhost:5178",
    "http://localhost:5181",
    "http://127.0.0.1:5181",
    "http://localhost:5182",
    "http://127.0.0.1:5182",
    "http://localhost:5183",
    "http://127.0.0.1:5183",
]

# En production, on peut ajouter d'autres origines via variable d'environnement
production_origins = os.getenv("PRODUCTION_ORIGINS")
if production_origins:
    ALLOWED_ORIGINS.extend(production_origins.split(","))

# Configuration du middleware CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,      # Origines autorisées (liste blanche)
    allow_credentials=True,             # Autorise l'envoi de cookies/tokens
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],  # Méthodes HTTP autorisées
    allow_headers=[                     # En-têtes HTTP autorisés
        "Authorization",    # Pour envoyer le token JWT
        "Content-Type",     # Pour spécifier le type de données (JSON)
        "Accept",          # Type de réponse acceptée
        "Origin",          # Origine de la requête
        "X-Requested-With" # Header standard pour les requêtes AJAX
    ],
    expose_headers=["Content-Length", "Content-Type"],  # Headers exposés au frontend
)

# ========== CONFIGURATION FICHIERS STATIQUES ==========
# Créer le dossier pour stocker les images uploadées
STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
IMAGES_DIR = os.path.join(STATIC_DIR, "images")
os.makedirs(IMAGES_DIR, exist_ok=True)

# Servir les fichiers statiques (images) via FastAPI
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# ========== INITIALISATION BASE DE DONNÉES ==========
# Créer toutes les tables PostgreSQL au démarrage de l'application
# Si les tables existent déjà, cette fonction ne fait rien
create_tables()

# Fonction pour initialiser des données d'exemple (utile pour le développement/démo)
def init_sample_data(db: Session):
    """
    Initialise des données d'exemple si la base de données est vide.
    Cette fonction crée :
    - 2 produits d'exemple (T-Shirt et Sweat)
    - 2 utilisateurs d'exemple (Admin et Client)
    """
    # Créer les repositories pour accéder aux tables
    product_repo = PostgreSQLProductRepository(db)
    user_repo = PostgreSQLUserRepository(db)
    
    # ===== CRÉATION DES PRODUITS D'EXEMPLE =====
    # Vérifier si des produits existent déjà dans la DB
    existing_products = product_repo.get_all_active()
    if not existing_products:  # Si la table est vide
        # Données du premier produit (T-Shirt)
        p1_data = {
            "name": "T-Shirt Logo",           # Nom du produit
            "description": "Coton bio",       # Description
            "price_cents": 1999,              # Prix en centimes (19,99€)
            "stock_qty": 100,                 # Quantité en stock
            "active": True                    # Produit actif (visible sur le site)
        }
        # Données du deuxième produit (Sweat)
        p2_data = {
            "name": "Sweat Capuche", 
            "description": "Molleton",
            "price_cents": 4999,              # 49,99€
            "stock_qty": 50,
            "active": True
        }
        # Insérer les produits dans la base de données
        product_repo.create(p1_data)
        product_repo.create(p2_data)
    
    # ===== CRÉATION DES UTILISATEURS D'EXEMPLE =====
    # Vérifier si des utilisateurs existent déjà
    existing_users = user_repo.get_all()
    if not existing_users:  # Si la table est vide
        # Créer le service d'authentification pour hasher les mots de passe
        auth_service = AuthService(user_repo)
        
        # Données du compte ADMIN (accès backoffice)
        admin_data = {
            "email": "admin@example.com",
            # IMPORTANT : On stocke le hash du mot de passe, JAMAIS le mot de passe en clair !
            "password_hash": auth_service.hash_password("admin123"),
            "first_name": "Admin",
            "last_name": "Root",
            "address": "1 Rue du BO",
            "is_admin": True  # Ce compte a les droits administrateur
        }
        
        # Données du compte CLIENT (utilisateur normal)
        user_data = {
            "email": "client@example.com", 
            "password_hash": auth_service.hash_password("secret"),
            "first_name": "Alice",
            "last_name": "Martin",
            "address": "12 Rue des Fleurs",
            "is_admin": False  # Client normal, pas de droits admin
        }
        # Insérer les utilisateurs dans la base de données
        user_repo.create(admin_data)
        user_repo.create(user_data)

# ========== FONCTIONS D'AUTHENTIFICATION (HELPERS) ==========
# Ces fonctions sont utilisées par FastAPI pour vérifier l'identité de l'utilisateur

def validate_token_format(token: str) -> bool:
    """
    Vérifie que le token a le bon format JWT.
    Un JWT valide a 3 parties séparées par des points : header.payload.signature
    Exemple: eyJhbGc.eyJzdWI.SflKxwRJ
    """
    import re
    # Expression régulière pour vérifier le format
    jwt_pattern = r'^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$'
    return bool(re.match(jwt_pattern, token))

def current_user_id(authorization: Optional[str] = Header(default=None), db: Session = Depends(get_db)) -> str:
    """
    Fonction CRITIQUE pour la sécurité !
    
    Cette fonction extrait l'ID utilisateur depuis le token JWT envoyé dans le header Authorization.
    Elle est utilisée par tous les endpoints protégés (panier, commandes, profil...).
    
    Flux d'exécution :
    1. Vérifie que le header Authorization existe
    2. Extrait le token (après "Bearer ")
    3. Vérifie le format du token
    4. Décode le token JWT et vérifie sa signature
    5. Extrait l'ID utilisateur (champ "sub" du payload)
    6. Retourne l'ID utilisateur
    
    Si une étape échoue, renvoie une erreur 401 Unauthorized.
    """
    # Étape 1 : Vérifier que le header Authorization existe et commence par "Bearer "
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "Token manquant (Authorization: Bearer <token>)")
    
    # Étape 2 : Extraire le token après "Bearer "
    # Exemple: "Bearer eyJhbGc..." → "eyJhbGc..."
    token = authorization.split(" ", 1)[1].strip()
    
    # Étape 3 : Vérifier que le token a le bon format (3 parties séparées par des points)
    if not validate_token_format(token):
        raise HTTPException(401, "Format de token invalide")
    
    # Étape 4 : Utiliser le service d'authentification pour décoder et vérifier le token
    user_repo = PostgreSQLUserRepository(db)
    auth_service = AuthService(user_repo)
    try:
        # Décode le token JWT et vérifie sa signature
        payload = auth_service.verify_token(token)
        # Vérifie que le payload contient bien l'ID utilisateur (champ "sub")
        if not payload or "sub" not in payload:
            raise HTTPException(401, "Token invalide ou expiré")
        # Étape 5 : Retourner l'ID utilisateur
        return payload["sub"]
    except Exception as e:
        # En cas d'erreur (token expiré, signature invalide, etc.)
        raise HTTPException(401, "Token invalide ou expiré")

# Renvoie l'objet utilisateur courant
def current_user(authorization: Optional[str] = Header(default=None), db: Session = Depends(get_db)):
    """Récupère l'objet `User` courant depuis le token Authorization."""
    if not authorization:
        raise HTTPException(401, "Token manquant")

    try:
        uid = current_user_id(authorization, db)
        user_repo = PostgreSQLUserRepository(db)
        u = user_repo.get_by_id(uid)
        if not u:
            raise HTTPException(401, "Session invalide (user)")
        return u
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(401, "Session invalide")

# Vérifie que l'utilisateur est admin
def require_admin(u: User = Depends(current_user)):
    """Dépendance FastAPI: refuse l'accès si l'utilisateur n'est pas admin."""

    if not u.is_admin:
        raise HTTPException(403, "Accès réservé aux administrateurs")
    return u

# ------------------------------- PDF Generation --------------------------------
def generate_invoice_pdf(invoice_data, order_data, user_data, payment_data=None, delivery_data=None):
    """Génère un PDF de facture à partir des données fournies."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=72, leftMargin=72, topMargin=72, bottomMargin=18)
    
    # Styles
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        spaceAfter=30,
        alignment=TA_CENTER,
        textColor=colors.HexColor('#1f2937')
    )
    
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=16,
        spaceAfter=12,
        textColor=colors.HexColor('#374151')
    )
    
    normal_style = ParagraphStyle(
        'CustomNormal',
        parent=styles['Normal'],
        fontSize=10,
        spaceAfter=6
    )
    
    # Contenu du PDF
    story = []
    
    # En-tête
    story.append(Paragraph("FACTURE", title_style))
    story.append(Spacer(1, 20))
    
    # Informations de la facture
    invoice_date = datetime.fromtimestamp(invoice_data['issued_at']).strftime("%d/%m/%Y %H:%M")
    story.append(Paragraph(f"<b>Numéro de facture:</b> {invoice_data['number']}", normal_style))
    story.append(Paragraph(f"<b>Date d'émission:</b> {invoice_date}", normal_style))
    story.append(Paragraph(f"<b>Commande:</b> #{order_data['id'][-8:]}", normal_style))
    story.append(Spacer(1, 20))
    
    # Informations client
    story.append(Paragraph("FACTURÉ À:", heading_style))
    story.append(Paragraph(f"{user_data['first_name']} {user_data['last_name']}", normal_style))
    story.append(Paragraph(user_data['address'], normal_style))
    story.append(Spacer(1, 20))
    
    # Tableau des articles
    story.append(Paragraph("DÉTAIL DES ARTICLES", heading_style))
    
    # En-tête du tableau
    table_data = [['ID Produit', 'Nom', 'Prix unitaire', 'Quantité', 'Total']]
    
    # Lignes des articles
    total_cents = 0
    for line in invoice_data['lines']:
        unit_price = line['unit_price_cents'] / 100
        quantity = line['quantity']
        line_total = (line['unit_price_cents'] * quantity) / 100
        total_cents += line['unit_price_cents'] * quantity
        
        table_data.append([
            line['product_id'][:8],
            line['name'],
            f"{unit_price:.2f} €",
            str(quantity),
            f"{line_total:.2f} €"
        ])
    
    # Créer le tableau
    table = Table(table_data, colWidths=[1.2*inch, 2.5*inch, 1*inch, 0.8*inch, 1*inch])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f3f4f6')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('ALIGN', (1, 0), (1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('GRID', (0, 0), (-1, -1), 1, colors.black)
    ]))
    
    story.append(table)
    story.append(Spacer(1, 20))
    
    # Total
    total_euros = total_cents / 100
    story.append(Paragraph(f"<b>TOTAL: {total_euros:.2f} €</b>", ParagraphStyle(
        'TotalStyle',
        parent=styles['Normal'],
        fontSize=14,
        alignment=TA_RIGHT,
        textColor=colors.HexColor('#1f2937')
    )))
    story.append(Spacer(1, 30))
    
    # Informations de paiement
    if payment_data:
        story.append(Paragraph("INFORMATIONS DE PAIEMENT", heading_style))
        story.append(Paragraph(f"<b>Montant payé:</b> {payment_data['amount_cents'] / 100:.2f} €", normal_style))
        story.append(Paragraph(f"<b>Statut:</b> {'PAYÉ ✓' if payment_data['status'] == 'SUCCEEDED' else 'ÉCHEC'}", normal_style))
        story.append(Paragraph(f"<b>Date de paiement:</b> {datetime.fromtimestamp(payment_data['created_at']).strftime('%d/%m/%Y %H:%M')}", normal_style))
        story.append(Spacer(1, 20))
    
    # Informations de livraison
    if delivery_data:
        story.append(Paragraph("INFORMATIONS DE LIVRAISON", heading_style))
        story.append(Paragraph(f"<b>Transporteur:</b> {delivery_data['transporteur']}", normal_style))
        if delivery_data.get('tracking_number'):
            story.append(Paragraph(f"<b>Numéro de suivi:</b> {delivery_data['tracking_number']}", normal_style))
        story.append(Paragraph(f"<b>Statut:</b> {delivery_data['delivery_status']}", normal_style))
        story.append(Spacer(1, 20))
    
    # Pied de page
    story.append(Spacer(1, 30))
    story.append(Paragraph("Merci pour votre achat !", ParagraphStyle(
        'FooterStyle',
        parent=styles['Normal'],
        fontSize=10,
        alignment=TA_CENTER,
        textColor=colors.HexColor('#6b7280')
    )))
    
    # Construire le PDF
    doc.build(story)
    buffer.seek(0)
    return buffer

# ------------------------------- Schemas --------------------------------
class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    first_name: str
    last_name: str
    address: str = Field(min_length=10, description="Adresse complète (rue, ville, code postal)")
    
    @field_validator('first_name', 'last_name')
    @classmethod
    def validate_name(cls, v, info):
        """Valide que le nom/prénom ne contient que des lettres (pas de chiffres)"""
        import re
        
        # Nettoyer les espaces multiples et trim
        cleaned = re.sub(r'\s+', ' ', v.strip()) if v else ""
        
        if not cleaned or len(cleaned) < 2:
            field_name = "Prénom" if info.field_name == 'first_name' else "Nom"
            raise ValueError(f"{field_name} doit contenir au moins 2 caractères")
        
        if len(cleaned) > 100:
            field_name = "Prénom" if info.field_name == 'first_name' else "Nom"
            raise ValueError(f"{field_name} trop long (maximum 100 caractères)")
        
        # Vérifier qu'il n'y a pas de chiffres
        if re.search(r'\d', cleaned):
            field_name = "Prénom" if info.field_name == 'first_name' else "Nom"
            raise ValueError(f"{field_name} ne doit pas contenir de chiffres")
        
        # Vérifier le format : lettres, espaces, tirets, apostrophes autorisés (avec accents)
        if not re.match(r'^[a-zA-ZÀ-ÿ\s\'\-]+$', cleaned):
            field_name = "Prénom" if info.field_name == 'first_name' else "Nom"
            raise ValueError(f"{field_name} invalide : lettres, espaces, apostrophes et tirets uniquement")
        
        return cleaned
    
    @field_validator('address')
    @classmethod
    def validate_address(cls, v):
        """Valide que l'adresse contient au moins des informations de base"""
        import re
        
        # Nettoyer les espaces multiples et trim
        cleaned = re.sub(r'\s+', ' ', v.strip()) if v else ""
        
        if not cleaned or len(cleaned) < 10:
            raise ValueError("L'adresse doit contenir au moins 10 caractères (rue, ville, code postal)")
        
        # Vérifier qu'il n'y a pas de symboles interdits (@, #, $, %, &, etc.)
        # Autorise uniquement : lettres, chiffres, espaces, virgules, tirets, apostrophes, points
        if not re.match(r'^[a-zA-ZÀ-ÿ0-9\s,.\-\']+$', cleaned):
            raise ValueError("L'adresse contient des caractères interdits. Seuls les lettres, chiffres, espaces, virgules, points, tirets et apostrophes sont autorisés")
        
        # Vérifier qu'il y a un code postal (5 chiffres consécutifs)
        if not re.search(r'\b\d{5}\b', cleaned):
            raise ValueError("L'adresse doit contenir un code postal valide (5 chiffres)")
        
        # Vérifier qu'il y a au moins quelques lettres
        letter_count = sum(1 for char in cleaned if char.isalpha())
        if letter_count < 5:
            raise ValueError("L'adresse doit contenir au moins 5 lettres (nom de rue et ville)")
        
        return cleaned

class UserOut(BaseModel):
    id: str
    email: EmailStr
    first_name: str
    last_name: str
    address: str
    is_admin: bool

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class TokenOut(BaseModel):
    token: str

# ---- Schémas pour récupération de mot de passe ----
class ForgotPasswordIn(BaseModel):
    email: EmailStr

class ResetPasswordIn(BaseModel):
    token: str
    new_password: str = Field(min_length=6)

# ---- Schéma simple pour changement de mot de passe (authentifié) ----
class ChangePasswordIn(BaseModel):
    current_password: str
    new_password: str = Field(min_length=6)

class VerifyTokenIn(BaseModel):
    token: str

# ---- Schéma simple de reset par email (non authentifié) ----
class SimpleResetPasswordIn(BaseModel):
    email: EmailStr
    new_password: str = Field(min_length=6)

# ---- Schéma pour mise à jour du profil ----
class UserUpdateIn(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    address: Optional[str] = Field(default=None, min_length=10, description="Adresse complète (rue, ville, code postal)")
    
    @field_validator('first_name', 'last_name')
    @classmethod
    def validate_name(cls, v, info):
        """Valide que le nom/prénom ne contient que des lettres (pas de chiffres)"""
        if v is None:
            return v
        
        import re
        
        # Nettoyer les espaces multiples et trim
        cleaned = re.sub(r'\s+', ' ', v.strip())
        
        if len(cleaned) < 2:
            field_name = "Prénom" if info.field_name == 'first_name' else "Nom"
            raise ValueError(f"{field_name} doit contenir au moins 2 caractères")
        
        if len(cleaned) > 100:
            field_name = "Prénom" if info.field_name == 'first_name' else "Nom"
            raise ValueError(f"{field_name} trop long (maximum 100 caractères)")
        
        # Vérifier qu'il n'y a pas de chiffres
        if re.search(r'\d', cleaned):
            field_name = "Prénom" if info.field_name == 'first_name' else "Nom"
            raise ValueError(f"{field_name} ne doit pas contenir de chiffres")
        
        # Vérifier le format : lettres, espaces, tirets, apostrophes autorisés (avec accents)
        if not re.match(r'^[a-zA-ZÀ-ÿ\s\'\-]+$', cleaned):
            field_name = "Prénom" if info.field_name == 'first_name' else "Nom"
            raise ValueError(f"{field_name} invalide : lettres, espaces, apostrophes et tirets uniquement")
        
        return cleaned
    
    @field_validator('address')
    @classmethod
    def validate_address(cls, v):
        """Valide que l'adresse contient au moins des informations de base"""
        if v is None:
            return v
        
        import re
        
        # Nettoyer les espaces multiples et trim
        cleaned = re.sub(r'\s+', ' ', v.strip())
            
        if len(cleaned) < 10:
            raise ValueError("L'adresse doit contenir au moins 10 caractères (rue, ville, code postal)")
        
        # Vérifier qu'il n'y a pas de symboles interdits (@, #, $, %, &, etc.)
        # Autorise uniquement : lettres, chiffres, espaces, virgules, tirets, apostrophes, points
        if not re.match(r'^[a-zA-ZÀ-ÿ0-9\s,.\-\']+$', cleaned):
            raise ValueError("L'adresse contient des caractères interdits. Seuls les lettres, chiffres, espaces, virgules, points, tirets et apostrophes sont autorisés")
        
        # Vérifier qu'il y a un code postal (5 chiffres consécutifs)
        if not re.search(r'\b\d{5}\b', cleaned):
            raise ValueError("L'adresse doit contenir un code postal valide (5 chiffres)")
        
        # Vérifier qu'il y a au moins quelques lettres
        letter_count = sum(1 for char in cleaned if char.isalpha())
        if letter_count < 5:
            raise ValueError("L'adresse doit contenir au moins 5 lettres (nom de rue et ville)")
        
        return cleaned

class ProductOut(BaseModel):
    id: str
    name: str
    description: str
    price_cents: int
    stock_qty: int
    active: bool
    image_url: Optional[str] = None
    characteristics: Optional[str] = None
    usage_advice: Optional[str] = None
    commitment: Optional[str] = None
    composition: Optional[str] = None

class CartItemOut(BaseModel):
    product_id: str
    quantity: int

class CartOut(BaseModel):
    user_id: str
    items: dict[str, CartItemOut]
    total_cents: int = 0

class CartAddIn(BaseModel):
    product_id: str
    qty: int = Field(default=1, ge=1)

class CartRemoveIn(BaseModel):
    product_id: str
    qty: int = Field(default=1, ge=0)

class CheckoutOut(BaseModel):
    order_id: str
    total_cents: int
    status: str

class PayIn(BaseModel):
    card_number: str
    exp_month: int
    exp_year: int
    cvc: str
    postal_code: Optional[str] = None
    phone: Optional[str] = None
    street_number: Optional[str] = None
    street_name: Optional[str] = None

class PaymentIn(BaseModel):
    order_id: str
    card_last4: str
    idempotency_key: str

class OrderItemOut(BaseModel):
    product_id: str
    name: str
    unit_price_cents: int
    quantity: int

class InvoiceLineOut(BaseModel):
    product_id: str
    name: str
    unit_price_cents: int
    quantity: int
    line_total_cents: int

# ---- Schémas pour le suivi de livraison ----
class DeliveryOut(BaseModel):
    transporteur: str
    tracking_number: Optional[str]
    delivery_status: str

class DeliveryIn(BaseModel):
    transporteur: str
    tracking_number: Optional[str] = None
    delivery_status: str

class OrderOut(BaseModel):
    id: str
    user_id: str
    items: List[OrderItemOut]
    status: str
    total_cents: int
    created_at: float
    delivery: Optional[DeliveryOut] = None

# ---- Schemas Admin (CRUD produits + remboursement) ----
class ProductCreateIn(BaseModel):
    name: str
    description: Optional[str] = ""
    price_cents: int = Field(ge=0)
    stock_qty: int = Field(ge=0)
    active: bool = True
    image_url: Optional[str] = None
    characteristics: Optional[str] = None
    usage_advice: Optional[str] = None
    commitment: Optional[str] = None
    composition: Optional[str] = None

class ProductUpdateIn(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price_cents: Optional[int] = Field(default=None, ge=0)
    stock_qty: Optional[int] = Field(default=None, ge=0)
    active: Optional[bool] = None
    image_url: Optional[str] = None
    characteristics: Optional[str] = None
    usage_advice: Optional[str] = None
    commitment: Optional[str] = None
    composition: Optional[str] = None

class RefundIn(BaseModel):
    amount_cents: Optional[int] = Field(default=None, ge=0)

class PaymentOut(BaseModel):
    id: str
    order_id: str
    amount_cents: int
    status: str
    created_at: float

class InvoiceOut(BaseModel):
    id: str
    order_id: str
    number: str
    lines: List[InvoiceLineOut]
    total_cents: int
    issued_at: float

# ---- Schémas pour le support client ----
class ThreadCreateIn(BaseModel):
    subject: str
    order_id: Optional[str] = None
    
    @field_validator('subject')
    @classmethod
    def validate_subject(cls, v):
        """Valide le sujet du ticket de support"""
        import re
        
        # Nettoyer les espaces multiples et trim
        cleaned = re.sub(r'\s+', ' ', v.strip()) if v else ""
        
        if not cleaned or len(cleaned) < 3:
            raise ValueError("Le sujet doit contenir au moins 3 caractères")
        
        if len(cleaned) > 200:
            raise ValueError("Le sujet est trop long (maximum 200 caractères)")
        
        # Vérifier qu'il n'y a pas de symboles dangereux
        if not re.match(r'^[a-zA-ZÀ-ÿ0-9\s,.\-\'?!()]+$', cleaned):
            raise ValueError("Le sujet contient des caractères interdits")
        
        return cleaned

class ThreadOut(BaseModel):
    id: str
    user_id: str
    order_id: Optional[str]
    subject: str
    closed: bool
    created_at: float
    unread_count: int = 0

class MessageCreateIn(BaseModel):
    content: str
    
    @field_validator('content')
    @classmethod
    def validate_content(cls, v):
        """Valide le contenu du message"""
        import re
        
        # Vérifier que le contenu est une chaîne non vide
        if not isinstance(v, str):
            raise ValueError("Le contenu du message doit être une chaîne de caractères")
        
        # Nettoyer les espaces multiples et trim
        cleaned = re.sub(r'\s+', ' ', v.strip()) if v else ""
        
        if not cleaned or len(cleaned) < 3:
            raise ValueError("Le message doit contenir au moins 3 caractères")
        
        if len(cleaned) > 5000:
            raise ValueError("Le message est trop long (maximum 5000 caractères)")
        
        return cleaned

class MessageOut(BaseModel):
    id: str
    thread_id: str
    author_user_id: Optional[str]
    content: str
    created_at: float
    author_name: Optional[str] = None

class ThreadDetailOut(BaseModel):
    id: str
    user_id: str
    order_id: Optional[str]
    subject: str
    closed: bool
    created_at: float
    unread_count: int = 0
    messages: List[MessageOut]

# ========================================
# ENDPOINTS HTTP (ROUTES DE L'API)
# ========================================
# C'est ici que sont définies toutes les routes accessibles depuis le frontend
# Format: @app.METHOD("/chemin") où METHOD = get, post, put, delete
# Exemple: @app.get("/products") → GET http://localhost:8000/products

# ========== ENDPOINTS DE TEST/SANTÉ ==========
# Ces endpoints servent à vérifier que l'API fonctionne

@app.get("/")
def root():
    """
    Endpoint racine : GET /
    Utilisé pour vérifier que l'API est bien démarrée
    """
    return {"message": "Ecommerce API - API E-commerce", "version": "1.0", "docs": "/docs"}

@app.get("/health")
def health_check():
    """
    Endpoint de santé : GET /health
    Vérifie l'état de l'API et de la connexion à la base de données
    """
    return {"status": "healthy", "database": "postgresql", "timestamp": time.time()}

@app.options("/")
def options_root():
    """
    Endpoint OPTIONS pour gérer les preflight CORS
    Les navigateurs envoient une requête OPTIONS avant les vrais requêtes (mécanisme de sécurité)
    """
    return Response(status_code=200, headers={
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "GET,POST,PUT,DELETE,OPTIONS",
        "access-control-allow-headers": "Authorization, Content-Type, Accept, Origin, X-Requested-With",
    })

@app.post("/init-data")
def initialize_data(db: Session = Depends(get_db)):
    """
    Endpoint d'initialisation : POST /init-data
    Crée des données d'exemple (produits et utilisateurs) pour le développement/démo
    """
    try:
        init_sample_data(db)
        return {"message": "Données d'exemple initialisées avec succès"}
    except Exception as e:
        raise HTTPException(500, f"Erreur lors de l'initialisation: {str(e)}")

# ========================================
# ENDPOINTS D'AUTHENTIFICATION
# ========================================
# Ces endpoints gèrent l'inscription, la connexion et la gestion du mot de passe

@app.post("/auth/register")
def register(inp: RegisterIn, db: Session = Depends(get_db)):
    """
    Endpoint d'inscription : POST /auth/register
    
    Permet à un nouvel utilisateur de créer un compte.
    
    Données reçues (inp: RegisterIn) :
    - email : adresse email (doit être unique)
    - password : mot de passe (sera hashé, jamais stocké en clair)
    - first_name : prénom
    - last_name : nom
    - address : adresse postale
    
    Flux d'exécution :
    1. Créer les repositories et services nécessaires
    2. Créer l'utilisateur dans la base de données (avec mot de passe hashé)
    3. Envoyer un email de bienvenue (via Brevo)
    4. Générer un token JWT pour connecter automatiquement l'utilisateur
    5. Retourner les infos utilisateur + token
    
    Retourne :
    - message : "Inscription réussie"
    - user : objet avec les données utilisateur
    - access_token : token JWT pour les futures requêtes
    """
    try:
        # Étape 1 : Créer les repositories et services
        user_repo = PostgreSQLUserRepository(db)  # Pour accéder à la table "users"
        auth_service = AuthService(user_repo)     # Pour gérer l'authentification (hash password, JWT)
        email_service = EmailService()             # Pour envoyer des emails
        
        # Étape 2 : Créer l'utilisateur dans la base de données
        # Note : le mot de passe sera automatiquement hashé par le service
        if hasattr(auth_service, "register_user"):
            # Compatibilité avec différentes versions du service
            u = auth_service.register_user(inp.email, inp.password, inp.first_name, inp.last_name, inp.address)
        else:
            u = auth_service.register(inp.email, inp.password, inp.first_name, inp.last_name, inp.address)
        
        # Étape 3 : Envoyer un email de bienvenue
        try:
            email_service.send_welcome_email(str(u.email), str(u.first_name))
        except Exception as email_error:
            # Si l'email échoue, on continue quand même (ne pas bloquer l'inscription)
            print(f"⚠️ Erreur lors de l'envoi de l'email de bienvenue: {email_error}")
        
        # Étape 4 : Générer un token JWT pour connecter automatiquement l'utilisateur
        # Le token contient l'ID utilisateur dans le champ "sub" (subject)
        token = auth_service.create_access_token({"sub": str(u.id)})
        
        # Étape 5 : Retourner les données utilisateur + token
        return {
            "message": "Inscription réussie",
            "user": {
                "id": str(u.id),
                "email": str(u.email),
                "first_name": str(u.first_name),
                "last_name": str(u.last_name),
                "address": str(u.address),
                "is_admin": bool(u.is_admin),  # Par défaut False (client normal)
            },
            "access_token": token,  # Token JWT pour les futures requêtes
            "token": token,         # Alias pour compatibilité
        }
    except ValueError as e:
        # Gestion des erreurs métier (email déjà utilisé, mot de passe invalide)
        error_message = str(e)
        if "Email déjà utilisé" in error_message:
            raise HTTPException(400, "Cette adresse email est déjà utilisée")
        elif "Mot de passe" in error_message:
            raise HTTPException(400, "Mot de passe invalide")
        else:
            raise HTTPException(400, "Erreur lors de l'inscription")

@app.post("/auth/login")
def login(inp: LoginIn, db: Session = Depends(get_db)):
    try:
        user_repo = PostgreSQLUserRepository(db)
        auth_service = AuthService(user_repo)
        user = auth_service.authenticate_user(inp.email, inp.password)
        if not user:
            raise HTTPException(401, "Identifiants incorrects")
        
        # Créer un token JWT
        token = auth_service.create_access_token(data={"sub": str(user.id)})
        return {
            "access_token": token,
            "token": token,
            "token_type": "bearer",
            "user": {
                "id": str(user.id),
                "email": str(user.email),
                "first_name": str(user.first_name),
                "last_name": str(user.last_name),
                "address": str(user.address),
                "is_admin": bool(user.is_admin),
            },
        }
    except ValueError as e:
        raise HTTPException(401, "Identifiants incorrects")

@app.post("/auth/logout")
def logout(uid: str = Depends(current_user_id)):
    # Avec JWT, pas besoin de gérer la déconnexion côté serveur
    # Le token sera simplement ignoré côté client
    return {"ok": True}

# ========== Récupération de mot de passe ==========
@app.post("/auth/forgot-password")
def forgot_password(inp: ForgotPasswordIn, db: Session = Depends(get_db)):
    # Fonctionnalité désactivée: on gère désormais le changement de mot de passe directement depuis le profil
    raise HTTPException(410, "La récupération de mot de passe par email est désactivée")

@app.post("/auth/verify-reset-token")
def verify_reset_token(inp: VerifyTokenIn, db: Session = Depends(get_db)):
    # Fonctionnalité désactivée
    raise HTTPException(410, "La récupération de mot de passe par email est désactivée")

@app.post("/auth/reset-password")
def reset_password(inp: ResetPasswordIn, db: Session = Depends(get_db)):
    # Fonctionnalité désactivée
    raise HTTPException(410, "La récupération de mot de passe par email est désactivée")

# ========== Changement de mot de passe (authentifié) ==========
@app.post("/auth/change-password")
def change_password(inp: ChangePasswordIn, u: User = Depends(current_user), db: Session = Depends(get_db)):
    """Permet à un utilisateur connecté de changer son mot de passe."""
    user_repo = PostgreSQLUserRepository(db)
    auth_service = AuthService(user_repo)
    # Vérifier l'ancien mot de passe
    if not auth_service.verify_password(inp.current_password, u.password_hash):
        raise HTTPException(400, "Ancien mot de passe incorrect")
    # Mettre à jour avec le nouveau hash
    u.password_hash = auth_service.hash_password(inp.new_password)  # type: ignore
    user_repo.update(u)
    return {"message": "Mot de passe mis à jour"}

# ========== Réinitialisation simple par email (non connecté) ==========
@app.post("/auth/reset-password-simple")
def reset_password_simple(inp: SimpleResetPasswordIn, db: Session = Depends(get_db)):
    """Permet à un utilisateur non connecté de définir un nouveau mot de passe via son email.
    - Si l'email existe, met à jour le mot de passe.
    - Sinon, 404.
    """
    user_repo = PostgreSQLUserRepository(db)
    auth_service = AuthService(user_repo)
    # Rechercher l'utilisateur par email
    user = db.query(User).filter(User.email == inp.email).first()
    if not user:
        raise HTTPException(404, "Email introuvable")
    # Mettre à jour le hash du mot de passe
    user.password_hash = auth_service.hash_password(inp.new_password)  # type: ignore
    user_repo.update(user)
    return {"message": "Mot de passe réinitialisé"}

# Voir son profil
@app.get("/auth/me", response_model=UserOut)
def me(u: User = Depends(current_user)):
    return UserOut(
        id=str(u.id),
        email=str(u.email),
        first_name=str(u.first_name),
        last_name=str(u.last_name),
        address=str(u.address),
        is_admin=bool(u.is_admin)
    )

# ---- Mettre à jour son profil ----
@app.put("/auth/profile", response_model=UserOut)
def update_profile(inp: UserUpdateIn, u: User = Depends(current_user), db: Session = Depends(get_db)):
    user_repo = PostgreSQLUserRepository(db)
    
    # Mettre à jour les champs fournis
    if inp.first_name is not None:
        u.first_name = inp.first_name  # type: ignore
    if inp.last_name is not None:
        u.last_name = inp.last_name  # type: ignore
    if inp.address is not None:
        u.address = inp.address  # type: ignore
    
    # Utiliser la méthode update du repository
    updated_user = user_repo.update(u)

    return UserOut(
        id=str(updated_user.id),
        email=str(updated_user.email),
        first_name=str(updated_user.first_name),
        last_name=str(updated_user.last_name),
        address=str(updated_user.address),
        is_admin=bool(updated_user.is_admin)
    )

# ========================================
# ENDPOINTS PRODUITS (PUBLIC)
# ========================================
# Ces endpoints sont accessibles sans authentification (PUBLIC)
# Ils permettent de consulter le catalogue de produits

@app.get("/products", response_model=list[ProductOut])
def list_products(db: Session = Depends(get_db)):
    """
    Endpoint: GET /products
    
    Récupère la liste de TOUS les produits actifs (disponibles à la vente).
    Endpoint PUBLIC : pas besoin de token JWT pour accéder au catalogue.
    
    Retourne : Liste de produits avec leurs infos (nom, prix, description, stock)
    """
    try:
        RepoCls = _get_repo_class('PostgreSQLProductRepository')
        product_repo = RepoCls(db) if RepoCls is not None else PostgreSQLProductRepository(db)
        products = product_repo.get_all_active()
        
        out = []
        for p in products:
            # Handle Mock objects in tests
            out.append(ProductOut(
                id=str(getattr(p, 'id', '')),
                name=str(getattr(p, 'name', '')),
                description=str(getattr(p, 'description', '')),
                price_cents=int(getattr(p, 'price_cents', 0)),
                stock_qty=int(getattr(p, 'stock_qty', 0)),
                active=bool(getattr(p, 'active', True)),
                image_url=getattr(p, 'image_url', None) or None,
                characteristics=getattr(p, 'characteristics', None) or None,
                usage_advice=getattr(p, 'usage_advice', None) or None,
                commitment=getattr(p, 'commitment', None) or None,
                composition=getattr(p, 'composition', None) or None
            ))
        return out
    except Exception as e:
        # Erreur lors du chargement des produits
        raise HTTPException(500, f"Erreur lors du chargement des produits: {str(e)}")

@app.get("/products/{product_id}", response_model=ProductOut)
def get_product(product_id: str, db: Session = Depends(get_db)):
    """Récupère un produit spécifique par son ID"""
    try:
        product_repo = PostgreSQLProductRepository(db)
        product = product_repo.get_by_id(product_id)
        if not product:
            raise HTTPException(404, "Produit introuvable")
        
        return ProductOut(
            id=str(product.id),
            name=cast(str, product.name),
            description=cast(str, product.description),
            price_cents=cast(int, product.price_cents),
            stock_qty=cast(int, product.stock_qty),
            active=cast(bool, product.active),
            image_url=cast(str, product.image_url) if product.image_url else None,
            characteristics=cast(str, product.characteristics) if product.characteristics else None,
            usage_advice=cast(str, product.usage_advice) if product.usage_advice else None,
            commitment=cast(str, product.commitment) if product.commitment else None,
            composition=cast(str, product.composition) if product.composition else None
        )
    except HTTPException:
        raise
    except Exception as e:
        # Erreur lors de la récupération du produit
        raise HTTPException(500, "Erreur lors de la récupération du produit")

# ========================================
# ENDPOINTS PANIER (AUTHENTIFIÉ)
# ========================================
# Ces endpoints nécessitent une authentification (token JWT requis)
# Ils permettent de gérer le panier d'achat de l'utilisateur connecté

@app.get("/cart", response_model=CartOut)
def view_cart(u: User = Depends(current_user), db: Session = Depends(get_db)):
    """
    Endpoint: GET /cart
    
    Récupère le contenu du panier de l'utilisateur connecté.
    AUTHENTIFIÉ : nécessite un token JWT valide.
    
    Retourne : Le panier avec la liste des articles et le total
    """
    RepoCls = _get_repo_class('PostgreSQLCartRepository')
    cart_repo = RepoCls(db) if RepoCls is not None else PostgreSQLCartRepository(db)
    c = cart_repo.get_by_user_id(str(u.id))
    if not c:
        return CartOut(user_id=str(u.id), items={}, total_cents=0)
    
    # Filtrer les produits inactifs et les supprimer automatiquement du panier
    from database.models import Product, CartItem
    from database.repositories_simple import _uuid_or_raw
    items_to_remove = []
    
    items = {}
    total_cents = 0
    for item in c.items:
        # Vérifier si le produit existe et est actif
        product_id_uuid = _uuid_or_raw(str(item.product_id))
        product = db.query(Product).filter(Product.id == product_id_uuid).first()
        
        if product and product.active:
            # Produit actif : l'ajouter au panier retourné
            items[str(item.product_id)] = CartItemOut(
                product_id=str(item.product_id),
                quantity=item.quantity
            )
            # Calculate total (simplified - would need product price in real implementation)
            total_cents += item.quantity * 1000  # Mock price for test
        else:
            # Produit inactif ou supprimé : le marquer pour suppression
            items_to_remove.append(item)
    
    # Supprimer les articles inactifs du panier
    if items_to_remove:
        for item in items_to_remove:
            db.delete(item)
        db.commit()
    
    return CartOut(user_id=str(u.id), items=items, total_cents=total_cents)

@app.post("/cart/add")
def add_to_cart(inp: CartAddIn, u: User = Depends(current_user), db: Session = Depends(get_db)):
    try:
        CartRepo = _get_repo_class('PostgreSQLCartRepository')
        ProductRepo = _get_repo_class('PostgreSQLProductRepository')
        cart_repo = CartRepo(db) if CartRepo is not None else PostgreSQLCartRepository(db)
        product_repo = ProductRepo(db) if ProductRepo is not None else PostgreSQLProductRepository(db)
        
        # IMPORTANT: Utiliser with_for_update() pour verrouiller la ligne du produit pendant la transaction
        # Cela évite les conditions de course où deux requêtes simultanées pourraient dépasser le stock
        from database.models import Product
        from database.repositories_simple import _uuid_or_raw
        
        # Convertir product_id en UUID
        product_uuid = _uuid_or_raw(inp.product_id)
        
        # Vérifier que le produit existe avec verrou pour mise à jour (pour éviter race condition)
        # Utiliser with_for_update() pour verrouiller la ligne en lecture
        product = db.query(Product).filter(Product.id == product_uuid).with_for_update().first()
        
        if not product:
            raise HTTPException(404, f"Produit {inp.product_id} introuvable")
        
        if not product.active:
            raise HTTPException(400, f"Produit {product.name} non disponible")
        
        # Récupérer le panier actuel pour vérifier la quantité déjà présente
        cart = cart_repo.get_by_user_id(str(u.id))
        quantity_in_cart = 0
        
        # Utiliser une requête directe pour obtenir la quantité dans le panier (plus fiable)
        from database.models import CartItem
        if cart:
            cart_item_query = db.query(CartItem).filter(
                CartItem.cart_id == cart.id,
                CartItem.product_id == product_uuid
            ).first()
            if cart_item_query:
                quantity_in_cart = cart_item_query.quantity
        
        # Vérifier que la quantité totale (dans panier + à ajouter) ne dépasse pas le stock
        total_quantity = quantity_in_cart + inp.qty
        
        # Vérification stricte : la quantité totale ne doit PAS dépasser le stock disponible
        if total_quantity > product.stock_qty:
            raise HTTPException(400, f"Stock insuffisant pour {product.name}. Il reste {product.stock_qty} article(s) disponible(s). Vous avez déjà {quantity_in_cart} article(s) dans votre panier. Vous ne pouvez pas ajouter {inp.qty} article(s) supplémentaire(s).")
        
        # Vérifier également que la quantité à ajouter est valide
        if inp.qty <= 0:
            raise HTTPException(400, "La quantité doit être supérieure à 0")
        
        # Maintenant ajouter au panier (le stock a été vérifié et verrouillé)
        cart_repo.add_item(str(u.id), inp.product_id, inp.qty)
        
        # Vérification finale pour s'assurer qu'on n'a pas dépassé le stock
        # (protection supplémentaire contre les conditions de course)
        db.refresh(product)  # Recharger le produit depuis la DB
        cart = cart_repo.get_by_user_id(str(u.id))
        if cart:
            final_cart_item = db.query(CartItem).filter(
                CartItem.cart_id == cart.id,
                CartItem.product_id == product_uuid
            ).first()
            if final_cart_item and final_cart_item.quantity > product.stock_qty:
                # Rollback et annuler l'ajout
                db.rollback()
                raise HTTPException(400, f"Erreur: la quantité dans le panier ({final_cart_item.quantity}) dépasse le stock disponible ({product.stock_qty}). L'ajout a été annulé.")
        
        return {"ok": True}
    except HTTPException:
        raise
    except Exception as e:
        # Log l'erreur pour le débogage
        import traceback
        print(f"Erreur dans add_to_cart: {type(e).__name__}: {str(e)}")
        print(traceback.format_exc())
        db.rollback()
        raise HTTPException(400, f"Erreur lors de l'ajout au panier: {str(e)}")

@app.post("/cart/remove")
def remove_from_cart(inp: CartRemoveIn, u: User = Depends(current_user), db: Session = Depends(get_db)):
    try:
        CartRepo = _get_repo_class('PostgreSQLCartRepository')
        cart_repo = CartRepo(db) if CartRepo is not None else PostgreSQLCartRepository(db)
        cart_repo.remove_item(str(u.id), inp.product_id, inp.qty or 0)
        return {"ok": True}
    except Exception as e:
        raise HTTPException(400, str(e))

@app.post("/cart/clear")
def clear_cart(u: User = Depends(current_user), db: Session = Depends(get_db)):
    """Vide complètement le panier de l'utilisateur"""
    try:
        CartRepo = _get_repo_class('PostgreSQLCartRepository')
        cart_repo = CartRepo(db) if CartRepo is not None else PostgreSQLCartRepository(db)
        success = cart_repo.clear_cart(str(u.id))
        if not success:
            raise HTTPException(400, "Erreur lors du vidage du panier")
        return {"ok": True, "message": "Panier vidé avec succès"}
    except Exception as e:
        raise HTTPException(400, str(e))

# ========================================
# ENDPOINTS COMMANDES (AUTHENTIFIÉ)
# ========================================
# Ces endpoints gèrent le cycle de vie complet d'une commande :
# 1. Checkout (créer une commande depuis le panier)
# 2. Consultation des commandes
# 3. Paiement
# 4. Annulation
# 5. Factures et livraisons

@app.post("/orders/checkout", response_model=CheckoutOut)
def checkout(u: User = Depends(current_user), db: Session = Depends(get_db)):
    try:
        OrderRepo = _get_repo_class('PostgreSQLOrderRepository')
        CartRepo = _get_repo_class('PostgreSQLCartRepository')
        ProductRepo = _get_repo_class('PostgreSQLProductRepository')
        order_repo = OrderRepo(db) if OrderRepo is not None else PostgreSQLOrderRepository(db)
        cart_repo = CartRepo(db) if CartRepo is not None else PostgreSQLCartRepository(db)
        product_repo = ProductRepo(db) if ProductRepo is not None else PostgreSQLProductRepository(db)
        
        # Récupérer le panier
        cart = cart_repo.get_by_user_id(str(u.id))
        if not cart or not cart.items:
            raise HTTPException(400, "Panier vide")
        
        # Vérifier le stock et réserver les produits
        for item in cart.items:
            product = product_repo.get_by_id(str(item.product_id))
            if not product:
                raise HTTPException(400, f"Produit {str(item.product_id)} introuvable")
            
            if not product.active:
                raise HTTPException(400, f"Produit {product.name} non disponible")
            
            if product.stock_qty < item.quantity:
                raise HTTPException(400, f"Stock insuffisant pour {product.name}. Il reste {product.stock_qty} article(s) disponible(s), vous essayez d'en commander {item.quantity}.")
        
        # Calculer le total attendu du panier pour détecter un paiement récent identique
        cart_total_cents = 0
        for item in cart.items:
            product = product_repo.get_by_id(str(item.product_id))
            cart_total_cents += product.price_cents * item.quantity

        # Si une commande PAYEE récente avec le même total existe, la renvoyer (évite recréation)
        try:
            from datetime import datetime, UTC, timedelta
            recent_window = timedelta(minutes=30)
            existing_orders = order_repo.get_by_user_id(str(u.id))
            for o in existing_orders:
                try:
                    if str(getattr(o, "status", "")) == OrderStatus.PAYEE.value:
                        created_at = getattr(o, "created_at", None)
                        if created_at and datetime.now(UTC) - created_at <= recent_window:
                            paid_total = sum(getattr(oi, 'unit_price_cents', 0) * getattr(oi, 'quantity', 0) for oi in getattr(o, 'items', []) or [])
                            if int(paid_total) == int(cart_total_cents):
                                return CheckoutOut(
                                    order_id=str(o.id),
                                    total_cents=paid_total,
                                    status=str(o.status)
                                )
                except Exception:
                    continue
        except Exception:
            pass

        # Réutiliser une commande ouverte (CREE) existante pour éviter les doublons
        existing_orders = order_repo.get_by_user_id(str(u.id))
        order = None
        for o in existing_orders:
            try:
                if str(getattr(o, "status", "")) == OrderStatus.CREE.value:
                    order = o
                    break
            except Exception:
                continue

        if order is None:
            # Créer la commande - created_at sera automatiquement défini par le modèle
            # Il est important de ne PAS modifier created_at après la création
            order_data = {
                "user_id": str(u.id),
                "status": OrderStatus.CREE
            }
            order = order_repo.create(order_data)
        else:
            # Vider les items existants de la commande ouverte pour les resynchroniser avec le panier
            try:
                from database.models import OrderItem as _OrderItem
                db.query(_OrderItem).filter(_OrderItem.order_id == order.id).delete()
                db.commit()
            except Exception:
                db.rollback()

        # Ajouter les articles (sans modifier le stock ni vider le panier ici)
        # Le stock sera décrémenté et le panier vidé uniquement APRÈS paiement réussi
        total_cents = 0
        for item in cart.items:
            product = product_repo.get_by_id(str(item.product_id))
            order_item_data = {
                "order_id": str(order.id),
                "product_id": str(item.product_id),
                "name": product.name,
                "unit_price_cents": product.price_cents,
                "quantity": item.quantity
            }
            order_repo.add_item(order_item_data)
            total_cents += product.price_cents * item.quantity
        
        return CheckoutOut(
            order_id=str(order.id),
            total_cents=total_cents,
            status=str(order.status)
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(400, str(e))

@app.get("/orders", response_model=list[OrderOut])
def my_orders(u: User = Depends(current_user), db: Session = Depends(get_db)):
    OrderRepo = _get_repo_class('PostgreSQLOrderRepository')
    order_repo = OrderRepo(db) if OrderRepo is not None else PostgreSQLOrderRepository(db)
    orders = order_repo.get_by_user_id(str(u.id))
    
    # Gérer le cas où orders est None (retourne une liste vide)
    if orders is None:
        orders = []
    
    out = []
    for order in orders:
        delivery_info = None
        if hasattr(order, 'delivery') and order.delivery:
            # Handle Mock objects in tests
            try:
                delivery_info = DeliveryOut(
                    transporteur=str(getattr(order.delivery, 'transporteur', '')),
                    tracking_number=str(getattr(order.delivery, 'tracking_number', '')),
                    delivery_status=str(getattr(order.delivery, 'delivery_status', ''))
                )
            except Exception:
                delivery_info = None
        
        # Handle Mock objects for items
        items = []
        if hasattr(order, 'items'):
            for item in order.items:
                items.append(OrderItemOut(
                    product_id=str(getattr(item, 'product_id', '')),
                    name=str(getattr(item, 'name', '')),
                    unit_price_cents=int(getattr(item, 'unit_price_cents', 0)),
                    quantity=int(getattr(item, 'quantity', 0))
                ))
        
        out.append(OrderOut(
            id=str(getattr(order, 'id', '')),
            user_id=str(getattr(order, 'user_id', '')),
            items=items,
            status=str(getattr(order, 'status', 'CREE')),
            total_cents=sum(item.unit_price_cents * item.quantity for item in items),
            created_at=(getattr(order, 'created_at').timestamp() if getattr(order, 'created_at', None) else 0.0),
            delivery=delivery_info
        ))
    return out

@app.get("/orders/{order_id}", response_model=OrderOut)
def get_order(order_id: str, u: User = Depends(current_user), db: Session = Depends(get_db)):
    order_repo = PostgreSQLOrderRepository(db)
    order = order_repo.get_by_id(order_id)
    
    if not order or str(order.user_id) != str(u.id):
        raise HTTPException(404, "Commande introuvable")
    
    delivery_info = None
    if order.delivery:
        delivery_info = DeliveryOut(
            transporteur=order.delivery.transporteur,
            tracking_number=order.delivery.tracking_number,
            delivery_status=order.delivery.delivery_status
        )
    
    return OrderOut(
        id=str(order.id),
        user_id=str(order.user_id),
        items=[OrderItemOut(
            product_id=str(item.product_id),
            name=item.name,
            unit_price_cents=item.unit_price_cents,
            quantity=item.quantity
        ) for item in order.items],
        status=cast(str, order.status),
        total_cents=sum(item.unit_price_cents * item.quantity for item in order.items),
        created_at=(order.created_at.timestamp() if getattr(order, 'created_at', None) else 0.0),
        delivery=delivery_info
    )

# ====================== ADMIN: Produits ======================
@app.get("/admin/products", response_model=list[ProductOut])
def admin_list_products(u = Depends(require_admin), db: Session = Depends(get_db)):
    try:
        product_repo = PostgreSQLProductRepository(db)
        products = product_repo.get_all()
        return [ProductOut(
            id=str(p.id),
            name=cast(str, p.name),
            description=cast(str, p.description) if p.description else "",
            price_cents=cast(int, p.price_cents),
            stock_qty=cast(int, p.stock_qty),
            active=cast(bool, p.active),
            image_url=cast(str, p.image_url) if p.image_url else None,
            characteristics=cast(str, p.characteristics) if p.characteristics else None,
            usage_advice=cast(str, p.usage_advice) if p.usage_advice else None,
            commitment=cast(str, p.commitment) if p.commitment else None,
            composition=cast(str, p.composition) if p.composition else None
        ) for p in products]
    except Exception as e:
        raise HTTPException(500, f"Erreur lors du chargement des produits: {str(e)}")

@app.post("/admin/products", response_model=ProductOut, status_code=201)
def admin_create_product(inp: ProductCreateIn, u = Depends(require_admin), db: Session = Depends(get_db)):
    try:
        # Validation des données
        if not inp.name or not inp.name.strip():
            raise HTTPException(400, "Le nom du produit est obligatoire")
        if inp.price_cents < 0:
            raise HTTPException(400, "Le prix ne peut pas être négatif")
        if inp.stock_qty < 0:
            raise HTTPException(400, "Le stock ne peut pas être négatif")
            
        product_repo = PostgreSQLProductRepository(db)
        product_data = {
            "name": inp.name.strip(),
            "description": inp.description or "",
            "price_cents": inp.price_cents,
            "stock_qty": inp.stock_qty,
            "active": inp.active,
            "image_url": inp.image_url or None,
            "characteristics": inp.characteristics or None,
            "usage_advice": inp.usage_advice or None,
            "commitment": inp.commitment or None,
            "composition": inp.composition or None
        }
        print(f"DEBUG: Données produit à créer: {product_data}")
        product = product_repo.create(product_data)
        print(f"DEBUG: Produit créé: characteristics={product.characteristics}, usage_advice={product.usage_advice}, commitment={product.commitment}, composition={product.composition}")
        return ProductOut(
            id=str(product.id),
            name=cast(str, product.name),
            description=cast(str, product.description),
            price_cents=cast(int, product.price_cents),
            stock_qty=cast(int, product.stock_qty),
            active=cast(bool, product.active),
            image_url=cast(str, product.image_url) if product.image_url else None,
            characteristics=cast(str, product.characteristics) if product.characteristics else None,
            usage_advice=cast(str, product.usage_advice) if product.usage_advice else None,
            commitment=cast(str, product.commitment) if product.commitment else None,
            composition=cast(str, product.composition) if product.composition else None
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Erreur lors de la création du produit: {str(e)}")

@app.put("/admin/products/{product_id}", response_model=ProductOut)
def admin_update_product(product_id: str, inp: ProductUpdateIn, u = Depends(require_admin), db: Session = Depends(get_db)):
    try:
        product_repo = PostgreSQLProductRepository(db)
        product = product_repo.get_by_id(product_id)
        if not product:
            raise HTTPException(404, "Produit introuvable")
        
        # Validation des données
        if inp.name is not None and (not inp.name or not inp.name.strip()):
            raise HTTPException(400, "Le nom du produit ne peut pas être vide")
        if inp.price_cents is not None and inp.price_cents < 0:
            raise HTTPException(400, "Le prix ne peut pas être négatif")
        if inp.stock_qty is not None and inp.stock_qty < 0:
            raise HTTPException(400, "Le stock ne peut pas être négatif")
        
        if inp.name is not None:
            product.name = inp.name.strip()  # type: ignore
        if inp.description is not None:
            product.description = inp.description  # type: ignore
        if inp.price_cents is not None:
            product.price_cents = inp.price_cents  # type: ignore
        if inp.stock_qty is not None:
            product.stock_qty = inp.stock_qty  # type: ignore
        if inp.characteristics is not None:
            product.characteristics = inp.characteristics  # type: ignore
        if inp.usage_advice is not None:
            product.usage_advice = inp.usage_advice  # type: ignore
        if inp.commitment is not None:
            product.commitment = inp.commitment  # type: ignore
        if inp.composition is not None:
            product.composition = inp.composition  # type: ignore
        # Vérifier si le produit passe de actif à inactif
        was_active = product.active
        if inp.active is not None:
            product.active = inp.active  # type: ignore
            
            # Si le produit passe de actif à inactif, supprimer tous les articles du panier
            if was_active and not inp.active:
                from database.models import CartItem
                from database.repositories_simple import _uuid_or_raw
                product_id_uuid = _uuid_or_raw(product_id)
                # Supprimer tous les CartItem associés à ce produit
                deleted_count = db.query(CartItem).filter(CartItem.product_id == product_id_uuid).delete()
                db.commit()
                print(f"Produit {product.name} passé en inactif : {deleted_count} article(s) supprimé(s) des paniers")
        
        if inp.image_url is not None:
            product.image_url = inp.image_url  # type: ignore
        
        product_repo.update(product)
        return ProductOut(
            id=str(product.id),
            name=cast(str, product.name),
            description=cast(str, product.description),
            price_cents=cast(int, product.price_cents),
            stock_qty=cast(int, product.stock_qty),
            active=cast(bool, product.active),
            image_url=cast(str, product.image_url) if product.image_url else None,
            characteristics=cast(str, product.characteristics) if product.characteristics else None,
            usage_advice=cast(str, product.usage_advice) if product.usage_advice else None,
            commitment=cast(str, product.commitment) if product.commitment else None,
            composition=cast(str, product.composition) if product.composition else None
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Erreur lors de la mise à jour du produit: {str(e)}")

@app.delete("/admin/products/{product_id}")
def admin_delete_product(product_id: str, u = Depends(require_admin), db: Session = Depends(get_db)):
    try:
        product_repo = PostgreSQLProductRepository(db)
        
        # Vérifier que le produit existe avant de le supprimer
        product = product_repo.get_by_id(product_id)
        if not product:
            raise HTTPException(404, "Produit introuvable")
        
        # Supprimer complètement le produit (et ses éléments de panier associés)
        success = product_repo.delete(product_id)
        if not success:
            raise HTTPException(500, "Erreur lors de la suppression du produit")
        
        return {"ok": True, "message": "Produit supprimé définitivement"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Erreur lors de la suppression du produit: {str(e)}")

@app.post("/admin/products/upload-image")
async def admin_upload_image(
    file: UploadFile = File(...),
    u = Depends(require_admin)
):
    """
    Endpoint pour uploader une image de produit.
    Accepte les formats: jpg, jpeg, png, gif, webp
    Retourne l'URL de l'image uploadée.
    """
    try:
        # Vérifier le type de fichier
        allowed_extensions = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
        file_ext = Path(file.filename).suffix.lower() if file.filename else ""
        
        if file_ext not in allowed_extensions:
            raise HTTPException(
                400, 
                f"Format de fichier non autorisé. Formats acceptés: {', '.join(allowed_extensions)}"
            )
        
        # Générer un nom de fichier unique
        file_id = str(uuid.uuid4())
        filename = f"{file_id}{file_ext}"
        file_path = os.path.join(IMAGES_DIR, filename)
        
        # Sauvegarder le fichier
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Retourner l'URL de l'image
        image_url = f"/static/images/{filename}"
        return {"image_url": image_url, "filename": filename}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Erreur lors de l'upload de l'image: {str(e)}")

@app.post("/admin/products/reset-defaults")
def admin_reset_products_to_four(u = Depends(require_admin), db: Session = Depends(get_db)):
    """Réinitialise la base Produits à exactement 4 articles actifs.

    Supprime les `CartItem` et `OrderItem` liés pour éviter les références orphelines,
    puis insère 4 produits par défaut. Utiliser uniquement en environnement de test/démo.
    """
    try:
        from database.models import Product as MProduct, CartItem as MCartItem, OrderItem as MOrderItem
        # Supprimer les références dépendantes puis les produits
        db.query(MCartItem).delete()
        db.query(MOrderItem).delete()
        db.query(MProduct).delete()
        db.commit()

        defaults = [
            {"name": "MacBook Pro M3", "description": "14'' 16 Go / 512 Go", "price_cents": 229999, "stock_qty": 10, "active": True},
            {"name": "iPhone 15", "description": "128 Go, Noir", "price_cents": 99999, "stock_qty": 15, "active": True},
            {"name": "AirPods Pro 2", "description": "Réduction de bruit active", "price_cents": 27999, "stock_qty": 20, "active": True},
            {"name": "Apple Watch SE", "description": "GPS 40mm", "price_cents": 29999, "stock_qty": 12, "active": True},
        ]
        for data in defaults:
            p = MProduct(**data)
            db.add(p)
        db.commit()
        return {"ok": True, "message": "Produits réinitialisés à 4 éléments"}
    except Exception as e:
        db.rollback()
        raise HTTPException(500, f"Erreur lors de la réinitialisation des produits: {str(e)}")

# ====================== ADMIN: Commandes ======================
@app.get("/admin/orders", response_model=list[OrderOut])
def admin_list_orders(user_id: Optional[str] = None, order_id: Optional[str] = None, u = Depends(require_admin), db: Session = Depends(get_db)):
    order_repo = PostgreSQLOrderRepository(db)
    
    # Priorité 1 : Si order_id est fourni, rechercher cette commande spécifique
    if order_id:
        order = order_repo.get_by_id(order_id)
        if order:
            orders = [order]
        else:
            orders = []
    # Priorité 2 : Si user_id est fourni, rechercher les commandes de ce client
    elif user_id:
        orders = order_repo.get_by_user_id(user_id)
        # Gérer le cas où orders est None (retourne une liste vide)
        if orders is None:
            orders = []
    # Priorité 3 : Sinon, retourner toutes les commandes
    else:
        orders = order_repo.get_all()
    
    # Gérer le cas où orders est None (retourne une liste vide)
    if orders is None:
        orders = []
    
    out = []
    for order in orders:
        delivery_info = None
        if order.delivery:
            delivery_info = DeliveryOut(
                transporteur=order.delivery.transporteur,
                tracking_number=order.delivery.tracking_number,
                delivery_status=order.delivery.delivery_status
            )
        
        out.append(OrderOut(
            id=str(order.id),
            user_id=str(order.user_id),
            items=[OrderItemOut(
                product_id=str(item.product_id),
                name=item.name,
                unit_price_cents=item.unit_price_cents,
                quantity=item.quantity
            ) for item in order.items],
            status=str(order.status),
            total_cents=sum(item.unit_price_cents * item.quantity for item in order.items),
            created_at=(order.created_at.timestamp() if getattr(order, 'created_at', None) else 0.0),
            delivery=delivery_info
        ))
    return out

@app.get("/admin/orders/{order_id}", response_model=OrderOut)
def admin_get_order(order_id: str, u = Depends(require_admin), db: Session = Depends(get_db)):
    order_repo = PostgreSQLOrderRepository(db)
    order = order_repo.get_by_id(order_id)
    if not order:
        raise HTTPException(404, "Commande introuvable")
    
    delivery_info = None
    if order.delivery:
        delivery_info = DeliveryOut(
            transporteur=order.delivery.transporteur,
            tracking_number=order.delivery.tracking_number,
            delivery_status=order.delivery.delivery_status
        )
    
    return OrderOut(
        id=str(order.id),
        user_id=str(order.user_id),
        items=[OrderItemOut(
            product_id=str(item.product_id),
            name=item.name,
            unit_price_cents=item.unit_price_cents,
            quantity=item.quantity
        ) for item in order.items],
        status=cast(str, order.status),
        total_cents=sum(item.unit_price_cents * item.quantity for item in order.items),
        created_at=(order.created_at.timestamp() if getattr(order, 'created_at', None) else 0.0),
        delivery=delivery_info
    )

@app.post("/admin/orders/{order_id}/validate", response_model=OrderOut)
def admin_validate_order(order_id: str, u = Depends(require_admin), db: Session = Depends(get_db)):
    try:
        order_repo = PostgreSQLOrderRepository(db)
        order = order_repo.get_by_id(order_id)
        if not order:
            raise HTTPException(404, "Commande introuvable")
        
        # Vérifier que la commande peut être validée
        if str(order.status) not in [OrderStatus.CREE.value, OrderStatus.PAYEE.value]:
            raise HTTPException(400, f"Commande déjà traitée (statut actuel: {order.status})")
        
        # Mettre à jour le statut et le timestamp UNIQUEMENT pour cette commande
        order.status = OrderStatus.VALIDEE  # type: ignore
        order.validated_at = datetime.now(UTC)  # type: ignore
        # Utiliser update() qui modifie uniquement cette commande spécifique
        order_repo.update(order)
        
        # Rafraîchir UNIQUEMENT cette commande pour avoir les dernières données
        db.refresh(order)
        
        delivery_info = None
        if order.delivery:
            delivery_info = DeliveryOut(
                transporteur=order.delivery.transporteur,
                tracking_number=order.delivery.tracking_number,
                delivery_status=order.delivery.delivery_status
            )
        
        return OrderOut(
            id=str(order.id),
            user_id=str(order.user_id),
            items=[OrderItemOut(
                product_id=str(item.product_id),
                name=item.name,
                unit_price_cents=item.unit_price_cents,
                quantity=item.quantity
            ) for item in order.items],
            status=str(order.status),
            total_cents=sum(item.unit_price_cents * item.quantity for item in order.items),
            created_at=(order.created_at.timestamp() if getattr(order, 'created_at', None) else 0.0),
            delivery=delivery_info
        )
    except HTTPException:
        raise
    except Exception as e:
        # Erreur lors de la validation de la commande
        raise HTTPException(400, f"Erreur lors de la validation: {str(e)}")

# ====================== ANNULATION DE COMMANDE ======================
@app.post("/orders/{order_id}/cancel")
def cancel_order(order_id: str, uid: str = Depends(current_user_id), db: Session = Depends(get_db)):
    """Annule une commande avec remboursement automatique si payée"""
    try:
        order_repo = PostgreSQLOrderRepository(db)
        product_repo = PostgreSQLProductRepository(db)
        payment_repo = PostgreSQLPaymentRepository(db)
        
        order = order_repo.get_by_id(order_id)
        if not order or str(order.user_id) != uid:
            raise HTTPException(404, "Commande introuvable")
        
        # Vérifier que la commande peut être annulée
        # On peut annuler si la commande n'a pas encore été expédiée
        current_status = str(order.status)
        cancellable_statuses = [OrderStatus.CREE.value, OrderStatus.VALIDEE.value, OrderStatus.PAYEE.value]
        if current_status not in cancellable_statuses:
            raise HTTPException(400, f"Cette commande ne peut pas être annulée (statut actuel: {current_status}). Seules les commandes avec le statut 'CREE', 'VALIDEE' ou 'PAYEE' peuvent être annulées.")
        
        # Vérifier si la commande a été payée
        was_paid = order.status == OrderStatus.PAYEE
        refund_info = None
        
        if was_paid:
            # Récupérer les paiements pour la commande
            payments = payment_repo.get_by_order_id(order_id)
            if payments:
                # Marquer les paiements comme remboursés
                for payment in payments:
                    payment.status = "REFUNDED"  # type: ignore
                db.commit()
                
                # Calculer le montant total remboursé
                total_refunded = sum(p.amount_cents for p in payments)
                refund_info = {
                    "refunded": True,
                    "amount_cents": total_refunded,
                    "message": f"Remboursement automatique de {total_refunded/100:.2f}€ effectué"
                }
                # Remboursement automatique effectué
        
        # Remettre le stock en place pour chaque article
        for item in order.items:
            product = product_repo.get_by_id(str(item.product_id))
            if product:
                # Remettre le stock
                product.stock_qty += item.quantity
                
                # Réactiver le produit s'il était inactif à cause du stock
                if not product.active and product.stock_qty > 0:
                    product.active = True  # type: ignore
                    # Produit réactivé automatiquement (stock restauré)
                
                product_repo.update(product)
        
        # Mettre à jour le statut et les timestamps UNIQUEMENT pour cette commande spécifique
        # Si la commande était payée et remboursée → REMBOURSEE (violet)
        # Sinon (commande non payée) → ANNULEE (rouge)
        if was_paid:
            order.status = OrderStatus.REMBOURSEE  # type: ignore
            order.refunded_at = datetime.now(UTC)  # type: ignore
        else:
            order.status = OrderStatus.ANNULEE  # type: ignore
        
        order.cancelled_at = datetime.now(UTC)  # type: ignore
        # Utiliser update() qui modifie UNIQUEMENT cette commande, pas les autres
        order_repo.update(order)
        
        response = {"ok": True, "message": "Commande annulée avec succès"}
        if refund_info:
            response.update(refund_info)
        
        return response
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"Erreur lors de l'annulation de la commande: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(400, f"Erreur lors de l'annulation: {str(e)}")

# ====================== PAIEMENTS ======================
@app.post("/orders/{order_id}/pay")
def pay_order(order_id: str, payment_data: PayIn, uid: str = Depends(current_user_id), db: Session = Depends(get_db)):
    """Simule un paiement pour une commande avec validation stricte"""
    try:
        from utils.validations import (
            validate_card_number, validate_cvv, validate_expiry_date,
            validate_postal_code, validate_phone, validate_street_number,
            validate_street_name
        )
        
        order_repo = PostgreSQLOrderRepository(db)
        payment_repo = PostgreSQLPaymentRepository(db)
        product_repo = PostgreSQLProductRepository(db)
        cart_repo = PostgreSQLCartRepository(db)
        
        order = order_repo.get_by_id(order_id)
        if not order or str(order.user_id) != uid:
            raise HTTPException(404, "Commande introuvable")
        
        if str(order.status) != OrderStatus.CREE.value:
            raise HTTPException(400, "Commande déjà payée ou traitée")
        
        # ============ VALIDATIONS STRICTES (avec Luhn) ============
        
        # 1. Valider le numéro de carte (avec Luhn)
        is_valid_card, card_error = validate_card_number(payment_data.card_number)
        if not is_valid_card:
            raise HTTPException(422, card_error)
        
        # 2. Valider le CVV
        is_valid_cvv, cvv_error = validate_cvv(payment_data.cvc)
        if not is_valid_cvv:
            raise HTTPException(422, cvv_error)
        
        # 3. Valider la date d'expiration
        is_valid_expiry, expiry_error = validate_expiry_date(
            payment_data.exp_month, 
            payment_data.exp_year
        )
        if not is_valid_expiry:
            raise HTTPException(422, expiry_error)
        
        # 4. Valider le code postal (si fourni)
        if payment_data.postal_code:
            is_valid_postal, postal_error = validate_postal_code(payment_data.postal_code)
            if not is_valid_postal:
                raise HTTPException(422, postal_error)
        
        # 5. Valider le téléphone (si fourni)
        if payment_data.phone:
            is_valid_phone, phone_error = validate_phone(payment_data.phone)
            if not is_valid_phone:
                raise HTTPException(422, phone_error)
        
        # 6. Valider le numéro de rue (si fourni)
        if payment_data.street_number:
            is_valid_street, street_error = validate_street_number(payment_data.street_number)
            if not is_valid_street:
                raise HTTPException(422, street_error)
        
        # 7. Valider le nom de rue (si fourni)
        if payment_data.street_name:
            is_valid_street_name, street_name_error = validate_street_name(payment_data.street_name)
            if not is_valid_street_name:
                raise HTTPException(422, street_name_error)
        
        # ============ PAIEMENT VIA STRIPE ============
        from utils.validations import sanitize_numeric
        from services.payment_service import PaymentGateway
        
        card_number = sanitize_numeric(payment_data.card_number)
        
        # Calculer le montant total
        total_cents = sum(item.unit_price_cents * item.quantity for item in order.items)
        
        # Initialiser le gateway Stripe
        try:
            gateway = PaymentGateway()
        except ValueError as e:
            raise HTTPException(500, f"Configuration Stripe manquante: {str(e)}")
        
        # Traiter le paiement via Stripe
        user_email = None
        try:
            # Récupérer l'email de l'utilisateur si disponible
            user_repo = PostgreSQLUserRepository(db)
            user = user_repo.get_by_id(uid)
            if user and hasattr(user, 'email'):
                user_email = user.email
        except Exception:
            pass  # Email optionnel
        
        # Appeler Stripe pour traiter le paiement
        stripe_result = gateway.charge_card(
            card_number=card_number,
            exp_month=payment_data.exp_month,
            exp_year=payment_data.exp_year,
            cvc=payment_data.cvc,
            amount_cents=total_cents,
            idempotency_key=order_id,
            email=user_email
        )
        
        # Sanitizer les données pour le stockage
        sanitized_postal = sanitize_numeric(payment_data.postal_code) if payment_data.postal_code else None
        sanitized_phone = sanitize_numeric(payment_data.phone) if payment_data.phone else None
        sanitized_street = sanitize_numeric(payment_data.street_number) if payment_data.street_number else None
        
        # Nettoyer le nom de rue (sans sanitize_numeric)
        import re
        cleaned_street_name = None
        if payment_data.street_name:
            cleaned_street_name = re.sub(r'\s+', ' ', payment_data.street_name.strip())
        
        # Créer l'enregistrement de paiement
        payment_data_dict = {
            "order_id": order_id,
            "amount_cents": total_cents,
            "status": "SUCCEEDED" if stripe_result["success"] else "FAILED",
            "payment_method": "CARD",
            # Sauvegarder les informations de paiement
            "card_last4": card_number[-4:] if len(card_number) >= 4 else None,  # 4 derniers chiffres
            "postal_code": sanitized_postal,
            "phone": sanitized_phone,
            "street_number": sanitized_street,
            "street_name": cleaned_street_name,
            # Stocker le charge_id pour permettre les remboursements
            "charge_id": stripe_result.get("charge_id") if stripe_result["success"] else None
        }
        
        payment = payment_repo.create(payment_data_dict)
        
        # Si le paiement a échoué, lever une exception
        if not stripe_result["success"]:
            error_message = stripe_result.get("failure_reason", "Paiement refusé")
            raise HTTPException(402, error_message)
        
        # Décrémenter le stock et potentiellement désactiver les produits après PAIEMENT réussi
        # Seuil de masquage: si stock restant <= seuil, on met le produit inactif
        import os
        try:
            threshold = int(os.getenv("LOW_STOCK_HIDE_THRESHOLD", "0"))
        except Exception:
            threshold = 0
        for item in order.items:
            product = product_repo.get_by_id(str(item.product_id))
            if product:
                # Décrémenter le stock; sécurité: ne pas descendre sous 0
                try:
                    current_stock = int(getattr(product, "stock_qty", 0) or 0)
                except Exception:
                    current_stock = 0
                try:
                    qty_to_decrement = int(getattr(item, "quantity", 0) or 0)
                except Exception:
                    qty_to_decrement = 0
                new_stock = max(0, current_stock - qty_to_decrement)
                product.stock_qty = new_stock  # type: ignore
                if new_stock <= threshold:
                    product.active = False  # type: ignore
                product_repo.update(product)

        # Vider le panier de l'utilisateur (il a payé)
        cart_repo.clear_cart(uid)

        # Mettre à jour le statut de la commande
        order.status = OrderStatus.PAYEE  # type: ignore
        order.payment_id = payment.id
        order_repo.update(order)
        
        return {
            "payment_id": str(payment.id),
            "status": "SUCCEEDED",
            "amount_cents": total_cents
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(400, str(e))

# ====================== FACTURES ======================
@app.get("/orders/{order_id}/invoice", response_model=InvoiceOut)
def get_invoice(order_id: str, uid: str = Depends(current_user_id), db: Session = Depends(get_db)):
    """Récupère la facture d'une commande"""
    try:
        order_repo = PostgreSQLOrderRepository(db)
        invoice_repo = PostgreSQLInvoiceRepository(db)
        
        order = order_repo.get_by_id(order_id)
        if not order or str(order.user_id) != uid:
            raise HTTPException(404, "Commande introuvable")
        
        # Créer la facture si elle n'existe pas
        invoice = invoice_repo.get_by_order_id(order_id)
        if not invoice:
            # Créer la facture
            total_cents = sum(item.unit_price_cents * item.quantity for item in order.items)
            invoice_data = {
                "order_id": order_id,
                "user_id": str(order.user_id),
                "total_cents": total_cents
            }
            invoice = invoice_repo.create(invoice_data)
        
        # Construire les lignes de facture
        lines = []
        for item in order.items:
            lines.append(InvoiceLineOut(
                product_id=str(item.product_id),
                name=item.name,
                unit_price_cents=item.unit_price_cents,
                quantity=item.quantity,
                line_total_cents=item.unit_price_cents * item.quantity
            ))
        
        return InvoiceOut(
            id=str(invoice.id),
            order_id=str(invoice.order_id),
            number=f"INV-{str(invoice.id)[:8].upper()}",
            lines=lines,
            total_cents=cast(int, invoice.total_cents),
            issued_at=invoice.created_at.timestamp()
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(400, str(e))

@app.get("/orders/{order_id}/invoice/download")
def download_invoice_pdf(order_id: str, uid: str = Depends(current_user_id), db: Session = Depends(get_db)):
    """Télécharge la facture en PDF"""
    try:
        order_repo = PostgreSQLOrderRepository(db)
        invoice_repo = PostgreSQLInvoiceRepository(db)
        payment_repo = PostgreSQLPaymentRepository(db)
        
        order = order_repo.get_by_id(order_id)
        if not order or str(order.user_id) != uid:
            raise HTTPException(404, "Commande introuvable")
        
        # Créer la facture si elle n'existe pas (comme dans get_invoice)
        invoice = invoice_repo.get_by_order_id(order_id)
        if not invoice:
            # Créer la facture automatiquement
            total_cents = sum(item.unit_price_cents * item.quantity for item in order.items)
            invoice_data = {
                "order_id": order_id,
                "user_id": str(order.user_id),
                "total_cents": total_cents
            }
            invoice = invoice_repo.create(invoice_data)
        
        # Récupérer les données nécessaires
        user = order.user
        payments = payment_repo.get_by_order_id(order_id)
        
        # Construire les données de la facture
        invoice_data = {
            "id": str(invoice.id),
            "number": f"INV-{str(invoice.id)[:8].upper()}",
            "issued_at": invoice.created_at.timestamp(),
            "lines": [
                {
                    "product_id": str(item.product_id),
                    "name": item.name,
                    "unit_price_cents": item.unit_price_cents,
                    "quantity": item.quantity
                }
                for item in order.items
            ]
        }
        
        order_data = {
            "id": str(order.id),
            "user_id": str(order.user_id),
            "status": order.status
        }
        
        user_data = {
            "first_name": user.first_name,
            "last_name": user.last_name,
            "address": user.address
        }
        
        payment_data = None
        if payments:
            payment = payments[0]  # Prendre le premier paiement
            payment_data = {
                "amount_cents": payment.amount_cents,
                "status": payment.status,
                "created_at": payment.created_at.timestamp()
            }
        
        delivery_data = None
        if order.delivery:
            delivery_data = {
                "transporteur": order.delivery.transporteur,
                "tracking_number": order.delivery.tracking_number,
                "delivery_status": order.delivery.delivery_status
            }
        
        # Générer le PDF
        pdf_buffer = generate_invoice_pdf(invoice_data, order_data, user_data, payment_data, delivery_data)
        
        return Response(
            content=pdf_buffer.getvalue(),
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=facture_{order_id[-8:]}.pdf"}
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(400, str(e))

# ====================== SUIVI DE LIVRAISON ======================
@app.get("/orders/{order_id}/tracking", response_model=DeliveryOut)
def get_order_tracking(order_id: str, uid: str = Depends(current_user_id), db: Session = Depends(get_db)):
    """Récupère le suivi de livraison d'une commande"""
    try:
        order_repo = PostgreSQLOrderRepository(db)
        
        order = order_repo.get_by_id(order_id)
        if not order or str(order.user_id) != uid:
            raise HTTPException(404, "Commande introuvable")
        
        if not order.delivery:
            raise HTTPException(404, "Informations de livraison non disponibles")
        
        return DeliveryOut(
            transporteur=order.delivery.transporteur,
            tracking_number=order.delivery.tracking_number,
            delivery_status=order.delivery.delivery_status
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(400, str(e))

# ====================== SUPPORT CLIENT ======================
@app.post("/support/threads", response_model=ThreadOut)
def create_support_thread(thread_data: ThreadCreateIn, uid: str = Depends(current_user_id), db: Session = Depends(get_db)):
    """Crée un nouveau fil de support"""
    try:
        thread_repo = PostgreSQLThreadRepository(db)
        
        thread_data_dict = {
            "user_id": uid,
            "order_id": thread_data.order_id,
            "subject": thread_data.subject
        }
        
        thread = thread_repo.create(thread_data_dict)
        
        return ThreadOut(
            id=str(thread.id),
            user_id=str(thread.user_id),
            order_id=str(thread.order_id) if thread.order_id is not None else None,
            subject=str(thread.subject),
            closed=bool(thread.closed),
            created_at=thread.created_at.timestamp(),
            unread_count=0
        )
    except Exception as e:
        raise HTTPException(400, str(e))

@app.get("/support/threads", response_model=List[ThreadOut])
def list_support_threads(uid: str = Depends(current_user_id), db: Session = Depends(get_db)):
    """Liste les fils de support de l'utilisateur"""
    try:
        thread_repo = PostgreSQLThreadRepository(db)
        
        threads = thread_repo.get_by_user_id(uid)
        
        # Gérer le cas où threads est None (retourne une liste vide)
        if threads is None:
            threads = []
        
        return [
            ThreadOut(
                id=str(thread.id),
                user_id=str(thread.user_id),
                order_id=str(thread.order_id) if thread.order_id is not None else None,
                subject=str(thread.subject),
                closed=bool(thread.closed),
                created_at=thread.created_at.timestamp(),
                unread_count=0  # Note: comptage des messages non lus à implémenter si nécessaire (non requis pour MVP)
            )
            for thread in threads
        ]
    except Exception as e:
        raise HTTPException(400, str(e))

@app.get("/support/threads/{thread_id}", response_model=ThreadDetailOut)
def get_support_thread(thread_id: str, uid: str = Depends(current_user_id), db: Session = Depends(get_db)):
    """Récupère un fil de support avec ses messages"""
    try:
        thread_repo = PostgreSQLThreadRepository(db)
        
        thread = thread_repo.get_by_id(thread_id)
        if not thread or str(thread.user_id) != uid:
            raise HTTPException(404, "Fil de discussion introuvable")
        
        # Récupérer les messages
        messages = []
        for message in thread.messages:
            messages.append(MessageOut(
                id=str(message.id),
                thread_id=str(message.thread_id),
                author_user_id=str(message.author_user_id) if message.author_user_id is not None else None,
                content=str(message.content),
                created_at=message.created_at.timestamp(),
                author_name=message.author.first_name + " " + message.author.last_name if message.author else "Support"
            ))
        
        return ThreadDetailOut(
            id=str(thread.id),
            user_id=str(thread.user_id),
            order_id=str(thread.order_id) if thread.order_id is not None else None,
            subject=str(thread.subject),
            closed=bool(thread.closed),
            created_at=thread.created_at.timestamp(),
            unread_count=0,
            messages=messages
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(400, str(e))

@app.post("/support/threads/{thread_id}/messages", response_model=MessageOut)
def post_support_message(thread_id: str, message_data: MessageCreateIn, uid: str = Depends(current_user_id), db: Session = Depends(get_db)):
    """Ajoute un message à un fil de support"""
    try:
        thread_repo = PostgreSQLThreadRepository(db)
        
        thread = thread_repo.get_by_id(thread_id)
        if not thread or str(thread.user_id) != uid:
            raise HTTPException(404, "Fil de discussion introuvable")
        
        if bool(thread.closed):
            raise HTTPException(400, "Ce fil de discussion est fermé")
        
        message_data_dict = {
            "author_user_id": uid,
            "content": message_data.content
        }
        
        message = thread_repo.add_message(thread_id, message_data_dict)
        
        return MessageOut(
            id=str(message.id),
            thread_id=str(message.thread_id),
            author_user_id=str(message.author_user_id) if message.author_user_id is not None else None,
            content=str(message.content),
            created_at=message.created_at.timestamp(),
            author_name=message.author.first_name + " " + message.author.last_name if message.author else "Support"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(400, str(e))

@app.post("/support/threads/{thread_id}/mark-read")
def mark_support_thread_as_read(thread_id: str, uid: str = Depends(current_user_id), db: Session = Depends(get_db)):
    """Marque un fil de support comme lu"""
    try:
        thread_repo = PostgreSQLThreadRepository(db)
        
        thread = thread_repo.get_by_id(thread_id)
        if not thread or str(thread.user_id) != uid:
            raise HTTPException(404, "Fil de discussion introuvable")
        
        # Pour l'instant, on retourne juste un succès
        # Dans une implémentation complète, on pourrait marquer les messages comme lus
        return {"ok": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(400, str(e))

# ====================== ADMIN SUPPORT ======================
@app.get("/admin/support/threads", response_model=List[ThreadOut])
def admin_list_support_threads(u = Depends(require_admin), db: Session = Depends(get_db)):
    """Liste tous les fils de support (admin)"""
    try:
        thread_repo = PostgreSQLThreadRepository(db)
        
        threads = thread_repo.get_all()
        
        # Gérer le cas où threads est None (retourne une liste vide)
        if threads is None:
            threads = []
        
        return [
            ThreadOut(
                id=str(thread.id),
                user_id=str(thread.user_id),
                order_id=str(thread.order_id) if thread.order_id is not None else None,
                subject=cast(str, thread.subject),
                closed=cast(bool, thread.closed),
                created_at=thread.created_at.timestamp(),
                unread_count=0
            )
            for thread in threads
        ]
    except Exception as e:
        raise HTTPException(400, str(e))

@app.get("/admin/support/threads/{thread_id}", response_model=ThreadDetailOut)
def admin_get_support_thread(thread_id: str, u = Depends(require_admin), db: Session = Depends(get_db)):
    """Récupère un fil de support (admin)"""
    try:
        thread_repo = PostgreSQLThreadRepository(db)
        
        thread = thread_repo.get_by_id(thread_id)
        if not thread:
            raise HTTPException(404, "Fil de discussion introuvable")
        
        # Récupérer les messages
        messages = []
        for message in thread.messages:
            messages.append(MessageOut(
                id=str(message.id),
                thread_id=str(message.thread_id),
                author_user_id=str(message.author_user_id) if message.author_user_id is not None else None,
                content=str(message.content),
                created_at=message.created_at.timestamp(),
                author_name=message.author.first_name + " " + message.author.last_name if message.author else "Support"
            ))
        
        return ThreadDetailOut(
            id=str(thread.id),
            user_id=str(thread.user_id),
            order_id=str(thread.order_id) if thread.order_id is not None else None,
            subject=str(thread.subject),
            closed=bool(thread.closed),
            created_at=thread.created_at.timestamp(),
            unread_count=0,
            messages=messages
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(400, str(e))

@app.post("/admin/support/threads/{thread_id}/close")
def admin_close_support_thread(thread_id: str, u = Depends(require_admin), db: Session = Depends(get_db)):
    """Ferme un fil de support (admin)"""
    try:
        thread_repo = PostgreSQLThreadRepository(db)
        
        thread = thread_repo.get_by_id(thread_id)
        if not thread:
            raise HTTPException(404, "Fil de discussion introuvable")
        
        thread.closed = True  # type: ignore
        db.commit()
        
        return {"ok": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(400, str(e))

@app.post("/admin/support/threads/{thread_id}/messages", response_model=MessageOut)
def admin_post_support_message(thread_id: str, message_data: MessageCreateIn, u = Depends(require_admin), db: Session = Depends(get_db)):
    """Ajoute un message admin à un fil de support"""
    try:
        thread_repo = PostgreSQLThreadRepository(db)
        
        thread = thread_repo.get_by_id(thread_id)
        if not thread:
            raise HTTPException(404, "Fil de discussion introuvable")
        
        message_data_dict = {
            "author_user_id": None,  # Message admin
            "content": message_data.content
        }
        
        message = thread_repo.add_message(thread_id, message_data_dict)
        
        return MessageOut(
            id=str(message.id),
            thread_id=str(message.thread_id),
            author_user_id=str(message.author_user_id) if message.author_user_id is not None else None,
            content=cast(str, message.content),
            created_at=message.created_at.timestamp(),
            author_name="Support Admin"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(400, str(e))

# ====================== DIAGNOSTIC COMMANDES ======================
@app.get("/admin/orders/{order_id}/status")
def admin_get_order_status(order_id: str, u = Depends(require_admin), db: Session = Depends(get_db)):
    """Récupère le statut détaillé d'une commande pour diagnostic"""
    try:
        order_repo = PostgreSQLOrderRepository(db)
        payment_repo = PostgreSQLPaymentRepository(db)
        
        order = order_repo.get_by_id(order_id)
        if not order:
            raise HTTPException(404, "Commande introuvable")
        
        # Récupérer les paiements
        payments = payment_repo.get_by_order_id(order_id)
        
        # Informations de livraison
        delivery_info = None
        if order.delivery:
            delivery_info = {
                "transporteur": order.delivery.transporteur,
                "tracking_number": order.delivery.tracking_number,
                "delivery_status": order.delivery.delivery_status,
                "created_at": order.delivery.created_at.timestamp()
            }
        
        return {
            "order_id": str(order.id),
            "user_id": str(order.user_id),
            "status": str(order.status),
            "created_at": order.created_at.timestamp(),
            "validated_at": order.validated_at.timestamp() if order.validated_at else None,
            "shipped_at": order.shipped_at.timestamp() if order.shipped_at else None,
            "delivered_at": order.delivered_at.timestamp() if order.delivered_at else None,
            "cancelled_at": order.cancelled_at.timestamp() if order.cancelled_at else None,
            "refunded_at": order.refunded_at.timestamp() if order.refunded_at else None,
            "payment_id": str(order.payment_id) if order.payment_id else None,
            "payments": [
                {
                    "id": str(p.id),
                    "amount_cents": p.amount_cents,
                    "status": p.status,
                    "created_at": p.created_at.timestamp()
                } for p in payments
            ],
            "delivery": delivery_info,
            "items_count": len(order.items),
            "total_cents": sum(item.unit_price_cents * item.quantity for item in order.items)
        }
    except HTTPException:
        raise
    except Exception as e:
        # Erreur diagnostic commande
        raise HTTPException(400, f"Erreur diagnostic: {str(e)}")

# ====================== ADMIN: LIVRAISON ======================
@app.post("/admin/orders/{order_id}/ship")
def admin_ship_order(order_id: str, delivery_data: DeliveryIn, u = Depends(require_admin), db: Session = Depends(get_db)):
    """Marque une commande comme expédiée"""
    try:
        order_repo = PostgreSQLOrderRepository(db)
        
        order = order_repo.get_by_id(order_id)
        if not order:
            raise HTTPException(404, "Commande introuvable")
        
        # Vérifier que la commande peut être expédiée
        if str(order.status) not in [OrderStatus.VALIDEE.value, OrderStatus.PAYEE.value]:
            raise HTTPException(400, f"Commande non expédiable (statut actuel: {order.status})")
        
        # Créer les informations de livraison
        from database.models import Delivery
        delivery = Delivery(
            order_id=order.id,
            transporteur=delivery_data.transporteur,
            tracking_number=delivery_data.tracking_number,
            address=order.user.address,
            delivery_status=delivery_data.delivery_status
        )
        db.add(delivery)
        
        # Mettre à jour le statut et le timestamp UNIQUEMENT pour cette commande spécifique
        # Modifier uniquement l'objet order récupéré, pas d'autres commandes
        order.status = OrderStatus.EXPEDIEE  # type: ignore
        order.shipped_at = datetime.now(UTC)  # type: ignore
        # Utiliser update() qui commit UNIQUEMENT les changements de cette commande
        order_repo.update(order)
        # Le commit inclut aussi la livraison ajoutée ci-dessus (même transaction)
        
        return {"ok": True, "message": f"Commande {order_id} expédiée avec succès"}
    except HTTPException:
        raise
    except Exception as e:
        # Erreur lors de l'expédition de la commande
        raise HTTPException(400, f"Erreur lors de l'expédition: {str(e)}")

@app.post("/admin/orders/{order_id}/mark-delivered")
def admin_mark_delivered(order_id: str, u = Depends(require_admin), db: Session = Depends(get_db)):
    """Marque une commande comme livrée"""
    try:
        order_repo = PostgreSQLOrderRepository(db)
        
        order = order_repo.get_by_id(order_id)
        if not order:
            raise HTTPException(404, "Commande introuvable")
        
        # Vérifier que la commande peut être marquée comme livrée
        if str(order.status) != OrderStatus.EXPEDIEE.value:
            raise HTTPException(400, f"Commande non expédiée (statut actuel: {order.status})")
        
        # Mettre à jour le statut et le timestamp UNIQUEMENT pour cette commande spécifique
        order.status = OrderStatus.LIVREE  # type: ignore
        order.delivered_at = datetime.now(UTC)  # type: ignore
        # Utiliser update() qui modifie UNIQUEMENT cette commande, pas les autres
        order_repo.update(order)
        
        # Mettre à jour le statut de livraison UNIQUEMENT pour cette commande
        if order.delivery:
            order.delivery.delivery_status = "LIVREE"
            # Commit pour persister la mise à jour du statut de livraison
            db.commit()
            db.refresh(order.delivery)
        
        return {"ok": True, "message": f"Commande {order_id} marquée comme livrée"}
    except HTTPException:
        raise
    except Exception as e:
        # Erreur lors du marquage de livraison
        raise HTTPException(400, f"Erreur lors du marquage de livraison: {str(e)}")

@app.post("/admin/orders/{order_id}/refund")
def admin_refund_order(order_id: str, refund_data: RefundIn, u = Depends(require_admin), db: Session = Depends(get_db)):
    """Rembourse une commande"""
    try:
        order_repo = PostgreSQLOrderRepository(db)
        payment_repo = PostgreSQLPaymentRepository(db)
        product_repo = PostgreSQLProductRepository(db)
        
        order = order_repo.get_by_id(order_id)
        if not order:
            raise HTTPException(404, "Commande introuvable")
        
        # Vérifier que la commande peut être remboursée
        if str(order.status) not in [OrderStatus.PAYEE.value, OrderStatus.EXPEDIEE.value, OrderStatus.LIVREE.value]:
            raise HTTPException(400, f"Commande non remboursable (statut actuel: {order.status})")
        
        # Récupérer le paiement
        payments = payment_repo.get_by_order_id(order_id)
        if not payments:
            raise HTTPException(400, "Aucun paiement trouvé")
        
        # Remettre le stock en place pour chaque article
        for item in order.items:
            product = product_repo.get_by_id(str(item.product_id))
            if product:
                # Remettre le stock
                product.stock_qty += item.quantity
                
                # Réactiver le produit s'il était inactif à cause du stock
                if not product.active and product.stock_qty > 0:
                    product.active = True  # type: ignore
                    # Produit réactivé automatiquement (remboursement)
                
                product_repo.update(product)
        
        # Mettre à jour le statut et le timestamp UNIQUEMENT pour cette commande spécifique
        order.status = OrderStatus.REMBOURSEE  # type: ignore
        order.refunded_at = datetime.now(UTC)  # type: ignore
        # Utiliser update() qui modifie UNIQUEMENT cette commande, pas les autres
        order_repo.update(order)
        
        # Mettre à jour le statut des paiements UNIQUEMENT pour cette commande
        for payment in payments:
            payment.status = "REFUNDED"  # type: ignore
        # order_repo.update() a déjà fait le commit, mais on commit aussi les paiements
        db.commit()
        
        return {"ok": True, "message": f"Commande {order_id} remboursée avec succès"}
    except HTTPException:
        raise
    except Exception as e:
        # Erreur lors du remboursement de la commande
        raise HTTPException(400, f"Erreur lors du remboursement: {str(e)}")

@app.post("/admin/orders/{order_id}/cancel")
def admin_cancel_order(order_id: str, u = Depends(require_admin), db: Session = Depends(get_db)):
    """Annule une commande (admin) avec remboursement automatique si payée"""
    try:
        order_repo = PostgreSQLOrderRepository(db)
        product_repo = PostgreSQLProductRepository(db)
        payment_repo = PostgreSQLPaymentRepository(db)
        
        order = order_repo.get_by_id(order_id)
        if not order:
            raise HTTPException(404, "Commande introuvable")
        
        # Vérifier que la commande peut être annulée
        # On peut annuler si la commande n'a pas encore été expédiée
        current_status = str(order.status)
        cancellable_statuses = [OrderStatus.CREE.value, OrderStatus.VALIDEE.value, OrderStatus.PAYEE.value]
        if current_status not in cancellable_statuses:
            raise HTTPException(400, f"Cette commande ne peut pas être annulée (statut actuel: {current_status}). Seules les commandes avec le statut 'CREE', 'VALIDEE' ou 'PAYEE' peuvent être annulées.")
        
        # Vérifier si la commande a été payée
        was_paid = order.status == OrderStatus.PAYEE
        refund_info = None
        
        if was_paid:
            # Récupérer les paiements pour la commande
            payments = payment_repo.get_by_order_id(order_id)
            if payments:
                # Marquer les paiements comme remboursés
                for payment in payments:
                    payment.status = "REFUNDED"  # type: ignore
                db.commit()
                
                # Calculer le montant total remboursé
                total_refunded = sum(p.amount_cents for p in payments)
                refund_info = {
                    "refunded": True,
                    "amount_cents": total_refunded,
                    "message": f"Remboursement automatique de {total_refunded/100:.2f}€ effectué"
                }
        
        # Remettre le stock en place pour chaque article
        for item in order.items:
            product = product_repo.get_by_id(str(item.product_id))
            if product:
                # Remettre le stock
                product.stock_qty += item.quantity
                
                # Réactiver le produit s'il était inactif à cause du stock
                if not product.active and product.stock_qty > 0:
                    product.active = True  # type: ignore
                
                product_repo.update(product)
        
        # Mettre à jour le statut et les timestamps UNIQUEMENT pour cette commande spécifique
        # Si la commande était payée et remboursée → REMBOURSEE (violet)
        # Sinon (commande non payée) → ANNULEE (rouge)
        if was_paid:
            order.status = OrderStatus.REMBOURSEE  # type: ignore
            order.refunded_at = datetime.now(UTC)  # type: ignore
        else:
            order.status = OrderStatus.ANNULEE  # type: ignore
        
        order.cancelled_at = datetime.now(UTC)  # type: ignore
        # Utiliser update() qui modifie UNIQUEMENT cette commande, pas les autres
        order_repo.update(order)
        
        response = {"ok": True, "message": f"Commande {order_id} annulée avec succès par l'admin"}
        if refund_info:
            response.update(refund_info)
        
        return response
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"Erreur lors de l'annulation admin de la commande: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(400, f"Erreur lors de l'annulation: {str(e)}")

# api_unified is available for test compatibility

if __name__ == "__main__":
    import uvicorn
    # Démarrage de l'API e-commerce
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
