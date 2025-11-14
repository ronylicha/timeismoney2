#!/bin/bash

###############################################################################
# Script d'Installation SQLite pour Tests Laravel
# Projet: TimeIsMoney2
# Date: Novembre 2025
###############################################################################

set -e  # Arrêter en cas d'erreur

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction d'affichage
print_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

###############################################################################
# 1. Vérifications Préliminaires
###############################################################################

print_header "1. Vérifications Préliminaires"

# Vérifier PHP
if ! command -v php &> /dev/null; then
    print_error "PHP n'est pas installé"
    exit 1
fi

PHP_VERSION=$(php -v | head -n 1 | cut -d " " -f 2 | cut -d "." -f 1,2)
print_success "PHP $PHP_VERSION détecté"

# Vérifier si SQLite est déjà installé
if php -m | grep -q "pdo_sqlite"; then
    print_warning "pdo_sqlite est déjà installé !"
    php -r "echo SQLite3::version()['versionString'];" | xargs -I {} echo "  Version: {}"

    read -p "Voulez-vous continuer quand même? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Installation annulée"
        exit 0
    fi
else
    print_info "pdo_sqlite n'est pas installé - installation requise"
fi

###############################################################################
# 2. Détection de la Méthode d'Installation
###############################################################################

print_header "2. Choix de la Méthode d'Installation"

echo "Choisissez une méthode d'installation:"
echo "  1) apt-get (Recommandé pour Ubuntu/Debian)"
echo "  2) PECL"
echo "  3) Compilation manuelle depuis les sources"
echo "  4) Annuler"
echo

read -p "Votre choix (1-4): " choice

case $choice in
    1)
        METHOD="apt"
        ;;
    2)
        METHOD="pecl"
        ;;
    3)
        METHOD="manual"
        ;;
    4)
        print_info "Installation annulée"
        exit 0
        ;;
    *)
        print_error "Choix invalide"
        exit 1
        ;;
esac

###############################################################################
# 3. Installation selon la Méthode Choisie
###############################################################################

print_header "3. Installation de SQLite"

case $METHOD in
    apt)
        print_info "Installation via apt-get..."

        # Mise à jour des paquets
        print_info "Mise à jour de la liste des paquets..."
        sudo apt-get update

        # Installation
        print_info "Installation de php$PHP_VERSION-sqlite3..."
        sudo apt-get install -y php$PHP_VERSION-sqlite3

        print_success "Installation via apt-get terminée"
        ;;

    pecl)
        print_info "Installation via PECL..."

        # Vérifier PECL
        if ! command -v pecl &> /dev/null; then
            print_info "PECL n'est pas installé, installation de php-pear..."
            sudo apt-get update
            sudo apt-get install -y php-pear php$PHP_VERSION-dev
        fi

        # Vérifier les dépendances
        print_info "Installation des dépendances de développement..."
        sudo apt-get install -y libsqlite3-dev

        # Installer via PECL
        print_info "Installation de pdo_sqlite via PECL..."
        sudo pecl install pdo_sqlite

        # Activer l'extension
        print_info "Activation de l'extension..."
        echo "extension=pdo_sqlite.so" | sudo tee /etc/php/$PHP_VERSION/cli/conf.d/20-pdo_sqlite.ini
        echo "extension=sqlite3.so" | sudo tee /etc/php/$PHP_VERSION/cli/conf.d/20-sqlite3.ini

        print_success "Installation via PECL terminée"
        ;;

    manual)
        print_info "Compilation manuelle depuis les sources..."

        # Dépendances
        print_info "Installation des dépendances..."
        sudo apt-get update
        sudo apt-get install -y build-essential php$PHP_VERSION-dev libsqlite3-dev wget

        # Téléchargement des sources
        print_info "Téléchargement de PHP $PHP_VERSION sources..."
        cd /tmp
        wget -q --show-progress https://www.php.net/distributions/php-8.4.1.tar.gz

        print_info "Extraction des sources..."
        tar -xzf php-8.4.1.tar.gz
        cd php-8.4.1/ext/pdo_sqlite

        # Compilation
        print_info "Compilation de l'extension pdo_sqlite..."
        phpize
        ./configure
        make
        sudo make install

        # Activation
        print_info "Activation de l'extension..."
        echo "extension=pdo_sqlite.so" | sudo tee /etc/php/$PHP_VERSION/cli/conf.d/20-pdo_sqlite.ini

        # SQLite3
        cd /tmp/php-8.4.1/ext/sqlite3
        print_info "Compilation de l'extension sqlite3..."
        phpize
        ./configure
        make
        sudo make install

        echo "extension=sqlite3.so" | sudo tee /etc/php/$PHP_VERSION/cli/conf.d/20-sqlite3.ini

        # Nettoyage
        print_info "Nettoyage des fichiers temporaires..."
        cd /tmp
        rm -rf php-8.4.1 php-8.4.1.tar.gz

        print_success "Compilation manuelle terminée"
        ;;
