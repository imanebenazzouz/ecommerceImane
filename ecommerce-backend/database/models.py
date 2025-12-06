"""
========================================
MODÈLES DE BASE DE DONNÉES (SQLAlchemy)
========================================

Ce fichier définit la STRUCTURE de TOUTES les tables de la base de données PostgreSQL.
Chaque classe Python = une table dans la base de données.
Chaque attribut (Column) = une colonne dans la table.

SQLAlchemy est un ORM (Object-Relational Mapping) :
- Il transforme automatiquement les objets Python en requêtes SQL
- Vous manipulez des objets Python au lieu d'écrire du SQL brut
- Exemple : user.email au lieu de "SELECT email FROM users WHERE..."

IMPORTANT : Si vous modifiez ce fichier, il faut créer une migration Alembic
pour mettre à jour la base de données.
"""

# ========== IMPORTS ==========
from sqlalchemy import Column, String, Integer, Boolean, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import declarative_base  # Base pour créer des modèles
from sqlalchemy.orm import relationship      # Pour définir les relations entre tables
from sqlalchemy.dialects.postgresql import UUID  # Type UUID pour PostgreSQL
import uuid  # Pour générer des ID uniques
from datetime import datetime, UTC

# Fonction helper pour obtenir l'heure actuelle en UTC (temps universel)
def utcnow():
    return datetime.now(UTC)

# Base est la classe parente de tous nos modèles
Base = declarative_base()

# ========================================
# TABLE USERS - Comptes utilisateurs
# ========================================
class User(Base):
    """
    Table des utilisateurs de l'application (clients et admins).
    
    Cette table stocke TOUS les comptes utilisateurs :
    - Les clients normaux (is_admin = False)
    - Les administrateurs (is_admin = True)
    
    SÉCURITÉ : Le mot de passe n'est JAMAIS stocké en clair !
    On stocke uniquement un "hash" (empreinte cryptographique).
    """
    __tablename__ = "users"  # Nom de la table dans PostgreSQL
    
    # ===== COLONNES =====
    # Clé primaire : identifiant unique de chaque utilisateur
    # UUID = Universal Unique Identifier (ex: 550e8400-e29b-41d4-a716-446655440000)
    # Avantage des UUID : uniques même sur plusieurs serveurs, plus sécurisés que 1, 2, 3...
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Email : utilisé pour la connexion (doit être unique)
    # unique=True : PostgreSQL refuse 2 utilisateurs avec le même email
    # nullable=False : le champ est obligatoire
    # index=True : crée un index pour les recherches rapides (SELECT WHERE email = ...)
    email = Column(String(255), unique=True, nullable=False, index=True)
    
    # Hash du mot de passe (JAMAIS le mot de passe en clair !)
    # Exemple de hash bcrypt: $2b$12$xY8Z...  (60 caractères)
    password_hash = Column(String(255), nullable=False)
    
    # Informations personnelles
    first_name = Column(String(100), nullable=False)  # Prénom
    last_name = Column(String(100), nullable=False)   # Nom de famille
    address = Column(Text, nullable=False)            # Adresse postale complète
    
    # Indicateur administrateur : True = admin, False = client normal
    # Par défaut, tout nouveau compte est un client (False)
    is_admin = Column(Boolean, default=False)
    
    # Date de création du compte
    created_at = Column(DateTime, default=utcnow)
    
    # ===== RELATIONS AVEC D'AUTRES TABLES =====
    # Un utilisateur peut avoir plusieurs commandes (1 user → N orders)
    # back_populates crée une relation bidirectionnelle : user.orders ET order.user
    orders = relationship("Order", back_populates="user")
    
    # Un utilisateur a un seul panier (1 user → 1 cart)
    # uselist=False indique que c'est une relation 1:1, pas 1:N
    cart = relationship("Cart", back_populates="user", uselist=False)

