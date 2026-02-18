# Configuration Stripe

Ce projet utilise **Stripe** pour les paiements par carte. Le backend peut fonctionner en **mode simulation** (sans appeler Stripe) ou en **mode réel** (API Stripe).

---

## 1. Variables d'environnement

À définir dans `config.env` (développement) ou dans votre fichier d’environnement de production.

| Variable | Obligatoire | Description |
|----------|-------------|-------------|
| `STRIPE_SECRET_KEY` | Oui (sauf simulation) | Clé secrète API Stripe (`sk_test_...` en test, `sk_live_...` en prod). |
| `STRIPE_PUBLISHABLE_KEY` | Non (pour l’instant) | Clé publique (`pk_test_...` / `pk_live_...`) pour un futur usage frontend (Stripe Elements). |
| `STRIPE_USE_SIMULATION` | Non | `true` = simulation locale (défaut), `false` = vrais appels Stripe. |

---

## 2. Où trouver les clés Stripe

1. Créez un compte : [https://dashboard.stripe.com/register](https://dashboard.stripe.com/register)
2. Allez dans **Developers** → **API keys** : [https://dashboard.stripe.com/test/apikeys](https://dashboard.stripe.com/test/apikeys)
3. En **mode test** (recommandé au début) :
   - **Secret key** : `sk_test_...` → à mettre dans `STRIPE_SECRET_KEY`
   - **Publishable key** : `pk_test_...` → optionnel pour l’instant
4. En **production**, basculez sur **Live** et utilisez `sk_live_...` et `pk_live_...`.

Ne commitez jamais vos clés secrètes. Utilisez `config.env` (ignoré par Git) ou un gestionnaire de secrets en production.

---

## 3. Mode simulation vs mode réel

### Mode simulation (`STRIPE_USE_SIMULATION=true`)

- Aucun appel à l’API Stripe.
- Comportement basé sur les [cartes de test Stripe](https://docs.stripe.com/testing#cards) :
  - **4242 4242 4242 4242** (ou 5555 5555 5555 4444) → paiement accepté
  - Carte se terminant par **0000** → refus
  - Autres numéros valides (Luhn) → acceptés en simulation

Idéal pour le développement sans compte Stripe ou sans activer les options avancées.

### Mode réel (`STRIPE_USE_SIMULATION=false`)

- Les paiements sont traités par Stripe.
- `STRIPE_SECRET_KEY` doit être défini (clé test ou live).
- Avec les clés **test**, seules les [cartes de test Stripe](https://docs.stripe.com/testing#cards) fonctionnent.

En production, utilisez les clés **Live** et désactivez la simulation.

---

## 4. Exemple `config.env` (développement)

```env
# Stripe
STRIPE_SECRET_KEY=sk_test_VOTRE_CLE_SECRETE
STRIPE_PUBLISHABLE_KEY=pk_test_VOTRE_CLE_PUBLIQUE
STRIPE_USE_SIMULATION=true
```

Pour tester l’API Stripe en dev, mettez `STRIPE_USE_SIMULATION=false` et utilisez une clé `sk_test_...`.

---

## 5. Cartes de test Stripe (mode test)

| Numéro | Résultat |
|--------|----------|
| 4242 4242 4242 4242 | Succès |
| 5555 5555 5555 4444 | Succès (Mastercard) |
| 4000 0000 0000 0002 | Carte refusée |
| 4000 0000 0000 9995 | Fonds insuffisants |
| 4000 0000 0000 0069 | Carte expirée |

Date d’expiration : toute date future. CVV : 3 chiffres (ex. 123).

---

## 6. Fichiers concernés

- **Backend** : `ecommerce-backend/services/payment_service.py` (PaymentGateway, charge_card, refund)
- **API** : `ecommerce-backend/api.py` (route de paiement qui appelle le gateway)
- **Config** : `config.env` (dev), `config.env.production` (prod)

Une fois `STRIPE_SECRET_KEY` et éventuellement `STRIPE_USE_SIMULATION` configurés, les paiements et remboursements utilisent Stripe selon le mode choisi.

---

## 7. Vérifier que Stripe fonctionne

Depuis la racine du projet :

```bash
PYTHONPATH=ecommerce-backend python3 ecommerce-backend/scripts/test_stripe.py
```

Le script vérifie la configuration, teste le mode simulation, puis tente (si possible) un appel API réel.

**Important** : Par défaut, Stripe n’accepte pas l’envoi direct des numéros de carte à l’API (« raw card data »). Avec un compte standard, seul le **mode simulation** est utilisé. Pour des paiements réels via l’API avec numéro de carte côté serveur, il faut demander l’activation des « Raw card data APIs » dans le support Stripe, ou migrer vers **Stripe Elements** (saisie carte côté frontend, token envoyé au backend).

---

## 8. Stripe Checkout (recommandé — paiements visibles dans le Dashboard)

Le projet propose aussi un flux **Stripe Checkout** : l’utilisateur clique sur « Payer avec Stripe », est redirigé vers la page de paiement hébergée par Stripe, paie, puis est renvoyé sur votre site. **Les paiements apparaissent dans le Dashboard Stripe** sans avoir à activer les APIs « raw card data ».

### Contrôleurs / Endpoints

| Endpoint | Rôle |
|----------|------|
| `POST /orders/{order_id}/create-checkout-session` | Crée une session Checkout Stripe et retourne l’URL de redirection. |
| `GET /orders/stripe-verify-session?session_id=...` | Après paiement : vérifie la session côté Stripe et finalise la commande (statut PAYEE, enregistrement du paiement). |

### Gestion des erreurs (API)

- **missing_key** : `STRIPE_SECRET_KEY` non configurée (réponse 500).
- **invalid_course / invalid_session** : session ou commande invalide (404).
- **stripe_api** : erreur lors de l’appel à l’API Stripe (502).
- **session_failed** : la session Checkout n’a pas pu être créée (ex. URL de redirection vide).
- **payment_not_completed** : la session n’est pas en état « paid » (402).

### Configuration requise

- `STRIPE_SECRET_KEY` dans `config.env` (ou variable d’environnement).
- `FRONTEND_URL` pour les URLs de retour (ex. `http://localhost:5173` en dev).

Voir aussi `docs/setenv.sh.example` pour un exemple de configuration des variables d’environnement.
