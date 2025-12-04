# Tests de Validation

Ce dossier contient uniquement des tests pour les fonctions de validation.

## Tests Backend (Python)

Les tests sont dans `test_validations.py` et testent toutes les fonctions de `ecommerce-backend/utils/validations.py`.

### Lancer les tests backend

```bash
cd /Users/imanebenazzouz/Desktop/ecommerce
python3 -m pytest tests/test_validations.py -v
```

### Tests couverts

- ✅ `sanitize_numeric` - Nettoyage des caractères non numériques
- ✅ `validate_luhn` - Algorithme de Luhn pour les cartes bancaires
- ✅ `validate_card_number` - Validation des numéros de carte (13-19 chiffres + Luhn)
- ✅ `validate_cvv` - Validation CVV (3 ou 4 chiffres)
- ✅ `validate_expiry_month` - Validation mois (1-12)
- ✅ `validate_expiry_year` - Validation année (2000-2100)
- ✅ `validate_expiry_date` - Validation date complète (doit être future)
- ✅ `validate_postal_code` - Validation code postal français (5 chiffres)
- ✅ `validate_phone` - Validation téléphone français (10 chiffres, commence par 01-09)
- ✅ `validate_street_number` - Validation numéro de rue (chiffres uniquement)
- ✅ `validate_street_name` - Validation nom de rue (3-100 caractères, lettres/chiffres/espaces/tirets)
- ✅ `validate_quantity` - Validation quantité (entier >= 1)

## Tests Frontend (JavaScript)

Les tests sont dans `ecommerce-front/src/utils/validations.test.js` et testent toutes les fonctions de `ecommerce-front/src/utils/validations.js`.

### Lancer les tests frontend

```bash
cd ecommerce-front
npm test
```

ou avec vitest directement :

```bash
npm run test:unit
```

### Tests couverts

- ✅ `sanitizeNumeric` - Nettoyage des caractères non numériques
- ✅ `isValidLuhn` - Algorithme de Luhn
- ✅ `validateCardNumber` - Validation numéro de carte
- ✅ `validateCVV` - Validation CVV
- ✅ `validateExpiryMonth` - Validation mois
- ✅ `validateExpiryYear` - Validation année
- ✅ `validateExpiryDate` - Validation date complète
- ✅ `validatePostalCode` - Validation code postal
- ✅ `validatePhone` - Validation téléphone
- ✅ `validateStreetNumber` - Validation numéro de rue
- ✅ `validateStreetName` - Validation nom de rue
- ✅ `validateName` - Validation nom/prénom
- ✅ `validateAddress` - Validation adresse complète
- ✅ `buildFullAddress` - Reconstruction d'adresse
- ✅ `parseAddress` - Parsing d'adresse
- ✅ `validateQuantity` - Validation quantité

## Structure des tests

Chaque fonction de validation est testée avec :
- ✅ **Cas valides** : valeurs correctes qui doivent passer
- ✅ **Cas invalides** : valeurs incorrectes qui doivent être rejetées
- ✅ **Cas limites** : valeurs aux limites (min, max, etc.)
- ✅ **Cas d'erreur** : types incorrects, valeurs nulles, etc.

## Objectif

Ces tests garantissent que toutes les validations sont **strictes** et **cohérentes** entre le frontend et le backend, assurant une sécurité et une expérience utilisateur optimales.

