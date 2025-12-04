# 🚀 Guide de Prise en Main du Projet E-Commerce

> **Pour les nouveaux développeurs**  
> Ce guide vous accompagne étape par étape pour comprendre et démarrer le projet

---

## 📋 Table des Matières

1. [Introduction](#1-introduction)
2. [Prérequis](#2-prérequis)
3. [Installation](#3-installation)
4. [Configuration Initiale](#4-configuration-initiale)
5. [Démarrage du Projet](#5-démarrage-du-projet)
6. [Structure du Projet](#6-structure-du-projet)
7. [Workflow de Développement](#7-workflow-de-développement)
8. [Tests](#8-tests)
9. [Déploiement](#9-déploiement)
10. [Troubleshooting](#10-troubleshooting)
11. [Conventions de Code](#11-conventions-de-code)
12. [Ressources et Documentation](#12-ressources-et-documentation)

---

## 1. Introduction

### 🎯 Qu'est-ce que ce projet ?

Application e-commerce full-stack complète avec :
- **Backend** : API REST avec FastAPI (Python 3.13)
- **Frontend** : Application React 19 avec Vite
- **Base de données** : PostgreSQL (production) / SQLite (développement)
- **Infrastructure** : Docker, Nginx

### ✨ Fonctionnalités Principales

- 🔐 Authentification et autorisation (JWT)
- 🛍️ Catalogue de produits
- 🛒 Gestion du panier
- 💳 Paiement sécurisé
- 📦 Gestion des commandes
- 📄 Génération de factures PDF
- 💬 Support client (système de tickets)
- 👨‍💼 Espace administration

---

## 2. Prérequis

### Outils Requis

Avant de commencer, assurez-vous d'avoir installé :

#### Obligatoires
- ✅ **Python 3.13** (ou 3.8+) - [Télécharger](https://www.python.org/downloads/)
- ✅ **Node.js 16+** - [Télécharger](https://nodejs.org/)
- ✅ **PostgreSQL 12+** - [Télécharger](https://www.postgresql.org/download/)
- ✅ **Git** - [Télécharger](https://git-scm.com/)

#### Optionnels (mais recommandés)
- 🐳 **Docker & Docker Compose** - [Télécharger](https://www.docker.com/)
- 📝 **VS Code** (ou votre IDE préféré)
- 🌐 **Postman** (pour tester l'API)

### Vérification des Prérequis

```bash
# Vérifier Python
python3 --version  # Doit afficher Python 3.8 ou supérieur

# Vérifier Node.js
node --version     # Doit afficher v16 ou supérieur
npm --version      # Doit afficher la version npm

# Vérifier PostgreSQL
psql --version     # Doit afficher PostgreSQL 12 ou supérieur

# Vérifier Git
git --version      # Doit afficher la version Git

# Vérifier Docker (optionnel)
docker --version   # Doit afficher la version Docker
docker-compose --version  # Doit afficher la version Docker Compose
```

---

## 3. Installation

### Étape 1 : Cloner le Projet

```bash
# Cloner le repository
git clone <url-du-repository>
cd ecommerce

# Vérifier que vous êtes sur la bonne branche
git branch
```

### Étape 2 : Configuration de l'Environnement

```bash
# Copier les fichiers de configuration d'exemple
cp config.env.example config.env
cp ecommerce-backend/config_email.sh.example ecommerce-backend/config_email.sh

# Éditer les fichiers de configuration avec vos valeurs
# (voir section Configuration Initiale ci-dessous)
```

### Étape 3 : Installation des Dépendances Backend

```bash
cd ecommerce-backend

# Créer un environnement virtuel Python
python3 -m venv venv

# Activer l'environnement virtuel
# Sur macOS/Linux :
source venv/bin/activate
# Sur Windows :
# venv\Scripts\activate

# Installer les dépendances
pip install --upgrade pip
pip install -r requirements.txt
# OU si vous utilisez Python 3.13 :
pip install -r requirements_python313.txt
```

### Étape 4 : Installation des Dépendances Frontend

```bash
cd ../ecommerce-front

# Installer les dépendances Node.js
npm install
```

### Étape 5 : Configuration de la Base de Données

#### Option A : PostgreSQL (Recommandé pour production)

```bash
# Démarrer PostgreSQL avec Docker
docker-compose up -d postgres

# OU installer PostgreSQL localement et créer la base
createdb ecommerce
```

#### Option B : SQLite (Pour développement rapide)

```bash
# SQLite est utilisé par défaut si PostgreSQL n'est pas disponible
# Aucune configuration supplémentaire nécessaire
```

---

## 4. Configuration Initiale

### Variables d'Environnement Backend

Éditez `config.env` ou `ecommerce-backend/config.env.production` :

```bash
# Base de données
DATABASE_URL=postgresql://ecommerce:ecommerce123@localhost:5432/ecommerce
# OU pour SQLite (développement) :
# DATABASE_URL=sqlite:///./ecommerce.db

# Sécurité (IMPORTANT : Changez ces valeurs en production !)
SECRET_KEY=votre-cle-secrete-super-longue-et-complexe
JWT_SECRET_KEY=votre-cle-jwt-secrete
ACCESS_TOKEN_EXPIRE_MINUTES=30

# API
API_HOST=0.0.0.0
API_PORT=8000
DEBUG=True

# CORS (origines autorisées)
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

### Variables d'Environnement Frontend

Créez un fichier `.env` dans `ecommerce-front/` :

```bash
# URL de l'API backend
VITE_API_BASE=http://localhost:8000
```

### Configuration Email (Optionnel)

Pour activer l'envoi d'emails, configurez Brevo (ex-Sendinblue) :

```bash
cd ecommerce-backend
./config_email.sh

# Suivez les instructions pour :
# 1. Créer un compte sur https://app.brevo.com
# 2. Obtenir une clé API
# 3. Configurer l'expéditeur
```

---

## 5. Démarrage du Projet

### Méthode 1 : Script Automatique (Recommandé)

```bash
# Depuis la racine du projet
./start.sh

# Ou démarrer séparément :
./start.sh backend   # Démarrer uniquement l'API
./start.sh frontend  # Démarrer uniquement React
./start.sh all       # Démarrer les deux (défaut)
```

### Méthode 2 : Démarrage Manuel

#### Backend

```bash
cd ecommerce-backend

# Activer l'environnement virtuel
source venv/bin/activate  # macOS/Linux
# OU
venv\Scripts\activate     # Windows

# Initialiser la base de données (première fois uniquement)
python init_db.py

# Démarrer l'API
uvicorn api:app --host 0.0.0.0 --port 8000 --reload
```

L'API sera accessible sur : **http://localhost:8000**
- Documentation Swagger : http://localhost:8000/docs
- Documentation ReDoc : http://localhost:8000/redoc

#### Frontend

```bash
cd ecommerce-front

# Démarrer le serveur de développement
npm run dev
```

Le frontend sera accessible sur : **http://localhost:5173**

### Vérification

Une fois démarré, vous devriez voir :
- ✅ Backend : `Uvicorn running on http://0.0.0.0:8000`
- ✅ Frontend : `VITE ready in XXX ms` + URL locale

### Comptes de Test

Une fois l'application démarrée, vous pouvez vous connecter avec :

| Rôle | Email | Mot de passe |
|------|-------|--------------|
| **Admin** | `admin@example.com` | `admin123` |
| **Client** | `client@example.com` | `secret` |

Ces comptes sont créés automatiquement lors de l'initialisation de la base de données.

### Cartes Bancaires de Test

Pour tester les paiements :

| Type | Numéro | CVV | Expiration |
|------|--------|-----|------------|
| ✅ **Valide** | `4111111111111111` | `123` | `12/2030` |
| ❌ **Invalide** | `4242424242424240` | `123` | `12/2030` |

---

## 6. Structure du Projet

```
ecommerce/
├── ecommerce-backend/          # Backend FastAPI
│   ├── api.py                  # ⭐ Point d'entrée API (tous les endpoints)
│   ├── database/
│   │   ├── models.py          # Modèles SQLAlchemy (tables DB)
│   │   ├── database.py        # Configuration connexion DB
│   │   └── repositories_simple.py  # Accès aux données (CRUD)
│   ├── services/              # Services métier
│   │   ├── auth_service.py    # Authentification JWT
│   │   ├── cart_service.py    # Gestion panier
│   │   ├── catalog_service.py # Gestion catalogue
│   │   ├── order_service.py   # Gestion commandes
│   │   ├── payment_service.py # Paiements
│   │   ├── delivery_service.py # Livraisons
│   │   ├── billing_service.py # Factures
│   │   └── email_service.py   # Envoi emails
│   ├── utils/
│   │   └── validations.py     # Validations (Luhn, etc.)
│   ├── requirements.txt       # Dépendances Python
│   ├── init_db.py            # Script initialisation DB
│   └── Dockerfile.prod       # Image Docker production
│
├── ecommerce-front/           # Frontend React
│   ├── src/
│   │   ├── pages/            # Pages React (routes)
│   │   │   ├── Catalog.jsx  # Catalogue produits
│   │   │   ├── Cart.jsx     # Panier
│   │   │   ├── Orders.jsx   # Commandes
│   │   │   ├── Admin.jsx    # Espace admin
│   │   │   └── ...
│   │   ├── components/       # Composants réutilisables
│   │   │   ├── Header.jsx
│   │   │   ├── Footer.jsx
│   │   │   └── PaymentModal.jsx
│   │   ├── contexts/        # Contextes React
│   │   │   └── AuthContext.jsx  # État authentification
│   │   ├── lib/
│   │   │   └── api.js       # ⭐ Client API (toutes les requêtes)
│   │   └── utils/
│   │       └── validations.js  # Validations frontend
│   ├── package.json         # Dépendances Node.js
│   └── Dockerfile.prod      # Image Docker production
│
├── tests/                     # Tests automatisés
│   ├── test_validations.py   # Tests validation
│   └── conftest.py           # Configuration pytest
│
├── scripts/                   # Scripts utilitaires
│   ├── delete_all_orders.py
│   └── verification/         # Scripts de vérification
│
├── docker-compose.prod.yml   # Configuration Docker production
├── start.sh                  # Script démarrage développement
├── README.md                 # Documentation principale
├── PLAN_PRESENTATION.md      # Plan présentation
└── GUIDE_PRISE_EN_MAIN.md   # Ce fichier
```

### Fichiers Clés à Connaître

| Fichier | Description | Quand l'utiliser |
|---------|-------------|------------------|
| `ecommerce-backend/api.py` | Tous les endpoints API | Ajouter/modifier des routes |
| `ecommerce-backend/database/models.py` | Modèles de base de données | Modifier le schéma DB |
| `ecommerce-front/src/lib/api.js` | Client API frontend | Appeler le backend depuis React |
| `ecommerce-front/src/pages/*.jsx` | Pages React | Ajouter/modifier des pages |
| `start.sh` | Script de démarrage | Démarrer l'application |

---

## 7. Workflow de Développement

### Créer une Nouvelle Fonctionnalité

#### Exemple : Ajouter un nouvel endpoint API

1. **Définir le modèle** (si nécessaire) :
   ```python
   # ecommerce-backend/database/models.py
   class NewModel(Base):
       __tablename__ = "new_table"
       id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
       # ... autres colonnes
   ```

2. **Créer le repository** :
   ```python
   # ecommerce-backend/database/repositories_simple.py
   class PostgreSQLNewRepository:
       def create(self, data):
           # ... logique CRUD
   ```

3. **Créer le service métier** :
   ```python
   # ecommerce-backend/services/new_service.py
   class NewService:
       def process(self, data):
           # ... logique métier
   ```

4. **Ajouter l'endpoint** :
   ```python
   # ecommerce-backend/api.py
   @app.post("/new-endpoint")
   def new_endpoint(inp: NewIn, db: Session = Depends(get_db)):
       # ... logique endpoint
   ```

5. **Tester** :
   ```bash
   # Tester avec curl ou Postman
   curl -X POST http://localhost:8000/new-endpoint \
     -H "Content-Type: application/json" \
     -d '{"data": "value"}'
   ```

#### Exemple : Ajouter une nouvelle page React

1. **Créer la page** :
   ```javascript
   // ecommerce-front/src/pages/NewPage.jsx
   import { useState } from 'react';
   import { api } from '../lib/api';
   
   function NewPage() {
     const [data, setData] = useState(null);
     
     const fetchData = async () => {
       const result = await api.someEndpoint();
       setData(result);
     };
     
     return (
       <div>
         <h1>Nouvelle Page</h1>
         {/* ... */}
       </div>
     );
   }
   
   export default NewPage;
   ```

2. **Ajouter la route** :
   ```javascript
   // ecommerce-front/src/App.jsx
   import NewPage from './pages/NewPage';
   
   // Dans les routes :
   <Route path="/new" element={<NewPage />} />
   ```

3. **Ajouter l'appel API** (si nécessaire) :
   ```javascript
   // ecommerce-front/src/lib/api.js
   async function someEndpoint() {
     return request("/new-endpoint", {
       method: "POST",
       body: JSON.stringify({ /* ... */ }),
     });
   }
   ```

### Workflow Git

```bash
# 1. Créer une branche pour votre feature
git checkout -b feature/ma-nouvelle-fonctionnalite

# 2. Faire vos modifications
# ... éditer les fichiers ...

# 3. Vérifier les changements
git status
git diff

# 4. Ajouter les fichiers modifiés
git add .

# 5. Commit avec un message clair
git commit -m "feat: ajout de la fonctionnalité X"

# 6. Pousser vers le repository
git push origin feature/ma-nouvelle-fonctionnalite

# 7. Créer une Pull Request sur GitHub/GitLab
```

### Conventions de Commit

Utilisez le format [Conventional Commits](https://www.conventionalcommits.org/) :

- `feat:` : Nouvelle fonctionnalité
- `fix:` : Correction de bug
- `docs:` : Documentation
- `style:` : Formatage (pas de changement de code)
- `refactor:` : Refactoring
- `test:` : Ajout/modification de tests
- `chore:` : Tâches de maintenance

Exemples :
```bash
git commit -m "feat: ajout du système de remboursement"
git commit -m "fix: correction bug panier vide"
git commit -m "docs: mise à jour README"
```

---

## 8. Tests

### Lancer les Tests Backend

```bash
cd ecommerce-backend

# Activer l'environnement virtuel
source venv/bin/activate

# Lancer tous les tests
cd ..
python3 -m pytest tests/ -v

# Lancer un test spécifique
python3 -m pytest tests/test_validations.py::test_luhn -v

# Lancer avec coverage
python3 -m pytest tests/ --cov=ecommerce-backend --cov-report=html
```

### Lancer les Tests Frontend

```bash
cd ecommerce-front

# Lancer les tests
npm run test

# Lancer les tests en mode watch
npm run test:watch
```

### Écrire un Nouveau Test

#### Test Backend (Pytest)

```python
# tests/test_new_feature.py
import pytest
from ecommerce_backend.api import app
from fastapi.testclient import TestClient

client = TestClient(app)

def test_new_endpoint():
    response = client.post("/new-endpoint", json={"data": "value"})
    assert response.status_code == 200
    assert response.json()["success"] == True
```

#### Test Frontend (Vitest)

```javascript
// ecommerce-front/src/utils/validations.test.js
import { describe, it, expect } from 'vitest';
import { validateSomething } from './validations';

describe('validations', () => {
  it('should validate correctly', () => {
    expect(validateSomething('valid')).toBe(true);
    expect(validateSomething('invalid')).toBe(false);
  });
});
```

---

## 9. Déploiement

### Déploiement en Production (Docker)

#### 1. Configuration

```bash
# Copier et éditer la configuration production
cp config.env.example config.env.production

# Éditer config.env.production avec vos valeurs réelles
# IMPORTANT : Changez les mots de passe et clés secrètes !
```

#### 2. Démarrage

```bash
# Démarrer tous les services
docker-compose -f docker-compose.prod.yml up -d

# Vérifier que tout fonctionne
docker-compose -f docker-compose.prod.yml ps

# Voir les logs
docker-compose -f docker-compose.prod.yml logs -f
```

#### 3. Accès

- **Site web** : http://localhost (ou votre domaine)
- **API** : http://localhost/api

### Services Docker

| Service | Description | Port |
|---------|-------------|------|
| `postgres` | Base de données PostgreSQL | 5432 |
| `redis` | Cache Redis | 6379 |
| `backend` | API FastAPI | 8000 |
| `frontend` | Application React | 3000 |
| `nginx` | Reverse proxy | 80, 443 |

---

## 10. Troubleshooting

### Problèmes Courants

#### ❌ Le backend ne démarre pas

```bash
# Vérifier que PostgreSQL est démarré
psql -h localhost -U ecommerce -d ecommerce

# Vérifier les logs
cd ecommerce-backend
python api.py  # Voir les erreurs directement

# Vérifier que le port 8000 est libre
lsof -i :8000
```

#### ❌ Le frontend ne démarre pas

```bash
# Vérifier que Node.js est installé
node --version

# Supprimer node_modules et réinstaller
cd ecommerce-front
rm -rf node_modules package-lock.json
npm install

# Vérifier que le port 5173 est libre
lsof -i :5173
```

#### ❌ Erreur de connexion à la base de données

```bash
# Vérifier que PostgreSQL est démarré
pg_isready -h localhost -p 5432

# Vérifier les credentials dans config.env
# DATABASE_URL=postgresql://user:password@host:port/database

# Tester la connexion manuellement
psql -h localhost -U ecommerce -d ecommerce
```

#### ❌ Erreur CORS dans le navigateur

Vérifier que `CORS_ORIGINS` dans la configuration backend inclut l'URL du frontend :
```bash
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

#### ❌ Les tests échouent

```bash
# Réinitialiser la base de données de test
cd ecommerce-backend
python init_db.py

# Vérifier que les fixtures sont correctes
# Voir tests/conftest.py
```

### Commandes Utiles

```bash
# Voir les processus en cours
ps aux | grep uvicorn
ps aux | grep node

# Tuer un processus sur un port
lsof -ti:8000 | xargs kill -9  # Port 8000 (backend)
lsof -ti:5173 | xargs kill -9  # Port 5173 (frontend)

# Voir les logs Docker
docker-compose logs -f backend
docker-compose logs -f frontend

# Réinitialiser la base de données
cd ecommerce-backend
python init_db.py

# Vider le cache npm
npm cache clean --force
```

---

## 11. Conventions de Code

### Backend (Python)

- **Style** : PEP 8
- **Docstrings** : Format Google
- **Typage** : Type hints Python 3.8+
- **Imports** : Ordre standard (stdlib, third-party, local)

```python
"""
Description du module.
"""
from typing import Optional, List
from fastapi import FastAPI, HTTPException
from database.models import User

def example_function(param: str) -> Optional[User]:
    """
    Description de la fonction.
    
    Args:
        param: Description du paramètre
        
    Returns:
        Description de la valeur retournée
    """
    # Code ici
    pass
```

### Frontend (JavaScript/React)

- **Style** : ESLint configuré
- **Composants** : Fonctionnels avec hooks
- **Nommage** : PascalCase pour composants, camelCase pour fonctions

```javascript
/**
 * Composant exemple
 * @param {Object} props - Props du composant
 * @param {string} props.title - Titre à afficher
 */
function ExampleComponent({ title }) {
  const [state, setState] = useState(null);
  
  // ...
  
  return (
    <div>
      <h1>{title}</h1>
      {/* ... */}
    </div>
  );
}

export default ExampleComponent;
```

### Base de Données

- **Tables** : Nom au pluriel (`users`, `orders`, `products`)
- **Colonnes** : snake_case (`user_id`, `created_at`)
- **Relations** : Clés étrangères explicites

---

## 12. Ressources et Documentation

### Documentation du Projet

| Document | Description |
|----------|-------------|
| [README.md](README.md) | Documentation principale |
| [PLAN_PRESENTATION.md](PLAN_PRESENTATION.md) | Plan de présentation |
| [LIEN_FRONTEND_BACKEND.md](LIEN_FRONTEND_BACKEND.md) | Communication frontend-backend |
| [RAPPORT_QUALITE_DEVELOPPEMENT.md](RAPPORT_QUALITE_DEVELOPPEMENT.md) | Rapport qualité code |

### Documentation Externe

#### Backend
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [SQLAlchemy Documentation](https://docs.sqlalchemy.org/)
- [Pydantic Documentation](https://docs.pydantic.dev/)
- [Python JWT](https://pyjwt.readthedocs.io/)

#### Frontend
- [React Documentation](https://react.dev/)
- [React Router](https://reactrouter.com/)
- [Vite Documentation](https://vitejs.dev/)

#### Infrastructure
- [Docker Documentation](https://docs.docker.com/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Nginx Documentation](https://nginx.org/en/docs/)

### API Documentation Interactive

Une fois le backend démarré :
- **Swagger UI** : http://localhost:8000/docs
- **ReDoc** : http://localhost:8000/redoc

### Endpoints Principaux

| Endpoint | Méthode | Description | Auth |
|----------|---------|-------------|------|
| `/auth/register` | POST | Inscription | Non |
| `/auth/login` | POST | Connexion | Non |
| `/auth/me` | GET | Info utilisateur | Oui |
| `/products` | GET | Liste produits | Non |
| `/cart` | GET | Voir panier | Oui |
| `/cart/add` | POST | Ajouter au panier | Oui |
| `/orders/checkout` | POST | Créer commande | Oui |
| `/orders/{id}/pay` | POST | Payer commande | Oui |
| `/admin/products` | GET/POST | Gestion produits | Admin |
| `/admin/orders` | GET | Liste commandes | Admin |

---

## 🎯 Prochaines Étapes

Maintenant que vous avez le projet en marche :

1. ✅ **Explorer l'application** : Connectez-vous et naviguez
2. ✅ **Lire le code** : Commencez par `api.py` et `lib/api.js`
3. ✅ **Faire une petite modification** : Testez votre compréhension
4. ✅ **Lire la documentation** : `LIEN_FRONTEND_BACKEND.md` est très utile
5. ✅ **Poser des questions** : Consultez les autres développeurs ou la documentation

---

## 🆘 Besoin d'Aide ?

Si vous êtes bloqué :

1. **Consulter la documentation** : Voir section "Ressources" ci-dessus
2. **Vérifier les logs** : `logs/backend.log` et `logs/frontend.log`
3. **Tester avec l'API docs** : http://localhost:8000/docs
4. **Chercher dans le code** : Utilisez `grep` ou votre IDE
5. **Demander de l'aide** : Contactez l'équipe ou créez une issue

---

## 📝 Checklist de Démarrage

Avant de commencer à développer, vérifiez que :

- [ ] Tous les prérequis sont installés
- [ ] Le projet est cloné et configuré
- [ ] Les dépendances sont installées (backend + frontend)
- [ ] La base de données est initialisée
- [ ] Le backend démarre sans erreur
- [ ] Le frontend démarre sans erreur
- [ ] Vous pouvez vous connecter avec un compte de test
- [ ] Les tests passent (au moins partiellement)
- [ ] Vous avez lu la documentation principale

---

<div align="center">

**🎉 Bon développement ! 🚀**

Made with ❤️ for the team

</div>