# ========================================
# TABLE PRODUCTS - Produits du catalogue
# ========================================
class Product(Base):
    """
    Table des produits vendus sur le site.
    
    Chaque ligne = un produit différent (iPhone, AirPods, etc.)
    """
    __tablename__ = "products"
    
    # ===== COLONNES =====
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)  # ID unique du produit
    
    name = Column(String(255), nullable=False)  # Nom du produit (ex: "iPhone 15 Pro")
    description = Column(Text)                  # Description complète (peut être vide)
    
    # Prix en CENTIMES (pas en euros !)
    # Pourquoi ? Évite les problèmes d'arrondis avec les décimales
    # Exemple : 99,99€ → 9999 centimes
    price_cents = Column(Integer, nullable=False)
    
    # Quantité en stock : combien d'unités disponibles ?
    # Si stock_qty = 0, le produit n'est plus disponible à la vente
    stock_qty = Column(Integer, nullable=False, default=0)
    
    # Produit actif ? True = visible sur le site, False = caché (archivé)
    active = Column(Boolean, default=True)
    
    # URL de l'image du produit (peut être vide)
    image_url = Column(String(500), nullable=True)
    
    # Date d'ajout du produit au catalogue
    created_at = Column(DateTime, default=utcnow)
    
    # ===== RELATIONS =====
    # Un produit peut être dans plusieurs paniers (1 product → N cart_items)
    cart_items = relationship("CartItem", back_populates="product")
    
    # Un produit peut être dans plusieurs commandes (1 product → N order_items)
    order_items = relationship("OrderItem", back_populates="product")

# ========================================
# TABLE CARTS - Paniers d'achat
# ========================================
class Cart(Base):
    """
    Table des paniers d'achat.
    
    Chaque utilisateur a UN SEUL panier (relation 1:1 avec User).
    Le panier contient plusieurs items (produits + quantités).
    """
    __tablename__ = "carts"
    
    # ===== COLONNES =====
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Lien vers l'utilisateur (clé étrangère)
    # ForeignKey("users.id") = fait référence à la colonne id de la table users
    # unique=True = un seul panier par utilisateur
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, unique=True)
    
    created_at = Column(DateTime, default=utcnow)           # Date de création du panier
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)  # Mise à jour auto quand modifié
    
    # ===== RELATIONS =====
    user = relationship("User", back_populates="cart")  # Lien vers le User
    
    # Un panier contient plusieurs items (lignes de panier)
    # cascade="all, delete-orphan" : si on supprime le panier, on supprime aussi tous ses items
    items = relationship("CartItem", back_populates="cart", cascade="all, delete-orphan")

# ========================================
# TABLE CART_ITEMS - Lignes de panier
# ========================================
class CartItem(Base):
    """
    Table des lignes de panier (articles dans un panier).
    
    Chaque ligne = un produit + sa quantité dans le panier
    Exemple : "3 x iPhone 15" = 1 ligne avec quantity=3
    """
    __tablename__ = "cart_items"
    
    # ===== COLONNES =====
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Lien vers le panier parent
    cart_id = Column(UUID(as_uuid=True), ForeignKey("carts.id"), nullable=False)
    
    # Lien vers le produit
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=False)
    
    # Quantité de ce produit dans le panier
    quantity = Column(Integer, nullable=False, default=1)
    
    created_at = Column(DateTime, default=utcnow)
    
    # ===== RELATIONS =====
    cart = relationship("Cart", back_populates="items")       # Lien vers le Cart
    product = relationship("Product", back_populates="cart_items")  # Lien vers le Product

