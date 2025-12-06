# Configuration Stripe pour les Paiements

Ce projet utilise **Stripe Test** pour simuler des paiements réels en mode développement et test.

## 🚀 Configuration Rapide

### 1. Créer un compte Stripe

1. Allez sur [https://dashboard.stripe.com/register](https://dashboard.stripe.com/register)
2. Créez un compte gratuit (mode test disponible immédiatement)

### 2. Récupérer vos clés API

1. Connectez-vous au [Dashboard Stripe](https://dashboard.stripe.com/test/apikeys)
2. Assurez-vous d'être en **mode Test** (bascule en haut à droite)
3. Copiez vos clés :
   - **Secret key** (commence par `sk_test_...`) → pour le backend ⚠️ **OBLIGATOIRE**
   - **Publishable key** (commence par `pk_test_...`) → pour le frontend (optionnel pour l'instant)
   
   💡 **Note** : Votre clé publique est déjà configurée dans `config.env.example`

### 3. Configurer les variables d'environnement

Ajoutez vos clés dans votre fichier de configuration :

**Pour le développement local :**
```bash
# Dans config.env ou .env
STRIPE_SECRET_KEY=sk_test_votre_cle_secrete_ici
STRIPE_PUBLISHABLE_KEY=pk_test_votre_cle_publique_ici
```

**Pour la production :**
```bash
# Dans config.env.production
STRIPE_SECRET_KEY=sk_live_votre_cle_secrete_production
STRIPE_PUBLISHABLE_KEY=pk_live_votre_cle_publique_production
```

⚠️ **Important** : Ne commitez JAMAIS vos clés API dans le dépôt Git !

## 🧪 Cartes de Test Stripe

Stripe fournit des cartes de test pour simuler différents scénarios :

### ✅ Paiements Réussis

| Numéro de carte | Description |
|----------------|-------------|
| `4242424242424242` | Carte Visa - Paiement réussi |
| `5555555555554444` | Carte Mastercard - Paiement réussi |
| `4000002500003155` | Carte nécessitant une authentification 3D Secure (réussie) |

### ❌ Paiements Refusés

| Numéro de carte | Description |
|----------------|-------------|
| `4000000000000002` | Carte refusée (générique) |
| `4000000000009995` | Fonds insuffisants |
| `4000000000000069` | Carte expirée |
| `4000000000000127` | Code CVC incorrect |

### 🔐 Authentification 3D Secure

| Numéro de carte | Description |
|----------------|-------------|
| `4000002500003155` | Nécessite 3D Secure (réussie) |
| `4000008400001629` | Nécessite 3D Secure (échouée) |

### 📝 Informations de Test

Pour toutes ces cartes :
- **Date d'expiration** : N'importe quelle date future (ex: 12/2025)
- **CVC** : N'importe quel code à 3 chiffres (ex: 123)
- **Code postal** : N'importe quel code postal valide (ex: 75001)

## 🔧 Installation

### 1. Installer la dépendance Stripe

```bash
cd ecommerce-backend
pip install -r requirements.txt
```

La dépendance `stripe==7.8.0` est déjà incluse dans `requirements.txt`.

### 2. Vérifier la configuration

Assurez-vous que votre fichier `.env` ou `config.env` contient :

```bash
STRIPE_SECRET_KEY=sk_test_...
```

### 3. Redémarrer le serveur backend

```bash
# Si vous utilisez uvicorn directement
uvicorn api:app --reload

# Ou via votre script de démarrage
./start.sh
```

## 📊 Vérifier les Paiements

Vous pouvez voir tous les paiements de test dans le [Dashboard Stripe](https://dashboard.stripe.com/test/payments) :

1. Allez dans **Payments** dans le menu de gauche
2. Tous les paiements de test apparaîtront avec leur statut
3. Vous pouvez voir les détails de chaque transaction

## 🔄 Remboursements

Les remboursements peuvent être effectués via le dashboard Stripe ou programmatiquement (fonctionnalité à venir).

## 🚨 Dépannage

### Erreur : "STRIPE_SECRET_KEY n'est pas configurée"

**Solution :** Vérifiez que vous avez bien ajouté `STRIPE_SECRET_KEY` dans votre fichier `.env` ou `config.env`.

### Erreur : "Invalid API Key"

**Solution :** 
- Vérifiez que vous utilisez une clé de **test** (commence par `sk_test_`)
- Vérifiez que la clé est complète et sans espaces
- Assurez-vous d'être en mode **Test** dans le dashboard Stripe

### Paiement toujours refusé

**Solution :** 
- Utilisez une carte de test valide (ex: `4242424242424242`)
- Vérifiez que la date d'expiration est dans le futur
- Vérifiez que le CVC est correct (3-4 chiffres)

## 📚 Documentation Stripe

- [Documentation Stripe Test](https://stripe.com/docs/testing)
- [Cartes de test Stripe](https://stripe.com/docs/testing#cards)
- [API Reference](https://stripe.com/docs/api)

## 🔒 Sécurité

- ⚠️ **Ne jamais** commiter vos clés API dans Git
- ⚠️ Utilisez des clés **test** pour le développement
- ⚠️ Utilisez des clés **live** uniquement en production
- ⚠️ Stockez les clés de production dans un gestionnaire de secrets sécurisé

## 🎯 Prochaines Étapes

1. ✅ Configuration Stripe Test
2. ✅ Intégration des paiements
3. 🔄 Intégration des remboursements (à venir)
4. 🔄 Webhooks Stripe pour les notifications (optionnel)

