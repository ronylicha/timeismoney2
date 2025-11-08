# 🚀 Time Is Money - Démarrage Rapide

## Installation en 1 commande

Choisissez votre méthode préférée :

```bash
# Méthode 1 : Composer
composer setup

# Méthode 2 : Script shell
./dev.sh setup

# Méthode 3 : Makefile
make install
```

## Lancer l'application

### ✅ Recommandé : Tous les services en parallèle

```bash
# Option 1 : Composer
composer dev-full

# Option 2 : Script shell
./dev.sh all

# Option 3 : Makefile
make dev-full
```

Cette commande lance automatiquement :
- ✅ Serveur Laravel (http://localhost:8000)
- ✅ Queue Worker (pour les jobs asynchrones)
- ✅ Logs en temps réel
- ✅ Vite Dev Server (hot reload frontend)

### 📝 Serveur Laravel uniquement

Si vous ne voulez que le backend :

```bash
# Option 1 : Composer
composer dev

# Option 2 : Script shell
./dev.sh start

# Option 3 : Makefile
make dev

# Option 4 : Artisan direct
php artisan serve
```

### 🔧 Services séparés dans différents terminaux

**Terminal 1 - Laravel :**
```bash
./dev.sh start
# OU
make dev
```

**Terminal 2 - Queue Worker :**
```bash
./dev.sh queue
# OU
make queue
```

**Terminal 3 - Vite :**
```bash
./dev.sh vite
# OU
make vite
# OU
npm run dev
```

## 📋 Commandes Utiles

### Base de données

```bash
# Migrations
./dev.sh migrate
make migrate

# Seed
./dev.sh seed
make seed

# Reset complet (ATTENTION: supprime toutes les données)
./dev.sh fresh
make fresh
```

### Cache

```bash
# Effacer tous les caches
./dev.sh clear
make clear
composer clear

# Optimiser pour production
./dev.sh optimize
make optimize
composer optimize
```

### Tests

```bash
# Lancer les tests
make test
composer test

# Tests avec couverture
make test-coverage
composer test-coverage
```

### Logs

```bash
# Voir les logs en temps réel
make logs
php artisan pail

# OU dans un fichier
tail -f storage/logs/laravel.log
```

## 🎯 Workflow de Développement Typique

1. **Première utilisation :**
   ```bash
   composer setup
   ```

2. **Démarrage quotidien :**
   ```bash
   composer dev-full
   # OU
   ./dev.sh all
   # OU
   make dev-full
   ```

3. **Après modification du backend :**
   ```bash
   # Si modification de routes/config
   make clear
   ```

4. **Après modification de la DB :**
   ```bash
   php artisan migrate
   # OU
   make migrate
   ```

5. **Avant de commiter :**
   ```bash
   make format  # Formate le code PHP
   make test    # Lance les tests
   ```

## 🌐 URLs Importantes

Une fois lancé, votre application est accessible sur :

- **Frontend** : http://localhost:8000
- **API** : http://localhost:8000/api
- **Vite HMR** : http://localhost:5173 (utilisé automatiquement)

## 🔑 Premiers Pas

### 1. Créer un compte Admin

Après l'installation, la base de données contient un utilisateur admin par défaut :

```
Email: admin@example.com
Mot de passe: password
```

**⚠️ IMPORTANT:** Changez ce mot de passe immédiatement en production !

### 2. Créer une organisation (Tenant)

1. Connectez-vous avec le compte admin
2. Allez dans "Administration" → "Tenants"
3. Créez votre premier tenant

### 3. Créer des utilisateurs

1. Administration → Utilisateurs
2. Cliquez sur "Nouvel utilisateur"
3. Remplissez les informations

## 🛠️ Résolution de Problèmes

### Le serveur ne démarre pas

```bash
# Vérifier si le port 8000 est occupé
lsof -i:8000

# Utiliser un autre port
php artisan serve --port=8001
```

### Erreur de permissions

```bash
# Linux/Mac
chmod -R 775 storage bootstrap/cache
chown -R $USER:www-data storage bootstrap/cache

# Si vous utilisez Docker
docker-compose exec app chmod -R 775 storage bootstrap/cache
```

### Erreur "Class not found"

```bash
# Regénérer l'autoload
composer dump-autoload
```

### Erreur de base de données

```bash
# Vérifier la connexion
php artisan db:show

# Reset la DB
php artisan migrate:fresh --seed
```

### Les assets ne se chargent pas

```bash
# Effacer les caches
make clear

# Rebuilder les assets
npm run build
```

### Concurrently ne fonctionne pas

```bash
# Réinstaller
npm install --save-dev concurrently

# Ou utiliser les services séparés
./dev.sh start  # Terminal 1
./dev.sh queue  # Terminal 2
npm run dev     # Terminal 3
```

## 📚 Plus d'informations

- Documentation complète : [README.dev.md](./README.dev.md)
- Liste des scripts : `./dev.sh help` ou `make help`
- Routes disponibles : `php artisan route:list`
- Configuration : `php artisan config:show`

## 🆘 Besoin d'aide ?

1. Vérifier les logs : `php artisan pail`
2. Effacer les caches : `make clear`
3. Vérifier le statut : `make status`
4. Consulter la documentation Laravel : https://laravel.com/docs

## 💡 Astuces

### Raccourcis utiles

```bash
# Créer un alias dans votre .bashrc ou .zshrc
alias td="./dev.sh"
alias tm="make"

# Puis utiliser:
td all      # ./dev.sh all
tm dev      # make dev
```

### VSCode

Installez ces extensions recommandées :
- PHP Intelephense
- Laravel Blade Snippets
- ESLint
- Prettier
- Tailwind CSS IntelliSense

### PhpStorm

- Activer le support Laravel dans Settings → PHP → Laravel
- Installer le plugin "Laravel Idea"

---

**Bon développement ! 🎉**