# ========================================
# TABLE ORDERS - Commandes
# ========================================
class Order(Base):
    """
    Table des commandes utilisateur - LA TABLE LA PLUS IMPORTANTE !
    
    Cette table trace TOUT le cycle de vie d'une commande, de sa création à sa livraison.
    
    CYCLE DE VIE D'UNE COMMANDE :
    1. CREE : Commande créée depuis le panier (checkout)
    2. VALIDEE : Commande validée par l'admin (optionnel)
    3. PAYEE : Paiement effectué avec succès
    4. EXPEDIEE : Colis envoyé par l'admin
    5. LIVREE : Colis reçu par le client
    
    États alternatifs :
    - ANNULEE : Commande annulée (par client ou admin)
    - REMBOURSEE : Commande remboursée
    """
    __tablename__ = "orders"
    
    # ===== COLONNES =====
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Lien vers l'utilisateur qui a passé la commande
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    # Statut de la commande (CREE, PAYEE, EXPEDIEE, LIVREE, ANNULEE, REMBOURSEE)
    status = Column(String(50), nullable=False, default="CREE")
    
    # ===== TIMESTAMPS - Traçabilité complète =====
    # Ces colonnes permettent de savoir QUAND chaque étape a eu lieu
    created_at = Column(DateTime, default=utcnow, nullable=False)  # Date de création
    validated_at = Column(DateTime)    # Date de validation (admin)
    paid_at = Column(DateTime)         # Date de paiement (ajouté dans votre code)
    shipped_at = Column(DateTime)      # Date d'expédition
    delivered_at = Column(DateTime)    # Date de livraison
    cancelled_at = Column(DateTime)    # Date d'annulation
    refunded_at = Column(DateTime)     # Date de remboursement
    
    # Liens vers d'autres tables (clés étrangères)
    payment_id = Column(UUID(as_uuid=True))   # Lien vers le Payment
    invoice_id = Column(UUID(as_uuid=True))   # Lien vers l'Invoice (facture)
    delivery_id = Column(UUID(as_uuid=True))  # Lien vers la Delivery
    
    # ===== RELATIONS =====
    user = relationship("User", back_populates="orders")  # Utilisateur qui a passé la commande
    
    # Une commande contient plusieurs lignes (produits)
    # cascade="all, delete-orphan" : si on supprime la commande, on supprime ses items
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    
    # Une commande a une livraison (1:1)
    delivery = relationship("Delivery", back_populates="order", uselist=False)
    
    # ===== MÉTHODES =====
    def total_cents(self) -> int:
        """
        Calcule le montant total de la commande en centimes.
        
        Exemple : 2 iPhones à 99999 centimes + 1 AirPods à 27999 centimes
        → Total = 227997 centimes (2279,97€)
        """
        return sum(item.unit_price_cents * item.quantity for item in self.items)

# ========================================
# TABLE ORDER_ITEMS - Lignes de commande
# ========================================
class OrderItem(Base):
    """
    Table des lignes de commande (articles commandés).
    
    IMPORTANT : Cette table fait un "snapshot" (capture) du produit au moment de l'achat.
    Pourquoi ? Si le prix du produit change après, la commande doit garder l'ancien prix !
    
    Exemple : iPhone acheté à 999€. Le lendemain, le prix passe à 1099€.
    → La commande doit toujours afficher 999€ (prix au moment de l'achat).
    """
    __tablename__ = "order_items"
    
    # ===== COLONNES =====
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Lien vers la commande parent
    order_id = Column(UUID(as_uuid=True), ForeignKey("orders.id"), nullable=False)
    
    # Lien vers le produit (pour référence)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=False)
    
    # SNAPSHOT du produit au moment de l'achat
    name = Column(String(255), nullable=False)        # Nom du produit (copié depuis Product)
    unit_price_cents = Column(Integer, nullable=False)  # Prix unitaire (copié depuis Product)
    quantity = Column(Integer, nullable=False)        # Quantité commandée
    
    # ===== RELATIONS =====
    order = relationship("Order", back_populates="items")
    product = relationship("Product", back_populates="order_items")

# ========================================
# TABLE DELIVERIES - Livraisons
# ========================================
class Delivery(Base):
    """
    Table des informations de livraison.
    Chaque commande a UNE livraison (relation 1:1 avec Order).
    """
    __tablename__ = "deliveries"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Lien vers la commande (unique = une seule livraison par commande)
    order_id = Column(UUID(as_uuid=True), ForeignKey("orders.id"), nullable=False, unique=True)
    
    transporteur = Column(String(100), nullable=False)  # Nom du transporteur (Colissimo, Chronopost...)
    tracking_number = Column(String(100), nullable=True)  # Numéro de suivi (optionnel au début)
    address = Column(Text, nullable=False)               # Adresse de livraison
    delivery_status = Column(String(50), nullable=False, default="PREPAREE")  # PREPAREE, EN_COURS, LIVREE
    created_at = Column(DateTime, default=utcnow)
    
    # Relations
    order = relationship("Order", back_populates="delivery")

# ========================================
# TABLE INVOICES - Factures
# ========================================
class Invoice(Base):
    """
    Table des factures générées pour les commandes payées.
    Une facture = un document PDF téléchargeable par le client.
    """
    __tablename__ = "invoices"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id = Column(UUID(as_uuid=True), ForeignKey("orders.id"), nullable=False)  # Commande liée
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)    # Client
    total_cents = Column(Integer, nullable=False)  # Montant total de la facture
    created_at = Column(DateTime, default=utcnow)  # Date de génération
    
    # Relations
    order = relationship("Order")
    user = relationship("User")

