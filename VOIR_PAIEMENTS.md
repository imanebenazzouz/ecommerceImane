# 📊 Où Voir Vos Paiements

## 🔍 Mode Simulation (Actuel)

En mode simulation (`STRIPE_USE_SIMULATION=true`), les paiements **ne sont PAS envoyés à Stripe**. 

### ✅ Où voir vos paiements en mode simulation :

1. **Dans votre application web** :
   - Allez dans la page **"Mes Commandes"** (`/orders`)
   - Vous verrez toutes vos commandes avec leur statut de paiement
   - Cliquez sur une commande pour voir les détails

2. **Dans votre base de données locale** :
   - Table `payments` : contient tous les paiements
   - Table `orders` : contient toutes les commandes avec leur statut

3. **Dans les logs du backend** :
   - Les paiements sont loggés dans la console du serveur

### ❌ Ce que vous NE verrez PAS :
- ❌ Rien dans le [Dashboard Stripe](https://dashboard.stripe.com/test/payments)
- ❌ Aucune transaction dans Stripe (normal, on simule)

---

## 🌐 Mode Stripe Réel

Si vous voulez voir les paiements dans votre dashboard Stripe :

### 1. Activer l'API Stripe réelle

Dans `config.env`, changez :
```bash
STRIPE_USE_SIMULATION=false
```

### 2. Activer les APIs de cartes brutes (si possible)

1. Allez sur https://dashboard.stripe.com/test/settings/api
2. Activez "Raw card data APIs" (si disponible pour votre compte)

### 3. Redémarrer le backend

```bash
./start.sh backend
```

### 4. Tester un paiement

Les paiements apparaîtront maintenant dans :
- ✅ [Dashboard Stripe - Paiements](https://dashboard.stripe.com/test/payments)
- ✅ [Dashboard Stripe - Logs API](https://dashboard.stripe.com/test/logs)
- ✅ Votre application web
- ✅ Votre base de données locale

---

## 📋 Résumé

| Mode | Dashboard Stripe | Application Web | Base de Données |
|------|-----------------|-----------------|-----------------|
| **Simulation** (actuel) | ❌ Non | ✅ Oui | ✅ Oui |
| **Stripe Réel** | ✅ Oui | ✅ Oui | ✅ Oui |

---

## 💡 Recommandation

Pour les **tests et le développement**, le mode simulation est parfait :
- ✅ Pas besoin d'activer les APIs de cartes brutes
- ✅ Fonctionne immédiatement
- ✅ Tous les paiements sont enregistrés localement
- ✅ Vous pouvez tester tous les scénarios

Pour la **production**, utilisez le mode Stripe réel avec Stripe Elements (plus sécurisé).

