# 🔓 Activer l'Accès aux APIs de Données de Carte Brutes dans Stripe

## ⚠️ Problème

Vous recevez l'erreur :
```
Sending credit card numbers directly to the Stripe API is generally unsafe. 
We suggest you use test tokens that map to the test card you are using.
```

## ✅ Solution : Activer l'Accès pour les Tests

Pour pouvoir envoyer directement les numéros de carte de test à l'API Stripe, vous devez activer cette fonctionnalité dans votre dashboard Stripe.

### Étapes :

1. **Connectez-vous** à votre [Dashboard Stripe](https://dashboard.stripe.com/test/dashboard)
   - Assurez-vous d'être en **mode Test** (bascule en haut à droite)

2. **Allez dans les Paramètres**
   - Cliquez sur **"Settings"** (Paramètres) dans le menu de gauche
   - Puis cliquez sur **"API"** dans le sous-menu

3. **Activez l'Accès aux APIs de Données de Carte Brutes**
   - Cherchez la section **"Raw card data APIs"** ou **"Enable raw card data APIs"**
   - Cochez la case pour **activer** cette fonctionnalité
   - ⚠️ **Note** : Cette fonctionnalité est uniquement disponible en mode **Test**

4. **Sauvegardez**
   - Cliquez sur **"Save"** ou **"Enregistrer"**

### Alternative : Utiliser Stripe Elements (Recommandé pour la Production)

Pour la production, Stripe recommande d'utiliser **Stripe Elements** côté frontend, qui crée des tokens sécurisés sans envoyer les numéros de carte directement au backend.

Cependant, pour les tests et le développement, activer l'accès aux APIs de données de carte brutes est la solution la plus simple.

## 🔍 Vérification

Après activation, testez un paiement avec la carte de test :
- **Numéro** : `4242424242424242`
- **Date d'expiration** : `12/2025` (ou toute date future)
- **CVC** : `123`

Le paiement devrait maintenant fonctionner.

## 📚 Documentation Stripe

- [Stripe Testing - Raw Card Data](https://stripe.com/docs/testing#raw-card-data)
- [Stripe Support - Enabling Raw Card Data APIs](https://support.stripe.com/questions/enabling-access-to-raw-card-data-apis)

## ⚠️ Important

- Cette fonctionnalité est **uniquement pour les tests**
- En production, utilisez **Stripe Elements** ou **Stripe Checkout** pour plus de sécurité
- Les numéros de carte ne doivent jamais être stockés sur votre serveur

