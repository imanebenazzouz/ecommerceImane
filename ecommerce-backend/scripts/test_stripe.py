#!/usr/bin/env python3
"""
Test Stripe pour l'app :
1. Vérifie la config (clé secrète, mode simulation).
2. Teste le mode simulation (toujours disponible).
3. Si STRIPE_USE_SIMULATION=false, tente un vrai appel API (nécessite "raw card data" activé sur le compte Stripe).

À lancer depuis la racine du repo :
  PYTHONPATH=ecommerce-backend python3 ecommerce-backend/scripts/test_stripe.py
"""
import os
import sys
from pathlib import Path

repo_root = Path(__file__).resolve().parent.parent
config_env = repo_root / "config.env"
if config_env.exists():
    from dotenv import load_dotenv
    load_dotenv(dotenv_path=config_env)

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from services.payment_service import PaymentGateway


def main():
    print("=== Vérification Stripe (test) ===\n")
    sk = os.getenv("STRIPE_SECRET_KEY", "")
    print("1. Configuration")
    print("   STRIPE_SECRET_KEY définie:", sk.startswith("sk_test_") or sk.startswith("sk_live_"))
    if not sk:
        print("   ERREUR: Définissez STRIPE_SECRET_KEY dans config.env")
        return 1

    try:
        gateway = PaymentGateway()
    except ValueError as e:
        print("   ERREUR:", e)
        return 1
    print("   Mode simulation (config):", os.getenv("STRIPE_USE_SIMULATION", "true"))
    print()

    # Test 1 : mode simulation (comportement actuel de l'app avec STRIPE_USE_SIMULATION=true)
    print("2. Test mode simulation (carte 4242..., 1.00 EUR)")
    os.environ["STRIPE_USE_SIMULATION"] = "true"
    gateway_sim = PaymentGateway()
    result_sim = gateway_sim.charge_card(
        card_number="4242424242424242",
        exp_month=12,
        exp_year=2030,
        cvc="123",
        amount_cents=100,
        idempotency_key="test-stripe-sim-" + str(os.getpid()),
    )
    if result_sim.get("success"):
        print("   OK Simulation : paiement accepté (charge_id simulé).")
    else:
        print("   ÉCHEC simulation:", result_sim.get("failure_reason"))
        return 1
    print()

    # Test 2 : appel API Stripe réel (optionnel)
    print("3. Test API Stripe réelle (si activée sur le compte)")
    os.environ["STRIPE_USE_SIMULATION"] = "false"
    gateway_real = PaymentGateway()
    result_real = gateway_real.charge_card(
        card_number="4242424242424242",
        exp_month=12,
        exp_year=2030,
        cvc="123",
        amount_cents=100,
        idempotency_key="test-stripe-real-" + str(os.getpid()),
    )
    if result_real.get("success"):
        print("   OK API Stripe : paiement test réussi.")
        print("   charge_id:", result_real.get("charge_id") or result_real.get("transaction_id"))
    else:
        reason = result_real.get("failure_reason", "")
        if "raw card" in reason.lower() or "unsafe" in reason.lower():
            print("   Info: Stripe n’accepte pas l’envoi direct des numéros de carte sur ce compte.")
            print("   L’app fonctionne en mode simulation (STRIPE_USE_SIMULATION=true).")
            print("   Pour des paiements réels, activez « Raw card data APIs » ou utilisez Stripe Elements.")
        else:
            print("   Échec API:", reason)
    print()
    print("=== Résumé ===")
    print("Stripe (test) est opérationnel pour votre app en mode simulation.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
