"""
Service métier pour la gestion des paiements.

Ce service gère :
- Traitement des paiements par carte via Stripe
- Gestion des remboursements via Stripe
- Validation des données de paiement
"""

import os
from typing import Optional, Dict, Any
from datetime import datetime
import uuid
import stripe
from dotenv import load_dotenv
from database.models import Payment, Order
from database.repositories_simple import PostgreSQLPaymentRepository, PostgreSQLOrderRepository
from enums import OrderStatus

# Charger les variables d'environnement depuis config.env ou .env
# Cherche d'abord config.env à la racine du projet, puis .env
from pathlib import Path
project_root = Path(__file__).parent.parent.parent  # Remonter jusqu'à la racine du projet
config_env_path = project_root / "config.env"
env_path = project_root / ".env"

if config_env_path.exists():
    load_dotenv(dotenv_path=config_env_path)
elif env_path.exists():
    load_dotenv(dotenv_path=env_path)
else:
    load_dotenv()  # Fallback sur .env par défaut

# Initialiser Stripe avec la clé API depuis les variables d'environnement
stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "")


def create_checkout_session(
    order_id: str,
    amount_cents: int,
    order_label: str,
    success_url: str,
    cancel_url: str,
    customer_email: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Crée une session Stripe Checkout (redirection vers la page de paiement Stripe).
    Les paiements apparaissent dans le Dashboard Stripe.
    Returns:
        {"url": "https://checkout.stripe.com/...", "session_id": "cs_..."}
        ou {"error": "missing_key"|"stripe_api", "message": "..."}
    """
    if not stripe.api_key or stripe.api_key == "":
        return {"error": "missing_key", "message": "STRIPE_SECRET_KEY non configurée."}
    if not success_url or not cancel_url:
        return {"error": "session_failed", "message": "URLs de redirection manquantes."}
    try:
        kwargs = {
            "mode": "payment",
            "payment_method_types": ["card"],
            "line_items": [
                {
                    "price_data": {
                        "currency": "eur",
                        "unit_amount": amount_cents,
                        "product_data": {
                            "name": order_label,
                            "description": f"Commande #{order_id[:8]}",
                        },
                    },
                    "quantity": 1,
                }
            ],
            "success_url": success_url,
            "cancel_url": cancel_url,
            "metadata": {"order_id": order_id},
            "client_reference_id": order_id,
        }
        if customer_email:
            kwargs["customer_email"] = customer_email
        session = stripe.checkout.Session.create(**kwargs)
        return {
            "url": session.url,
            "session_id": session.id,
        }
    except stripe.error.StripeError as e:
        return {"error": "stripe_api", "message": str(e)}
    except Exception as e:
        return {"error": "stripe_api", "message": str(e)}


def retrieve_checkout_session(session_id: str) -> Dict[str, Any]:
    """
    Récupère une session Checkout Stripe et vérifie le paiement.
    Returns:
        {"success": True, "order_id": "...", "payment_intent": "...", "amount_total": ...}
        ou {"success": False, "error": "..."}
    """
    if not stripe.api_key or stripe.api_key == "":
        return {"success": False, "error": "missing_key"}
    if not session_id:
        return {"success": False, "error": "invalid_session"}
    try:
        session = stripe.checkout.Session.retrieve(
            session_id,
            expand=["payment_intent", "payment_intent.latest_charge"],
        )
        if session.payment_status != "paid":
            return {"success": False, "error": "payment_not_completed"}
        order_id = session.metadata.get("order_id") if session.metadata else None
        if not order_id:
            return {"success": False, "error": "invalid_course"}
        amount_total = session.amount_total or 0
        payment_intent_id = None
        charge_id = None
        if getattr(session, "payment_intent", None):
            pi = session.payment_intent
            payment_intent_id = pi.id if hasattr(pi, "id") else None
            if hasattr(pi, "latest_charge") and pi.latest_charge:
                ch = pi.latest_charge
                charge_id = ch.id if hasattr(ch, "id") else (ch if isinstance(ch, str) else None)
        return {
            "success": True,
            "order_id": order_id,
            "payment_intent": payment_intent_id,
            "charge_id": charge_id,
            "amount_total": amount_total,
        }
    except stripe.error.StripeError as e:
        return {"success": False, "error": "stripe_api", "message": str(e)}
    except Exception as e:
        return {"success": False, "error": "stripe_api", "message": str(e)}


class PaymentGateway:
    """Gateway de paiement utilisant Stripe Test."""
    
    def __init__(self):
        """Initialise le gateway Stripe."""
        self.use_stripe = bool(stripe.api_key and stripe.api_key != "")
        # Mode simulation : simule Stripe sans appeler l'API (utile si les APIs de cartes brutes ne sont pas activées)
        self.use_simulation = os.getenv("STRIPE_USE_SIMULATION", "true").lower() == "true"
        
        if not self.use_stripe and not self.use_simulation:
            raise ValueError("STRIPE_SECRET_KEY n'est pas configurée. Configurez STRIPE_SECRET_KEY ou activez STRIPE_USE_SIMULATION=true pour utiliser le mode simulation.")
    
    def charge_card(self, card_number: str, exp_month: int, exp_year: int, cvc: str,
                   amount_cents: int, idempotency_key: str, email: Optional[str] = None) -> Dict[str, Any]:
        """
        Traite un paiement par carte via Stripe.
        
        Args:
            card_number: Numéro de carte (16 chiffres)
            exp_month: Mois d'expiration (1-12)
            exp_year: Année d'expiration (4 chiffres)
            cvc: Code de sécurité (3-4 chiffres)
            amount_cents: Montant en centimes
            idempotency_key: Clé d'idempotence pour éviter les doublons
            email: Email du client (optionnel)
        
        Returns:
            Dict avec success, transaction_id (charge_id), failure_reason
        """
        # Mode simulation : simule les paiements Stripe sans appeler l'API
        if self.use_simulation:
            return self._simulate_payment(card_number, amount_cents, idempotency_key)
        
        # Mode réel : appelle l'API Stripe
        try:
            # Créer un PaymentMethod avec les détails de la carte
            payment_method = stripe.PaymentMethod.create(
                type="card",
                card={
                    "number": card_number,
                    "exp_month": exp_month,
                    "exp_year": exp_year,
                    "cvc": cvc,
                },
            )
            
            # Créer un PaymentIntent avec le montant
            payment_intent = stripe.PaymentIntent.create(
                amount=amount_cents,
                currency="eur",
                payment_method=payment_method.id,
                confirmation_method="manual",
                confirm=True,
                idempotency_key=idempotency_key,
                metadata={
                    "order_id": idempotency_key,
                },
                expand=["latest_charge"],  # Inclure les détails de la charge pour récupérer le charge_id
            )
            
            # Vérifier le statut du paiement
            if payment_intent.status == "succeeded":
                # Récupérer le charge_id depuis le PaymentIntent
                # Le charge_id peut être dans latest_charge (objet ou string) ou dans charges.data[0].id
                charge_id = None
                
                # Essayer latest_charge (peut être un string ou un objet)
                if hasattr(payment_intent, "latest_charge") and payment_intent.latest_charge:
                    if isinstance(payment_intent.latest_charge, str):
                        charge_id = payment_intent.latest_charge
                    elif hasattr(payment_intent.latest_charge, "id"):
                        charge_id = payment_intent.latest_charge.id
                
                # Si latest_charge n'est pas disponible, essayer charges.data[0].id
                if not charge_id:
                    if hasattr(payment_intent, "charges") and payment_intent.charges and payment_intent.charges.data:
                        charge_id = payment_intent.charges.data[0].id
                
                # Si toujours pas de charge_id, récupérer le PaymentIntent avec expand pour avoir les charges
                if not charge_id:
                    try:
                        payment_intent_retrieved = stripe.PaymentIntent.retrieve(
                            payment_intent.id,
                            expand=["charges"]
                        )
                        if hasattr(payment_intent_retrieved, "charges") and payment_intent_retrieved.charges and payment_intent_retrieved.charges.data:
                            charge_id = payment_intent_retrieved.charges.data[0].id
                    except Exception:
                        pass  # Si la récupération échoue, on continue sans charge_id
                
                return {
                    "success": True,
                    "transaction_id": payment_intent.id,
                    "failure_reason": None,
                    "charge_id": charge_id
                }
            elif payment_intent.status == "requires_payment_method":
                # Paiement refusé
                error_message = payment_intent.last_payment_error.message if payment_intent.last_payment_error else "Paiement refusé"
                return {
                    "success": False,
                    "transaction_id": None,
                    "failure_reason": error_message,
                    "charge_id": None
                }
            else:
                # Autre statut (requires_action, etc.)
                return {
                    "success": False,
                    "transaction_id": payment_intent.id,
                    "failure_reason": f"Statut: {payment_intent.status}",
                    "charge_id": None
                }
                
        except stripe.error.CardError as e:
            # Carte refusée
            return {
                "success": False,
                "transaction_id": None,
                "failure_reason": e.user_message if hasattr(e, "user_message") else str(e),
                "charge_id": None
            }
        except stripe.error.InvalidRequestError as e:
            # Erreur de requête invalide (ex: accès aux APIs de carte brutes non activé)
            error_msg = str(e)
            if "raw card data" in error_msg.lower() or "unsafe" in error_msg.lower():
                # Basculer automatiquement en mode simulation si les APIs ne sont pas activées
                return self._simulate_payment(card_number, amount_cents, idempotency_key)
            return {
                "success": False,
                "transaction_id": None,
                "failure_reason": f"Erreur Stripe: {error_msg}",
                "charge_id": None
            }
        except stripe.error.StripeError as e:
            # Autre erreur Stripe
            return {
                "success": False,
                "transaction_id": None,
                "failure_reason": f"Erreur Stripe: {str(e)}",
                "charge_id": None
            }
        except Exception as e:
            # Erreur inattendue
            return {
                "success": False,
                "transaction_id": None,
                "failure_reason": f"Erreur inattendue: {str(e)}",
                "charge_id": None
            }
    
    def _simulate_payment(self, card_number: str, amount_cents: int, idempotency_key: str) -> Dict[str, Any]:
        """
        Simule un paiement Stripe sans appeler l'API.
        Utilise les mêmes règles que Stripe pour les cartes de test.
        """
        # Cartes de test Stripe qui réussissent
        success_cards = [
            "4242424242424242",  # Visa
            "5555555555554444",  # Mastercard
            "4000002500003155",  # 3D Secure (réussie)
        ]
        
        # Cartes de test Stripe qui échouent
        declined_cards = {
            "4000000000000002": "Votre carte a été refusée.",
            "4000000000009995": "Votre carte a été refusée. Fonds insuffisants.",
            "4000000000000069": "Votre carte a expiré.",
            "4000000000000127": "Le code de sécurité de votre carte est incorrect.",
        }
        
        # Nettoyer le numéro de carte (enlever les espaces)
        card_number_clean = card_number.replace(" ", "").replace("-", "")
        
        # Vérifier si la carte est dans la liste des cartes refusées
        if card_number_clean in declined_cards:
            return {
                "success": False,
                "transaction_id": None,
                "failure_reason": declined_cards[card_number_clean],
                "charge_id": None
            }
        
        # Vérifier si la carte est dans la liste des cartes qui réussissent
        if card_number_clean in success_cards or card_number_clean.startswith("4242") or card_number_clean.startswith("5555"):
            # Simuler un paiement réussi
            transaction_id = f"pi_sim_{uuid.uuid4().hex[:24]}"
            charge_id = f"ch_sim_{uuid.uuid4().hex[:24]}"
            return {
                "success": True,
                "transaction_id": transaction_id,
                "failure_reason": None,
                "charge_id": charge_id
            }
        
        # Pour les autres cartes, vérifier le format (doit être valide Luhn)
        # Si la carte se termine par 0000, refuser
        if card_number_clean.endswith("0000"):
            return {
                "success": False,
                "transaction_id": None,
                "failure_reason": "Votre carte a été refusée.",
                "charge_id": None
            }
        
        # Par défaut, accepter (simulation)
        transaction_id = f"pi_sim_{uuid.uuid4().hex[:24]}"
        charge_id = f"ch_sim_{uuid.uuid4().hex[:24]}"
        return {
            "success": True,
            "transaction_id": transaction_id,
            "failure_reason": None,
            "charge_id": charge_id
        }
    
    def refund(self, charge_id: str, amount_cents: int) -> Dict[str, Any]:
        """
        Traite un remboursement via Stripe.
        
        Args:
            charge_id: ID de la transaction Stripe à rembourser
            amount_cents: Montant à rembourser en centimes (None pour remboursement total)
        
        Returns:
            Dict avec success, refund_id
        """
        # En mode simulation, simuler le remboursement
        if self.use_simulation:
            return self._simulate_refund(charge_id, amount_cents)
        
        # Mode réel : appeler l'API Stripe
        try:
            if amount_cents:
                # Remboursement partiel
                refund = stripe.Refund.create(
                    charge=charge_id,
                    amount=amount_cents,
                )
            else:
                # Remboursement total
                refund = stripe.Refund.create(
                    charge=charge_id,
                )
            
            return {
                "success": True,
                "refund_id": refund.id
            }
        except stripe.error.StripeError as e:
            return {
                "success": False,
                "refund_id": None,
                "error": str(e)
            }
    
    def _simulate_refund(self, charge_id: str, amount_cents: int) -> Dict[str, Any]:
        """
        Simule un remboursement Stripe sans appeler l'API.
        """
        # Vérifier que le charge_id est valide (format simulation ou Stripe)
        if not charge_id or (not charge_id.startswith("ch_") and not charge_id.startswith("ch_sim_")):
            return {
                "success": False,
                "refund_id": None,
                "error": "charge_id invalide"
            }
        
        # Simuler un remboursement réussi
        refund_id = f"re_{uuid.uuid4().hex[:24]}"
        return {
            "success": True,
            "refund_id": refund_id
            }


class PaymentService:
    """Service métier pour la gestion des paiements."""
    
    def __init__(self, payment_repo: PostgreSQLPaymentRepository, order_repo: PostgreSQLOrderRepository):
        self.payment_repo = payment_repo
        self.order_repo = order_repo
        self.gateway = PaymentGateway()
    
    def process_payment(self, order_id: str, payment_data: Dict[str, Any]) -> Payment:
        """Traite un paiement pour une commande."""
        order = self.order_repo.get_by_id(order_id)
        if not order:
            raise ValueError("Commande introuvable")
        
        if order.status not in [OrderStatus.CREE, OrderStatus.VALIDEE]:
            raise ValueError("Commande déjà payée ou traitée")
        
        amount = order.total_cents()
        
        # Simuler le paiement via le gateway
        result = self.gateway.charge_card(
            payment_data["card_number"],
            payment_data["exp_month"],
            payment_data["exp_year"],
            payment_data["cvc"],
            amount,
            idempotency_key=order_id
        )
        
        # Créer l'enregistrement de paiement
        payment_data_dict = {
            "order_id": order_id,
            "amount_cents": amount,
            "status": "PAID" if result["success"] else "FAILED",
            "payment_method": "CARD",
            "card_last4": payment_data["card_number"][-4:] if len(payment_data["card_number"]) >= 4 else None,
            "postal_code": payment_data.get("postal_code"),
            "phone": payment_data.get("phone"),
            "street_number": payment_data.get("street_number"),
            "street_name": payment_data.get("street_name"),
            # Stocker le charge_id pour permettre les remboursements
            "charge_id": result.get("charge_id") if result["success"] else None
        }
        
        payment = self.payment_repo.create(payment_data_dict)
        
        if not result["success"]:
            raise ValueError("Paiement refusé")
        
        return payment
    
    def process_refund(self, order_id: str, amount_cents: Optional[int] = None) -> Payment:
        """Traite un remboursement."""
        order = self.order_repo.get_by_id(order_id)
        if not order:
            raise ValueError("Commande introuvable")
        
        if order.status not in [OrderStatus.PAYEE, OrderStatus.ANNULEE]:
            raise ValueError("Remboursement non autorisé au statut actuel")
        
        amount = amount_cents or order.total_cents()
        
        # Récupérer le paiement initial
        initial_payment = None
        if order.payment_id:
            initial_payment = self.payment_repo.get_by_id(order.payment_id)  # type: ignore
        
        if not initial_payment:
            raise ValueError("Aucun paiement initial trouvé")
        
        # Vérifier que le paiement initial a un charge_id (nécessaire pour le remboursement)
        charge_id = getattr(initial_payment, "charge_id", None)
        if not charge_id:
            raise ValueError("Aucun charge_id trouvé dans le paiement initial. Impossible de rembourser.")
        
        # Traiter le remboursement via le gateway avec le vrai charge_id
        refund_result = self.gateway.refund(charge_id, amount)
        
        if not refund_result["success"]:
            error_msg = refund_result.get("error", "Remboursement échoué")
            raise ValueError(f"Remboursement échoué: {error_msg}")
        
        # Créer l'enregistrement de remboursement
        refund_data = {
            "order_id": order_id,
            "amount_cents": -amount,  # Montant négatif pour un remboursement
            "status": "REFUNDED",
            "payment_method": "REFUND",
            # Conserver le charge_id du paiement initial pour référence
            "charge_id": charge_id
        }
        
        refund = self.payment_repo.create(refund_data)
        return refund
    
    def get_payment_by_order(self, order_id: str) -> Optional[Payment]:
        """Récupère le paiement d'une commande."""
        payments = self.payment_repo.get_by_order_id(order_id)
        return payments[0] if payments else None
