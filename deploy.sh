#!/bin/bash

# Arrêter le script en cas d'erreur
set -e

echo "🚀 Démarrage du déploiement..."

# 1. Récupérer les dernières modifications du code
echo "📥 Pull du code depuis GitHub..."
git pull origin master

# 2. Reconstruire et redémarrer les conteneurs
echo "🔄 Redémarrage des conteneurs Docker..."
docker-compose down
docker-compose up -d --build

# 3. Nettoyage des images inutilisées (optionnel mais recommandé)
echo "🧹 Nettoyage du système..."
docker image prune -f

echo "✅ Déploiement terminé avec succès !"
