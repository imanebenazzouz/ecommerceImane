# 🧪 Tester Stripe - Guide Rapide

## ✅ Configuration Terminée

Votre fichier `config.env` est configuré avec vos clés Stripe :
- ✅ Clé secrète : `sk_test_...`
- ✅ Clé publique : `pk_test_...`

## 🚀 Démarrer le Backend

Le backend va maintenant charger automatiquement `config.env` au démarrage.

```bash
cd ecommerce-backend
source venv/bin/activate  # Si vous utilisez un venv
uvicorn api:app --reload
```

Ou utilisez le script de démarrage :
```bash
./start.sh backend
```

## 💳 Tester un Paiement

1. **Connectez-vous** à votre application
2. **Ajoutez des produits** au panier
3. **Passez commande** (checkout)
4. **Utilisez une carte de test Stripe** :

### Cartes de Test

| Numéro de carte | Résultat | Description |
|----------------|----------|------------|
| `4242424242424242` | ✅ Succès | Carte Visa valide |
| `5555555555554444` | ✅ Succès | Carte Mastercard valide |
| `4000000000000002` | ❌ Refusée | Carte refusée (générique) |
| `4000000000009995` | ❌ Refusée | Fonds insuffisants |
| `4000000000000069` | ❌ Refusée | Carte expirée |

**Informations à utiliser :**
- **Date d'expiration** : N'importe quelle date future (ex: `12/2025`)
- **CVC** : N'importe quel code à 3 chiffres (ex: `123`)
- **Code postal** : N'importe quel code postal valide (ex: `75001`)

## 🔍 Vérifier les Paiements

Tous les paiements de test apparaîtront dans votre [Dashboard Stripe](https://dashboard.stripe.com/test/payments) :

1. Allez sur https://dashboard.stripe.com/test/payments
2. Vous verrez tous les paiements effectués avec les cartes de test
3. Vous pouvez voir les détails de chaque transaction

## ⚠️ Dépannage

### Erreur : "STRIPE_SECRET_KEY n'est pas configurée"

**Solution :**
1. Vérifiez que `config.env` existe à la racine du projet
2. Vérifiez que `STRIPE_SECRET_KEY` est bien défini dans `config.env`
3. Redémarrez le serveur backend

### Le paiement ne fonctionne pas

**Vérifications :**
1. Le backend est-il démarré ? (http://localhost:8000)
2. Les clés Stripe sont-elles correctes dans `config.env` ?
3. Utilisez-vous une carte de test valide (`4242424242424242`) ?
4. Consultez les logs du backend pour voir les erreurs

### Voir les logs Stripe

Les erreurs Stripe apparaîtront dans :
- Les logs du backend (console)
- Le dashboard Stripe (section "Logs" > "API logs")

## 📚 Ressources

- [Documentation Stripe Test](https://stripe.com/docs/testing)
- [Cartes de test Stripe](https://stripe.com/docs/testing#cards)
- [Dashboard Stripe](https://dashboard.stripe.com/test/dashboard)

