"""
========================================
SERVICE D'AUTHENTIFICATION
========================================

Ce fichier contient TOUTE la logique d'authentification de l'application :
- Inscription (création de compte)
- Connexion (login)
- Génération et vérification de tokens JWT
- Hachage et vérification de mots de passe
- Réinitialisation de mot de passe ("mot de passe oublié")

C'est le fichier le PLUS IMPORTANT pour la sécurité de votre application !

Rôles:
- Hachage et vérification des mots de passe (bcrypt + fallback SHA-256)
- Création et validation de tokens JWT (JSON Web Tokens)
- Gestion des comptes utilisateurs
- Système "mot de passe oublié"

SÉCURITÉ:
- Les mots de passe ne sont JAMAIS stockés en clair (uniquement des hash)
- Les tokens JWT expirent après 2 heures
- Les tokens de reset expirent après 1 heure
- En production, la secret_key doit être dans une variable d'environnement !
"""

# ========== IMPORTS ==========
import jwt          # Pour créer et vérifier les tokens JWT
import bcrypt       # Pour hasher les mots de passe de manière sécurisée
import hashlib      # Fallback pour le hachage (moins sécurisé que bcrypt)
import time
import secrets      # Pour générer des tokens aléatoires sécurisés
from datetime import datetime, timedelta
from typing import Optional
from database.database import SessionLocal
from database.models import User, PasswordResetToken
from database.repositories_simple import PostgreSQLUserRepository
from enums import OrderStatus
from sqlalchemy.orm import Session

