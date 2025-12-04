# Polymarket Sniping Bot - Guide de Démarrage Rapide

## 🔐 Identifiants de Connexion par Défaut

**Username:** `admin`  
**Password:** `admin`

> ⚠️ **Important:** Changez le mot de passe après votre première connexion !

## 🚀 Démarrage

### Première Installation

1. **Démarrer les services Docker:**
   ```bash
   docker-compose up --build
   ```

2. **Accéder au Dashboard:**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

3. **Se connecter:**
   - Utilisez les identifiants ci-dessus
   - Le système créera automatiquement l'utilisateur admin au premier démarrage

### Redémarrage Normal

```bash
docker-compose up
```

### Arrêt

```bash
docker-compose down
```

### Réinitialisation Complète (supprime la base de données)

```bash
docker-compose down -v
docker-compose up --build
```

## 🔧 Résolution des Problèmes

### "Invalid credentials" lors de la connexion

1. Vérifiez que le backend est bien démarré:
   ```bash
   docker-compose logs backend
   ```

2. Recherchez le message "Admin user created successfully" dans les logs

3. Si nécessaire, recréez l'utilisateur admin:
   ```bash
   docker-compose exec backend python create_admin_user.py
   ```

### La base de données ne démarre pas

```bash
docker-compose down -v
docker-compose up --build
```

## 📁 Structure du Projet

```
botpolymarket/
├── backend/           # API FastAPI
│   ├── routers/      # Routes API (auth, dashboard, settings)
│   ├── models.py     # Modèles SQLAlchemy
│   ├── auth.py       # Gestion JWT et passwords
│   └── main.py       # Point d'entrée FastAPI
├── frontend/         # Interface React + Vite
│   └── src/
│       ├── pages/    # Pages (Login, Dashboard, etc.)
│       └── components/
└── docker-compose.yml
```

## 🔑 Variables d'Environnement

Définies dans `docker-compose.yml`:

- `DATABASE_URL`: Connexion PostgreSQL
- `REDIS_URL`: Connexion Redis
- `SECRET_KEY`: Clé secrète JWT

## 📊 Fonctionnalités Actuelles

- ✅ Authentification JWT
- ✅ Dashboard avec statistiques
- ✅ Gestion des paramètres
- ✅ Logs système
- ⏳ Module de trading (à venir)
- ⏳ Intégration Polymarket API (à venir)

## 🆘 Support

En cas de problème:
1. Vérifiez les logs: `docker-compose logs`
2. Redémarrez les services: `docker-compose restart`
3. Réinitialisez si nécessaire: `docker-compose down -v && docker-compose up --build`