# ========================================
# TABLE PAYMENTS - Paiements
# ========================================
class Payment(Base):
    """
    Table des paiements effectués.
    
    SÉCURITÉ : On ne stocke JAMAIS le numéro de carte complet !
    On garde uniquement les 4 derniers chiffres (card_last4) pour référence.
    """
    __tablename__ = "payments"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id = Column(UUID(as_uuid=True), ForeignKey("orders.id"), nullable=False)
    
    amount_cents = Column(Integer, nullable=False)  # Montant payé en centimes
    status = Column(String(50), nullable=False, default="PENDING")  # PENDING, PAID, FAILED, REFUNDED
    payment_method = Column(String(50), nullable=False)  # CARD, PAYPAL, etc.
    created_at = Column(DateTime, default=utcnow)
    
    # ===== Informations de paiement (NON SENSIBLES) =====
    # On stocke uniquement le minimum nécessaire pour la facturation
    card_last4 = Column(String(4), nullable=True)     # 4 derniers chiffres (ex: "1234")
    postal_code = Column(String(5), nullable=True)    # Code postal de facturation
    phone = Column(String(10), nullable=True)         # Téléphone
    street_number = Column(String(10), nullable=True) # Numéro de rue
    street_name = Column(String(100), nullable=True)  # Nom de rue
    
    # ID de la transaction Stripe (nécessaire pour les remboursements)
    # Format: "ch_xxx" pour les charges Stripe, "ch_sim_xxx" pour les simulations
    charge_id = Column(String(255), nullable=True)    # ID de la charge Stripe (pour remboursements)
    
    # Relations
    order = relationship("Order")

# ========================================
# TABLES SUPPORT CLIENT - Messages
# ========================================
class MessageThread(Base):
    """
    Table des fils de discussion du support client.
    
    Un fil = une conversation entre un client et le support.
    Chaque fil peut être lié à une commande spécifique (optionnel).
    """
    __tablename__ = "message_threads"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)     # Client
    order_id = Column(UUID(as_uuid=True), ForeignKey("orders.id"), nullable=True)    # Commande liée (optionnel)
    
    subject = Column(String(255), nullable=False)  # Sujet de la conversation
    closed = Column(Boolean, default=False)         # False = ouvert, True = fermé/résolu
    
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)  # Mis à jour automatiquement
    
    # Relations
    user = relationship("User")
    order = relationship("Order")
    messages = relationship("Message", back_populates="thread", cascade="all, delete-orphan")

class Message(Base):
    """
    Table des messages individuels dans un fil de discussion.
    
    author_user_id = None → message envoyé par un admin
    author_user_id = UUID → message envoyé par le client
    """
    __tablename__ = "messages"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    thread_id = Column(UUID(as_uuid=True), ForeignKey("message_threads.id"), nullable=False)
    
    # Auteur du message (None = admin, UUID = client)
    author_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    
    content = Column(Text, nullable=False)  # Contenu du message
    created_at = Column(DateTime, default=utcnow)
    
    # Relations
    thread = relationship("MessageThread", back_populates="messages")
    author = relationship("User")

# ========================================
# TABLE PASSWORD_RESET_TOKENS - Réinitialisation mot de passe
# ========================================
class PasswordResetToken(Base):
    """
    Table des tokens de réinitialisation de mot de passe.
    
    Fonctionnement du système "mot de passe oublié" :
    1. L'utilisateur clique sur "Mot de passe oublié" et entre son email
    2. Le système génère un token unique (chaîne aléatoire de 32 caractères)
    3. Un email est envoyé avec un lien contenant le token
    4. L'utilisateur clique sur le lien et définit un nouveau mot de passe
    5. Le token est marqué comme "utilisé" (used=True)
    
    SÉCURITÉ :
    - Le token expire après 1 heure (expires_at)
    - Un token ne peut être utilisé qu'une seule fois (used=True après usage)
    - Le token est unique et impossible à deviner (32 caractères aléatoires)
    """
    __tablename__ = "password_reset_tokens"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)  # Utilisateur concerné
    
    # Token unique généré (ex: "x4k9Zm3nQpL7...")
    # index=True pour rechercher rapidement un token
    token = Column(String(255), unique=True, nullable=False, index=True)
    
    expires_at = Column(DateTime, nullable=False)  # Date d'expiration (créé + 1 heure)
    used = Column(Boolean, default=False)          # False = pas encore utilisé, True = déjà utilisé
    created_at = Column(DateTime, default=utcnow)  # Date de création
    
    # Relations
    user = relationship("User")