# ========================================
# CLASSE AuthService
# ========================================
class AuthService:
    """
    Service centralisant TOUTES les opérations d'authentification.
    
    Cette classe gère :
    - Le login/logout
    - L'inscription
    - La création et vérification de tokens JWT
    - Le hachage et la vérification de mots de passe
    - La réinitialisation de mot de passe
    """
    
    def __init__(self, user_repo: Optional[PostgreSQLUserRepository] = None):
        """
        Initialise le service d'authentification.
        
        Arguments:
            user_repo: Repository pour accéder à la table users (optionnel)
        """
        # Repository pour accéder à la base de données users
        self.user_repo = user_repo or PostgreSQLUserRepository(SessionLocal())
        
        # ===== CONFIGURATION JWT =====
        # Secret key : utilisée pour SIGNER les tokens JWT
        # ⚠️ EN PRODUCTION : mettre cette clé dans une variable d'environnement !
        self.secret_key = "your-secret-key-change-in-production"
        
        # Algorithme de signature des tokens
        self.algorithm = "HS256"  # HS256 = HMAC avec SHA-256
        
        # Durée de validité des tokens (2 heures)
        self.access_token_expire_minutes = 120
        
        # Simple session manager (pour compatibilité avec d'anciens tests)
        class SessionManager:
            def __init__(self):
                self._store: dict[str, str] = {}
            def create_session(self, user_id: str) -> str:
                token = f"token-{user_id}"
                self._store[token] = user_id
                return token

        self.sessions = SessionManager()
    
    # ========================================
    # MÉTHODES DE GESTION DES MOTS DE PASSE
    # ========================================
    
    def hash_password(self, password: str) -> str:
        """
        Hashe un mot de passe de manière SÉCURISÉE avec bcrypt.
    
        Exemple :
        - Mot de passe : "monmotdepasse123"
        - Hash bcrypt : "$2b$12$xY8Z4aB...60caractères..."
        
        Le hash est IRRÉVERSIBLE : impossible de retrouver le mot de passe original.
        """
        try:
            salt = bcrypt.gensalt()  # Génère un salt aléatoire
            hashed = bcrypt.hashpw(password.encode("utf-8"), salt)  # Hash le mot de passe
            return hashed.decode("utf-8")
        except Exception:
            # Fallback SHA-256 si bcrypt n'est pas disponible (pour les tests)
            # ⚠️ SHA-256 simple est MOINS SÉCURISÉ que bcrypt !
            sha = hashlib.sha256(password.encode('utf-8')).hexdigest()
            return f"sha256::{sha}"
    
    def verify_password(self, password: str, hashed_password: str) -> bool:
        """
        Vérifie qu'un mot de passe correspond au hash enregistré.
        
        Utilisé lors du LOGIN pour vérifier que le mot de passe saisi est correct.
        
        Fonctionnement :
        1. Récupère le hash stocké en base de données
        2. Hash le mot de passe saisi avec le même salt
        3. Compare les deux hash
        4. Retourne True si identiques, False sinon
        
        Exemple d'utilisation :
        - Utilisateur saisit : "monmotdepasse123"
        - Hash en BDD : "$2b$12$xY8Z..."
        - verify_password("monmotdepasse123", "$2b$12$xY8Z...") → True
        - verify_password("motdepassefaux", "$2b$12$xY8Z...") → False
        """
        try:
            # Essayer bcrypt en premier (méthode sécurisée)
            if isinstance(hashed_password, str) and not hashed_password.startswith('sha256::'):
                return bcrypt.checkpw(password.encode('utf-8'), hashed_password.encode('utf-8'))
            
            # Fallback SHA-256 pour les tests
            if isinstance(hashed_password, str) and hashed_password.startswith('sha256::'):
                expected = hashed_password.split('::', 1)[1]
                return hashlib.sha256(password.encode('utf-8')).hexdigest() == expected
            
            return False
        except Exception:
            return False
    
    # ========================================
    # MÉTHODES JWT (JSON WEB TOKENS)
    # ========================================
    
    def create_access_token(self, data: dict) -> str:
        """
        Crée un token JWT (JSON Web Token) pour l'authentification.
        
        Un JWT est un "jeton" que le frontend envoie à chaque requête pour prouver son identité.
        Structure d'un JWT : header.payload.signature (3 parties séparées par des points)
        
        Exemple de JWT :
        eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NSIsImV4cCI6MTY5...
        
        Arguments:
            data: Données à inclure dans le token (généralement {"sub": user_id})
        
        Retourne:
            Le token JWT sous forme de chaîne de caractères
        
        Le token contient :
        - Les données fournies (ex: ID utilisateur)
        - Une date d'expiration (2 heures après création)
        - Une signature cryptographique (pour éviter la falsification)
        """
        to_encode = data.copy()
        # Ajouter l'expiration : maintenant + 2 heures
        from datetime import UTC
        expire = datetime.now(UTC) + timedelta(minutes=self.access_token_expire_minutes)
        to_encode.update({"exp": expire})
        # Encoder et signer le token avec la secret_key
        encoded_jwt = jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
        return encoded_jwt
    
    def verify_token(self, token: str) -> Optional[dict]:
        """
        Vérifie un token JWT et extrait ses données.
        
        Utilisé à chaque requête authentifiée pour vérifier l'identité de l'utilisateur.
        
        Vérifications effectuées :
        1. Le token a le bon format
        2. La signature est valide (pas de falsification)
        3. Le token n'est pas expiré
        
        Arguments:
            token: Le token JWT à vérifier
        
        Retourne:
            - Si valide : le contenu du token (dict avec "sub", "exp", etc.)
            - Si invalide/expiré : None
        """
        try:
            # Décoder et vérifier le token
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            return payload
        except jwt.PyJWTError:
            # Token invalide, expiré, ou signature incorrecte
            return None
    
    # ========================================
    # MÉTHODES D'AUTHENTIFICATION
    # ========================================
    
    def authenticate_user(self, email: str, password: str) -> Optional[User]:
        """
        Authentifie un utilisateur (utilisé lors du LOGIN).
        
        Flux d'exécution :
        1. Cherche l'utilisateur par email dans la base de données
        2. Si trouvé, vérifie que le mot de passe est correct
        3. Si correct, retourne l'objet User
        4. Sinon, retourne None
        
        Arguments:
            email: Adresse email de l'utilisateur
            password: Mot de passe saisi (en clair, sera comparé au hash)
        
        Retourne:
            - Si authentification réussie : l'objet User
            - Sinon : None
        """
        # Étape 1 : Chercher l'utilisateur par email
        user = self.user_repo.get_by_email(email)
        if not user:
            return None  # Email n'existe pas
        
        # Étape 2 : Vérifier le mot de passe
        if not self.verify_password(password, user.password_hash):  # type: ignore
            return None  # Mot de passe incorrect
        
        # Étape 3 : Authentification réussie
        return user

    # API de compatibilité tests unitaires simples
    def login(self, email: str, password: str):
        user = self.authenticate_user(email, password)
        if not user:
            raise ValueError("Identifiants invalides")
        # Utiliser le session manager (mockable dans les tests)
        return self.sessions.create_session(str(user.id))
    
    def register(self, email: str, password: str, first_name: str, last_name: str, address: str) -> User:
        """Crée un nouvel utilisateur (idempotent si même email+mot de passe)."""
        # Vérifier si l'email existe déjà
        existing_user = self.user_repo.get_by_email(email)
        if existing_user:
            # Rendre idempotent: si le mot de passe correspond, renvoyer l'utilisateur existant
            if self.verify_password(password, existing_user.password_hash):  # type: ignore
                return existing_user
            # Sinon, conserver l'erreur actuelle
            raise ValueError("Email déjà utilisé.")
        
        # Créer le nouvel utilisateur
        hashed_password = self.hash_password(password)
        user_data = {
            "email": email,
            "password_hash": hashed_password,
            "first_name": first_name,
            "last_name": last_name,
            "address": address,
            "is_admin": False
        }
        return self.user_repo.create(user_data)

    # Alias attendu par certains tests unitaires
    def register_user(self, email: str, password: str, first_name: str, last_name: str, address: str) -> User:
        return self.register(email, password, first_name, last_name, address)
    
    # ============================== Récupération de mot de passe ==============================
    
    def generate_reset_token(self, email: str) -> Optional[str]:
        """Génère un token de réinitialisation de mot de passe pour un utilisateur.
        
        Args:
            email: Email de l'utilisateur
            
        Returns:
            Le token généré ou None si l'utilisateur n'existe pas
        """
        # Vérifier si l'utilisateur existe
        user = self.user_repo.get_by_email(email)
        if not user:
            # Pour des raisons de sécurité, ne pas révéler si l'email existe ou non
            # On retourne None mais on ne génère pas de token
            return None
        
        # Générer un token sécurisé
        token = secrets.token_urlsafe(32)
        
        # Calculer l'expiration (1 heure)
        from datetime import UTC
        expires_at = datetime.now(UTC) + timedelta(hours=1)
        
        # Créer l'enregistrement du token dans la base de données
        db = self.user_repo.db
        reset_token = PasswordResetToken(
            user_id=user.id,
            token=token,
            expires_at=expires_at,
            used=False
        )
        db.add(reset_token)
        db.commit()
        
        return token
    
    def verify_reset_token(self, token: str) -> Optional[User]:
        """Vérifie la validité d'un token de réinitialisation.
        
        Args:
            token: Le token à vérifier
            
        Returns:
            L'utilisateur associé si le token est valide, None sinon
        """
        db = self.user_repo.db
        
        # Rechercher le token dans la base de données
        from datetime import UTC
        reset_token = db.query(PasswordResetToken).filter(
            PasswordResetToken.token == token,
            PasswordResetToken.used == False,
            PasswordResetToken.expires_at > datetime.now(UTC)
        ).first()
        
        if not reset_token:
            return None
        
        # Récupérer l'utilisateur associé
        user = db.query(User).filter(User.id == reset_token.user_id).first()
        return user
    
    def reset_password(self, token: str, new_password: str) -> bool:
        """Réinitialise le mot de passe d'un utilisateur avec un token valide.
        
        Args:
            token: Le token de réinitialisation
            new_password: Le nouveau mot de passe
            
        Returns:
            True si la réinitialisation a réussi, False sinon
        """
        # Vérifier le token
        user = self.verify_reset_token(token)
        if not user:
            return False
        
        db = self.user_repo.db
        
        # Mettre à jour le mot de passe
        user.password_hash = self.hash_password(new_password)  # type: ignore
        
        # Marquer le token comme utilisé
        reset_token = db.query(PasswordResetToken).filter(
            PasswordResetToken.token == token
        ).first()
        if reset_token:
            reset_token.used = True  # type: ignore
        
        db.commit()
        return True
    
    def cleanup_expired_tokens(self) -> int:
        """Supprime les tokens expirés de la base de données.
        
        Returns:
            Le nombre de tokens supprimés
        """
        db = self.user_repo.db
        
        # Supprimer les tokens expirés ou déjà utilisés depuis plus de 24h
        from datetime import UTC
        cutoff_time = datetime.now(UTC) - timedelta(days=1)
        deleted = db.query(PasswordResetToken).filter(
            (PasswordResetToken.expires_at < datetime.now(UTC)) |
            ((PasswordResetToken.used == True) & (PasswordResetToken.created_at < cutoff_time))
        ).delete()
        
        db.commit()
        return deleted