esac

###############################################################################
# 4. Vérification de l'Installation
###############################################################################

print_header "4. Vérification de l'Installation"

# Vérifier pdo_sqlite
if php -m | grep -q "pdo_sqlite"; then
    print_success "pdo_sqlite est installé"
else
    print_error "pdo_sqlite n'est pas chargé"
    exit 1
fi

# Vérifier sqlite3
if php -m | grep -q "sqlite3"; then
    print_success "sqlite3 est installé"
else
    print_warning "sqlite3 n'est pas chargé (non critique)"
fi

# Afficher la version
SQLITE_VERSION=$(php -r "echo SQLite3::version()['versionString'];")
print_success "Version SQLite: $SQLITE_VERSION"

# Test de connexion
print_info "Test de connexion SQLite..."
if php -r "new PDO('sqlite::memory:');" 2>/dev/null; then
    print_success "Connexion SQLite fonctionne!"
else
    print_error "Échec de la connexion SQLite"
    exit 1
fi

###############################################################################
# 5. Test de la Suite de Tests
###############################################################################

print_header "5. Exécution des Tests Laravel"

# Vérifier que nous sommes dans un projet Laravel
if [ ! -f "artisan" ]; then
    print_error "Fichier artisan non trouvé. Êtes-vous dans le répertoire du projet?"
    exit 1
fi

# Demander si l'utilisateur veut exécuter les tests
read -p "Voulez-vous exécuter la suite de tests maintenant? (y/n) " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_info "Exécution des tests unitaires..."
    echo

    # Exécuter les tests
    php artisan test --testsuite=Unit

    TEST_EXIT_CODE=$?
    echo

    if [ $TEST_EXIT_CODE -eq 0 ]; then
        print_success "Tous les tests sont passés!"
    else
        print_warning "Certains tests ont échoué (code: $TEST_EXIT_CODE)"
        print_info "Consultez la sortie ci-dessus pour plus de détails"
    fi
fi

###############################################################################
# 6. Résumé et Prochaines Étapes
###############################################################################

print_header "6. Installation Terminée!"

echo
echo "📊 Résumé:"
echo "  • PHP Version: $PHP_VERSION"
echo "  • SQLite Version: $SQLITE_VERSION"
echo "  • pdo_sqlite: $(php -m | grep pdo_sqlite | xargs)"
echo "  • sqlite3: $(php -m | grep -w sqlite3 | xargs)"
echo

echo "🎯 Prochaines Étapes:"
echo "  1. Exécuter tous les tests:"
echo "     php artisan test"
echo
echo "  2. Générer un rapport de couverture:"
echo "     php artisan test --coverage"
echo
echo "  3. Tests avec couverture HTML:"
echo "     php artisan test --coverage-html coverage/"
echo
echo "  4. Consulter la documentation:"
echo "     cat SQLITE_INSTALLATION_GUIDE.md"
echo

print_success "SQLite est maintenant prêt pour les tests Laravel!"
echo
