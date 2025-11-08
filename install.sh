#!/bin/bash

# Time Is Money - Script d'installation automatique
# =====================================================

set -e  # Arrêter le script en cas d'erreur

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Fonction pour afficher les messages
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Banner
echo "============================================="
echo "   Time Is Money - Installation"
echo "============================================="
echo ""

# Vérification des prérequis
log_info "Vérification des prérequis..."

# Vérifier PHP
if ! command -v php &> /dev/null; then
    log_error "PHP n'est pas installé. Version requise: 8.3+"
fi

PHP_VERSION=$(php -r "echo PHP_VERSION;")
log_info "PHP version: $PHP_VERSION"

# Vérifier Composer
if ! command -v composer &> /dev/null; then
    log_error "Composer n'est pas installé"
fi

COMPOSER_VERSION=$(composer --version | cut -d' ' -f3)
log_info "Composer version: $COMPOSER_VERSION"

# Vérifier Node.js
if ! command -v node &> /dev/null; then
    log_error "Node.js n'est pas installé. Version requise: 18+"
fi

NODE_VERSION=$(node --version)
log_info "Node.js version: $NODE_VERSION"

# Vérifier npm
if ! command -v npm &> /dev/null; then
    log_error "npm n'est pas installé"
fi

NPM_VERSION=$(npm --version)
log_info "npm version: $NPM_VERSION"

# Vérifier MySQL/MariaDB
if ! command -v mysql &> /dev/null; then
    log_warning "MySQL/MariaDB client n'est pas installé. Assurez-vous d'avoir une base de données disponible"
fi

echo ""
log_info "Installation des dépendances PHP..."
composer install --no-interaction --prefer-dist --optimize-autoloader

echo ""
log_info "Installation des dépendances JavaScript..."
npm install

echo ""
log_info "Configuration de l'environnement..."

# Copier .env si n'existe pas
if [ ! -f .env ]; then
    cp .env.example .env
    log_info "Fichier .env créé"

    # Générer la clé d'application
    php artisan key:generate
    log_info "Clé d'application générée"
else
    log_warning "Fichier .env déjà existant"
fi

# Configuration de la base de données
echo ""
echo "Configuration de la base de données"
echo "===================================="
read -p "Nom de la base de données [timeismoney2]: " DB_NAME
DB_NAME=${DB_NAME:-timeismoney2}

read -p "Hôte MySQL [127.0.0.1]: " DB_HOST
DB_HOST=${DB_HOST:-127.0.0.1}

read -p "Port MySQL [3306]: " DB_PORT
DB_PORT=${DB_PORT:-3306}

read -p "Utilisateur MySQL [root]: " DB_USER
DB_USER=${DB_USER:-root}

read -sp "Mot de passe MySQL: " DB_PASS
echo ""

# Mettre à jour le fichier .env
log_info "Mise à jour de la configuration..."
sed -i "s/DB_CONNECTION=.*/DB_CONNECTION=mysql/" .env
sed -i "s/DB_HOST=.*/DB_HOST=$DB_HOST/" .env
sed -i "s/DB_PORT=.*/DB_PORT=$DB_PORT/" .env
sed -i "s/DB_DATABASE=.*/DB_DATABASE=$DB_NAME/" .env
sed -i "s/DB_USERNAME=.*/DB_USERNAME=$DB_USER/" .env
sed -i "s/DB_PASSWORD=.*/DB_PASSWORD=$DB_PASS/" .env

# Créer la base de données si elle n'existe pas
echo ""
log_info "Création de la base de données..."
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" -e "CREATE DATABASE IF NOT EXISTS $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>/dev/null || log_warning "Impossible de créer la base de données automatiquement. Assurez-vous qu'elle existe."

# Exécuter les migrations
echo ""
log_info "Exécution des migrations..."
php artisan migrate --force

# Publier les fichiers de configuration des packages
log_info "Publication des fichiers de configuration..."
php artisan vendor:publish --provider="Laravel\Sanctum\SanctumServiceProvider" --force
php artisan vendor:publish --provider="Spatie\Permission\PermissionServiceProvider" --force
php artisan vendor:publish --provider="Spatie\Activitylog\ActivitylogServiceProvider" --tag="activitylog-migrations" --force

# Créer les liens de stockage
log_info "Création des liens de stockage..."
php artisan storage:link

# Compiler les assets
echo ""
log_info "Compilation des assets..."
npm run build

# Optimisation pour la production
log_info "Optimisation pour la production..."
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Créer un utilisateur admin
echo ""
echo "Création du compte administrateur"
echo "=================================="
read -p "Email de l'administrateur [admin@timeismoney.fr]: " ADMIN_EMAIL
ADMIN_EMAIL=${ADMIN_EMAIL:-admin@timeismoney.fr}

read -p "Nom de l'administrateur [Admin]: " ADMIN_NAME
ADMIN_NAME=${ADMIN_NAME:-Admin}

read -sp "Mot de passe de l'administrateur: " ADMIN_PASS
echo ""

# Créer l'utilisateur admin via tinker
php artisan tinker --execute="
    \$user = new App\Models\User();
    \$user->name = '$ADMIN_NAME';
    \$user->email = '$ADMIN_EMAIL';
    \$user->password = bcrypt('$ADMIN_PASS');
    \$user->email_verified_at = now();
    \$user->save();
    echo 'Utilisateur admin créé avec succès!';
" 2>/dev/null || log_warning "Impossible de créer l'utilisateur automatiquement"

# Permissions des dossiers
log_info "Configuration des permissions..."
chmod -R 775 storage bootstrap/cache
chmod -R 755 public

# Installation complète
echo ""
echo "============================================="
echo -e "${GREEN}   Installation terminée avec succès !${NC}"
echo "============================================="
echo ""
echo "Vous pouvez maintenant lancer l'application :"
echo "  - Développement : php artisan serve"
echo "  - Frontend dev  : npm run dev"
echo ""
echo "Accédez à l'application : http://localhost:8000"
echo ""
echo "Compte administrateur :"
echo "  Email : $ADMIN_EMAIL"
echo ""
echo "Bonne utilisation de Time Is Money !"
echo ""