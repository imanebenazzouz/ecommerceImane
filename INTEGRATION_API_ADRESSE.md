# 🌍 Intégration de l'API Adresse du Gouvernement Français

## 📋 Vue d'ensemble

L'application e-commerce utilise maintenant l'**API Adresse** (Base Adresse Nationale - BAN) du gouvernement français pour faciliter la saisie et la validation des adresses.

**API utilisée :** https://api-adresse.data.gouv.fr  
**Documentation officielle :** https://adresse.data.gouv.fr/api-doc/adresse

## ✨ Fonctionnalités

### 1. **Autocomplétion d'adresses**
- Recherche en temps réel pendant la saisie
- Suggestions basées sur la Base Adresse Nationale
- Remplissage automatique des champs (numéro, rue, code postal)

### 2. **Validation d'adresses**
- Vérification que l'adresse existe dans la base officielle
- Score de pertinence pour chaque résultat
- Données officielles et à jour

### 3. **Géolocalisation**
- Coordonnées GPS disponibles (si nécessaire pour la livraison)
- Informations de ville et code postal

## 🎯 Pages concernées

L'autocomplétion est intégrée dans :
- ✅ **Page d'inscription** (`/register`)
- ✅ **Page de profil** (`/profile`)
- ✅ **Page de paiement** (`/payment`)

## 📁 Fichiers créés/modifiés

### Nouveaux fichiers

1. **`ecommerce-front/src/utils/addressApi.js`**
   - Service pour interagir avec l'API Adresse
   - Fonctions : `searchAddresses()`, `validateAddress()`, `searchByPostalCode()`, etc.

2. **`ecommerce-front/src/components/AddressAutocomplete.jsx`**
   - Composant React réutilisable pour l'autocomplétion
   - Gestion des suggestions, navigation clavier, sélection

3. **`ecommerce-front/src/components/AddressAutocomplete.css`**
   - Styles pour le composant d'autocomplétion

### Fichiers modifiés

1. **`ecommerce-front/src/pages/Register.jsx`**
   - Ajout du composant `AddressAutocomplete`

2. **`ecommerce-front/src/pages/Profile.jsx`**
   - Ajout du composant `AddressAutocomplete`

3. **`ecommerce-front/src/pages/Payment.jsx`**
   - Ajout du composant `AddressAutocomplete`

## 🚀 Utilisation

### Pour les utilisateurs

1. **Recherche automatique** : Tapez au moins 3 caractères dans le champ de recherche
2. **Sélection** : Cliquez sur une suggestion ou utilisez les flèches + Entrée
3. **Remplissage automatique** : Les champs sont remplis automatiquement
4. **Saisie manuelle** : Toujours possible si l'adresse n'est pas trouvée

### Exemple d'utilisation

```
Utilisateur tape : "12 rue de la paix 75001"
↓
Suggestions affichées :
  - 12 Rue de la Paix, 75001 Paris
  - 12 Rue de la Paix, 75002 Paris
  ...
↓
Sélection d'une adresse
↓
Champs remplis automatiquement :
  - Numéro : 12
  - Rue : Rue de la Paix
  - Code postal : 75001
```

## 🔧 Configuration

### Limites de l'API

- **Limite de débit** : 50 appels par seconde par adresse IP
- **Pas d'authentification requise** : API publique et gratuite
- **Données** : Base Adresse Nationale officielle

### Personnalisation

Vous pouvez modifier les paramètres dans `addressApi.js` :

```javascript
// Nombre de résultats par défaut
searchAddresses(query, limit = 5)

// Score minimum pour validation
const isValid = bestMatch.score > 0.5;
```

## 📊 Structure des données

### Format de réponse de l'API

```json
{
  "features": [
    {
      "properties": {
        "label": "12 Rue de la Paix, 75001 Paris",
        "housenumber": "12",
        "street": "Rue de la Paix",
        "postcode": "75001",
        "city": "Paris",
        "score": 0.95,
        "type": "housenumber"
      },
      "geometry": {
        "coordinates": [2.3312, 48.8686]
      }
    }
  ]
}
```

### Format utilisé dans l'application

```javascript
{
  label: "12 Rue de la Paix, 75001 Paris",
  streetNumber: "12",
  streetName: "Rue de la Paix",
  postalCode: "75001",
  city: "Paris",
  coordinates: [2.3312, 48.8686],
  score: 0.95
}
```

## 🎨 Interface utilisateur

### Composant d'autocomplétion

- **Champ de recherche** : Recherche en temps réel avec debounce (300ms)
- **Liste de suggestions** : Affichage avec score de pertinence
- **Navigation clavier** : Flèches haut/bas, Entrée, Échap
- **Indicateur de chargement** : Affichage pendant la recherche
- **Message si aucun résultat** : Possibilité de saisie manuelle

### Styles

- Suggestions avec hover et sélection clavier
- Scrollbar personnalisée
- Responsive et accessible

## 🔒 Sécurité et confidentialité

- ✅ **Pas de données sensibles** : Seulement des adresses publiques
- ✅ **API officielle** : Service gouvernemental sécurisé
- ✅ **Pas de stockage** : Les recherches ne sont pas enregistrées
- ✅ **HTTPS** : Communication sécurisée

## 🐛 Gestion des erreurs

- **Erreur réseau** : Affichage silencieux, possibilité de saisie manuelle
- **Aucun résultat** : Message informatif, saisie manuelle toujours possible
- **API indisponible** : L'application continue de fonctionner normalement

## 📈 Améliorations futures possibles

1. **Cache des résultats** : Réduire les appels API pour les recherches fréquentes
2. **Géolocalisation** : Utiliser les coordonnées GPS pour la livraison
3. **Validation côté serveur** : Vérifier les adresses avant enregistrement
4. **Historique** : Sauvegarder les adresses récemment utilisées
5. **Recherche par géolocalisation** : Trouver des adresses proches

## 📚 Ressources

- **Documentation API** : https://adresse.data.gouv.fr/api-doc/adresse
- **Conditions d'utilisation** : https://adresse.data.gouv.fr/cgu
- **Base Adresse Nationale** : https://www.data.gouv.fr/fr/datasets/base-adresse-nationale/

## ✅ Tests

Pour tester l'intégration :

1. Aller sur la page d'inscription
2. Commencer à taper une adresse dans le champ de recherche
3. Vérifier que les suggestions apparaissent
4. Sélectionner une adresse
5. Vérifier que les champs sont remplis automatiquement

## 🎉 Avantages

- ✅ **Meilleure expérience utilisateur** : Saisie facilitée
- ✅ **Données officielles** : Adresses validées par le gouvernement
- ✅ **Réduction des erreurs** : Moins de fautes de saisie
- ✅ **Gratuit** : Pas de coût supplémentaire
- ✅ **Fiable** : Service gouvernemental stable

---

*Documentation créée le : Décembre 2025*

