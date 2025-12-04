# 🛒 E-Commerce Full-Stack

> Application e-commerce moderne et complète avec backend FastAPI et frontend React

[![Python](https://img.shields.io/badge/Python-3.13-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-green.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791.svg)](https://www.postgresql.org/)
[![Tests](https://img.shields.io/badge/Tests-44%20passing-success.svg)](tests/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg)](https://www.docker.com/)

---

## 📋 Table des Matières

- [À Propos](#-à-propos)
- [Fonctionnalités](#-fonctionnalités)
- [Technologies](#-technologies)
- [Démarrage Rapide](#-démarrage-rapide)
- [Structure du Projet](#-structure-du-projet)
- [Tests](#-tests)
- [Documentation](#-documentation)
- [Déploiement](#-déploiement)

---

## 🎯 À Propos

Plateforme e-commerce complète avec gestion de catalogue, panier, commandes, paiements, factures PDF, suivi de livraison et support client. Développée avec une architecture moderne et scalable.

### ✨ Points Forts

- ✅ **Architecture moderne** : Backend FastAPI + Frontend React
- ✅ **Sécurité renforcée** : Authentification JWT, validation stricte des données
- ✅ **Paiement sécurisé** : Validation Luhn pour les cartes bancaires
- ✅ **Tests complets** : 44 tests couvrant tous les endpoints
- ✅ **Production ready** : Docker, Nginx
- ✅ **Documentation complète** : API docs, guides de développement

---

## 🚀 Fonctionnalités

### 👥 Espace Client
- 🔐 Inscription et connexion sécurisées
- 🛍️ Navigation dans le catalogue de produits
- 🛒 Gestion du panier (ajouter, retirer, vider)
- 💳 Paiement sécurisé avec validation de carte
- 📦 Suivi des commandes et livraisons
- 📄 Génération et téléchargement de factures PDF
- 💬 Support client avec système de tickets
- 👤 Gestion du profil utilisateur

### 🔧 Espace Administration
- 📦 CRUD complet des produits
- ✅ Validation des commandes
- 🚚 Gestion des expéditions
- 💰 Remboursements automatiques
- 📊 Suivi détaillé des statuts
- 💬 Réponse aux tickets de support
- 📈 Dashboard administrateur

---

## 🛠️ Technologies

### Backend
- **Python 3.13** - Langage principal
- **FastAPI** - Framework web haute performance
- **PostgreSQL** - Base de données relationnelle
- **SQLAlchemy** - ORM Python
- **JWT** - Authentification sécurisée
- **ReportLab** - Génération de PDF
- **Pydantic** - Validation des données

### Frontend
- **React 19** - Bibliothèque UI
- **Vite** - Build tool moderne
- **React Router** - Navigation SPA
- **CSS3** - Styles personnalisés

### Infrastructure
- **Docker & Docker Compose** - Containerisation
- **Nginx** - Reverse proxy

---

## 🚀 Démarrage Rapide

### Prérequis
```bash
Python 3.8+
Node.js 16+
PostgreSQL 12+
```

### Installation

#### 1️⃣ Cloner le projet
```bash
git clone <repository-url>
cd ecommerce
```

#### 2️⃣ Démarrer en mode développement
```bash
# Démarrer tout (backend + frontend)
./start.sh

# Ou démarrer séparément
./start.sh backend    # API sur http://localhost:8000
./start.sh frontend   # Frontend sur http://localhost:5173
```

#### 3️⃣ Accéder à l'application
- **Frontend** : http://localhost:5173
- **API** : http://localhost:8000
- **API Docs** : http://localhost:8000/docs

### 🎭 Comptes de Test

| Rôle | Email | Mot de passe |
|------|-------|--------------|
| Admin | `admin@example.com` | `admin123` |
| Client | `client@example.com` | `secret` |

### 💳 Cartes de Test

| Type | Numéro | CVV | Expiration |
|------|--------|-----|------------|
| Valide ✅ | `4111111111111111` | `123` | `12/2030` |
| Invalide ❌ | `4242424242424240` | `123` | `12/2030` |

---

## 📁 Structure du Projet

```
ecommerce/
├── ecommerce-backend/          # Backend FastAPI
│   ├── api.py                  # Point d'entrée de l'API
│   ├── database/
│   │   ├── models.py          # Modèles SQLAlchemy
│   │   ├── database.py        # Configuration DB
│   │   └── repositories_simple.py
│   ├── services/              # Services métier
│   │   ├── auth_service.py    # Authentification JWT
│   │   ├── order_service.py   # Gestion commandes
│   │   ├── payment_service.py # Paiements
│   │   └── ...
│   ├── utils/
│   │   └── validations.py     # Validation Luhn, etc.
│   └── requirements.txt
│
├── ecommerce-front/           # Frontend React
│   ├── src/
│   │   ├── pages/            # Pages React
│   │   ├── components/       # Composants réutilisables
│   │   ├── contexts/         # Contextes React
│   │   └── lib/
│   │       └── api.js        # Client API
│   └── package.json
│
├── tests/                     # Tests
│   ├── test_api_endpoints.py # Tests des endpoints (44 tests)
│   └── conftest.py
│
├── docs/                      # Documentation
├── scripts/                   # Scripts utilitaires
├── docker-compose.prod.yml    # Config Docker production
├── start.sh                   # Script de démarrage
└── README.md                  # Ce fichier
```

---

## 🧪 Tests

### Lancer tous les tests
```bash
cd ecommerce
python3 -m pytest tests/ -v
```

### Résultats
```
44 tests passed ✅
Coverage: Tous les endpoints de l'API
```

### Tests disponibles
- ✅ Authentification (6 tests)
- ✅ Catalogue produits (2 tests)
- ✅ Panier (4 tests)
- ✅ Commandes (8 tests)
- ✅ Support client (5 tests)
- ✅ Administration (19 tests)

---

## 📚 Documentation

### Guides Disponibles

| Document | Description |
|----------|-------------|
| **[GUIDE_PRISE_EN_MAIN.md](GUIDE_PRISE_EN_MAIN.md)** | **🆕 Guide complet pour nouveaux développeurs** |
| [LIEN_FRONTEND_BACKEND.md](LIEN_FRONTEND_BACKEND.md) | Comment frontend et backend communiquent |
| [PLAN_PRESENTATION.md](PLAN_PRESENTATION.md) | Plan de présentation du projet |
| [DOCUMENTATION.md](DOCUMENTATION.md) | Documentation technique complète |
| [PRESENTATION.md](PRESENTATION.md) | Présentation détaillée du projet |
| [docs/development/BACKEND.md](docs/development/BACKEND.md) | Guide de développement backend |
| [docs/development/FRONTEND.md](docs/development/FRONTEND.md) | Guide de développement frontend |
| [docs/development/DOCKER.md](docs/development/DOCKER.md) | Guide Docker et déploiement |

### API Documentation
- **Swagger UI** : http://localhost:8000/docs
- **ReDoc** : http://localhost:8000/redoc

---

## 🐳 Déploiement

### Mode Production (Docker)

#### 1️⃣ Configuration
```bash
# Copier et configurer les variables d'environnement
cp config.env.example config.env.production
# Éditer config.env.production avec vos valeurs
```

#### 2️⃣ Déployer
```bash
# Déploiement complet (backend + frontend + base de données)
./deploy_simple.sh
```

#### 3️⃣ Accéder
- **Site** : http://localhost
- **API** : http://localhost/api

### Logs
- **Logs** : Voir `logs/backend.log` et `logs/frontend.log`

---

## 🔒 Sécurité

- ✅ **Authentification JWT** : Tokens sécurisés avec expiration
- ✅ **Validation stricte** : Pydantic + validateurs personnalisés
- ✅ **Algorithme de Luhn** : Validation des cartes bancaires
- ✅ **Hashing bcrypt** : Mots de passe sécurisés
- ✅ **CORS configuré** : Origines autorisées uniquement
- ✅ **SQL Injection protection** : ORM SQLAlchemy

---

## 📊 Statistiques du Projet

- 📄 **Lignes de code** : ~5000+ lignes (backend + frontend)
- 🧪 **Tests** : 44 tests passants
- 📦 **Endpoints API** : 40+ endpoints
- 🎨 **Pages Frontend** : 20+ pages React
- 📝 **Documentation** : 1000+ lignes

---

## 🤝 Contribution

### Développement

```bash
# Créer une branche
git checkout -b feature/ma-fonctionnalite

# Faire vos modifications
# Lancer les tests
python3 -m pytest tests/ -v

# Commit et push
git add .
git commit -m "feat: ma nouvelle fonctionnalité"
git push origin feature/ma-fonctionnalite
```

---

## 📄 Licence

Ce projet est développé dans un cadre académique.

---

## 👨‍💻 Auteur

**Projet E-Commerce**  
*Octobre 2025*

---

## 🆘 Support

Pour toute question ou problème :

1. 📖 Consulter la [documentation complète](DOCUMENTATION.md)
2. 🔍 Vérifier les [issues existantes](issues/)
3. 💬 Créer une nouvelle issue si nécessaire

---

## 🎯 Roadmap

- [x] Backend FastAPI complet
- [x] Frontend React moderne
- [x] Authentification JWT
- [x] Système de paiement
- [x] Factures PDF
- [x] Tests complets
- [x] Docker & déploiement
- [ ] Tests E2E avec Playwright
- [ ] API rate limiting
- [ ] Cache Redis
- [ ] Analytics avancés

---

<div align="center">

**⭐ Si ce projet vous aide, n'hésitez pas à lui donner une étoile ! ⭐**

Made with ❤️ using FastAPI and React

</div>

