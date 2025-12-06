# 🔑 Configuration de vos Clés Stripe

## ✅ Clé Publique Configurée

Votre clé publique Stripe a été ajoutée dans `config.env.example` :
```
STRIPE_PUBLISHABLE_KEY=pk_test_51SauUURy0OoD0wERFXpCp9S6CElWeD0eMclN7FUq3woMDxCsiOhCobWVPpzu6SMO3jWfBDFn4kGgQkh1ZftVPoNR002qWuU9CV
```

## ⚠️ Action Requise : Obtenir votre Clé Secrète

Pour que les paiements fonctionnent, vous avez **BESOIN** de votre clé secrète Stripe.

### Comment obtenir votre clé secrète :

1. **Connectez-vous** à votre [Dashboard Stripe](https://dashboard.stripe.com/test/apikeys)
2. Assurez-vous d'être en **mode Test** (bascule en haut à droite)
3. Dans la section **"Secret key"**, cliquez sur **"Reveal test key"** ou **"Reveal"**
4. **Copiez** la clé qui commence par `sk_test_...`

### Configuration :

1. **Créez un fichier `.env`** à la racine du projet (ou dans `ecommerce-backend/`) :
   ```bash
   cd /Users/imanebenazzouz/Desktop/ecommerce
   cp config.env.example .env
   ```

2. **Éditez le fichier `.env`** et ajoutez votre clé secrète :
   ```bash
   STRIPE_SECRET_KEY=sk_test_votre_cle_secrete_ici
   STRIPE_PUBLISHABLE_KEY=pk_test_51SauUURy0OoD0wERFXpCp9S6CElWeD0eMclN7FUq3woMDxCsiOhCobWVPpzu6SMO3jWfBDFn4kGgQkh1ZftVPoNR002qWuU9CV
   ```

3. **Redémarrez votre serveur backend** pour que les changements prennent effet.

## 🧪 Tester les Paiements

Une fois configuré, vous pouvez tester avec ces cartes :

- **✅ Succès** : `4242424242424242`
- **❌ Refusée** : `4000000000000002`
- **💰 Fonds insuffisants** : `4000000000009995`

**Date d'expiration** : N'importe quelle date future (ex: 12/2025)  
**CVC** : N'importe quel code à 3 chiffres (ex: 123)

## 📍 Où trouver vos clés Stripe

- **Dashboard Stripe** : https://dashboard.stripe.com/test/apikeys
- **Documentation** : https://stripe.com/docs/keys

## 🔒 Sécurité

⚠️ **IMPORTANT** :
- Ne commitez **JAMAIS** votre fichier `.env` dans Git
- Ne partagez **JAMAIS** votre clé secrète (`sk_test_...`)
- La clé publique (`pk_test_...`) peut être partagée (elle est visible côté client)

## ✅ Vérification

Pour vérifier que tout fonctionne :

1. Assurez-vous que `STRIPE_SECRET_KEY` est bien défini dans votre `.env`
2. Redémarrez le serveur backend
3. Essayez un paiement avec la carte de test `4242424242424242`
4. Vérifiez les paiements dans votre [Dashboard Stripe](https://dashboard.stripe.com/test/payments)

