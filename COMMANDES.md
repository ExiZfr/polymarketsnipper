# 🚀 Commandes Git et Déploiement VPS

## 📦 PUSH SUR GITHUB

### 1. Vérifier les fichiers modifiés
```bash
git status
```

### 2. Ajouter tous les fichiers modifiés
```bash
git add .
```

### 3. Créer un commit
```bash
git commit -m "Fix: Authentication system - Added missing auth.py files"
```

**Ou avec un message personnalisé:**
```bash
git commit -m "Votre message de commit ici"
```

### 4. Pusher vers GitHub
```bash
git push origin main
```

**Si c'est la première fois ou si la branche n'existe pas:**
```bash
git push -u origin main
```

### 🔄 Commandes Git Complètes (tout en une)
```bash
git add .
git commit -m "Fix: Authentication system - Added missing auth.py files"
git push origin main
```

---

## 🖥️ MISE À JOUR DU VPS

### Option 1: Utiliser le script automatique (RECOMMANDÉ)

**Sur votre VPS, via SSH:**
```bash
cd botpolymarket
./deploy.sh
```

Ce script fait tout automatiquement:
- ✅ Pull du code depuis GitHub
- ✅ Arrêt des containers
- ✅ Rebuild des images Docker
- ✅ Redémarrage de l'application
- ✅ Nettoyage des images inutiles

---

### Option 2: Commandes manuelles

**Si vous préférez faire étape par étape:**

```bash
# 1. Aller dans le dossier du projet
cd ~/botpolymarket

# 2. Récupérer les dernières modifications
git pull origin main

# 3. Arrêter les containers
docker compose down

# 4. Reconstruire et redémarrer
docker compose up -d --build

# 5. Vérifier que tout fonctionne
docker compose ps
```

---

## 📋 WORKFLOW COMPLET

### Sur votre PC Windows:

```powershell
# 1. Commit et push les changements
git add .
git commit -m "Fix: Authentication system"
git push origin main
```

### Sur votre VPS (via SSH):

```bash
# 2. Se connecter au VPS
ssh root@votre-ip-vps
# ou: ssh votre-user@votre-ip-vps

# 3. Déployer
cd botpolymarket
./deploy.sh
```

---

## 🔍 COMMANDES DE VÉRIFICATION

### Voir les containers en cours d'exécution
```bash
docker compose ps
```

### Voir les logs en temps réel
```bash
docker compose logs -f
```

### Voir les logs d'un service spécifique
```bash
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f db
```

### Redémarrer un service spécifique
```bash
docker compose restart backend
docker compose restart frontend
```

### Arrêter tout
```bash
docker compose down
```

### Arrêter et supprimer les volumes (réinitialisation complète)
```bash
docker compose down -v
```

---

## 🆘 DÉPANNAGE

### Problème: Git demande les credentials à chaque push

**Solution: Configurer SSH ou le cache de credentials**

**Option 1 - Cache HTTPS (simple):**
```bash
git config --global credential.helper cache
git config --global credential.helper 'cache --timeout=3600'
```

**Option 2 - Utiliser SSH (recommandé):**
1. Générer une clé SSH:
   ```bash
   ssh-keygen -t ed25519 -C "votre-email@example.com"
   ```
2. Copier la clé publique:
   ```bash
   cat ~/.ssh/id_ed25519.pub
   ```
3. Ajouter la clé dans GitHub: Settings → SSH and GPG keys → New SSH key

### Problème: Permission denied sur deploy.sh

**Solution:**
```bash
chmod +x deploy.sh
./deploy.sh
```

### Problème: Docker command not found sur VPS

**Solution: Installer Docker**
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo apt install docker-compose-plugin -y
```

### Problème: Les changements ne sont pas visibles après deploy

**Solution: Hard rebuild**
```bash
docker compose down -v
docker compose build --no-cache
docker compose up -d
```

---

## 📝 COMMANDES RAPIDES

### Push complet (PC)
```bash
git add . && git commit -m "Update" && git push
```

### Update VPS complet
```bash
cd botpolymarket && ./deploy.sh
```

### Voir tout en une seule commande sur VPS
```bash
docker compose down && git pull && docker compose up -d --build && docker compose ps
```

---

## 🎯 RÉSUMÉ ULTRA-RAPIDE

**Sur PC:**
```bash
git add . && git commit -m "Fixes auth" && git push
```

**Sur VPS:**
```bash
cd botpolymarket && ./deploy.sh
```

**C'est tout ! 🎉**
