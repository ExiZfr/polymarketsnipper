# Guide de Déploiement sur VPS

Ce guide explique comment déployer le bot PolyMarket sur un VPS (Virtual Private Server) sous Linux (Ubuntu/Debian recommandé).

## Prérequis sur le VPS

Connectez-vous à votre VPS via SSH et installez Docker et Git :

```bash
# Mettre à jour le système
sudo apt update && sudo apt upgrade -y

# Installer Git
sudo apt install git -y

# Installer Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Installer Docker Compose (si non inclus dans la version de Docker)
sudo apt install docker-compose-plugin -y
# Ou vérifiez si 'docker compose' fonctionne déjà
```

## 1. Première Installation

1.  **Cloner le dépôt** (remplacez l'URL par la vôtre) :
    ```bash
    git clone https://github.com/VOTRE-PSEUDO/VOTRE-REPO.git botpolymarket
    cd botpolymarket
    ```

2.  **Configurer les variables d'environnement** :
    Copiez le fichier d'exemple (si vous en avez un) ou créez un fichier `.env` si nécessaire. Pour l'instant, la configuration est dans `docker-compose.yml` et le code, mais pour la production, il est conseillé d'utiliser un fichier `.env`.

3.  **Rendre le script de déploiement exécutable** :
    ```bash
    chmod +x deploy.sh
    ```

4.  **Lancer l'application** :
    ```bash
    ./deploy.sh
    ```

## 2. Mises à jour ultérieures

Chaque fois que vous poussez des modifications sur GitHub, connectez-vous simplement à votre VPS et lancez :

```bash
cd botpolymarket
./deploy.sh
```

Ce script va automatiquement :
1.  Télécharger la dernière version du code (`git pull`).
2.  Arrêter les conteneurs existants.
3.  Reconstruire les images avec les nouveaux changements.
4.  Relancer les conteneurs en arrière-plan.

## 3. Vérification

Pour vérifier que tout fonctionne :

- **Voir les conteneurs actifs** :
  ```bash
  docker compose ps
  ```

- **Voir les logs** :
  ```bash
  docker compose logs -f
  ```
