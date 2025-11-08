# Time Is Money - Guide de Développement

## 🚀 Démarrage Rapide

### Installation Initiale

```bash
# 1. Copier le fichier .env
cp .env.example .env

# 2. Configuration initiale complète
composer setup
# OU
./dev.sh setup
```

### Lancer l'application

#### Option 1 : Tout en un (recommandé)
```bash
# Lance Laravel + Queue + Logs + Vite en parallèle
composer dev-full
# OU
./dev.sh all
```

#### Option 2 : Services séparés
```bash
# Serveur Laravel uniquement
composer dev
# OU
./dev.sh start

# Dans un autre terminal - Queue worker
./dev.sh queue

# Dans un autre terminal - Vite dev server
./dev.sh vite
# OU
npm run dev
```

## 📋 Scripts Composer Disponibles

| Script | Description |
|--------|-------------|
| `composer setup` | Installation complète (dépendances, migration, seed) |
| `composer dev` | Lance le serveur Laravel |
| `composer dev-full` | Lance tous les services (Laravel + Queue + Logs + Vite) |
| `composer serve` | Alias pour `composer dev` |
| `composer queue` | Lance le queue worker |
| `composer fresh` | Réinitialise la DB et seed |
| `composer optimize` | Optimise pour la production |
| `composer clear` | Efface tous les caches |
| `composer test` | Lance les tests |
| `composer test-coverage` | Lance les tests avec couverture |
| `composer format` | Formate le code avec Pint |

## 🛠️ Scripts Shell (./dev.sh)

```bash
./dev.sh [command]
```

### Commandes disponibles :

| Commande | Description |
|----------|-------------|
| `start` ou `serve` | Lance le serveur Laravel |
| `queue` | Lance le queue worker |
| `vite` | Lance Vite dev server |
| `all` | Lance tous les services |
| `setup` | Installation initiale |
| `migrate` | Lance les migrations |
| `seed` | Seed la base de données |
| `fresh` | Migration fresh + seed |
| `clear` | Efface les caches |
| `optimize` | Optimise pour la production |
| `help` | Affiche l'aide |

## 🌐 URLs de Développement

- **Application Laravel** : http://localhost:8000
- **Vite Dev Server** : http://localhost:5173
- **API** : http://localhost:8000/api

## 🔧 Configuration .env

Assurez-vous de configurer ces variables dans votre fichier `.env` :

```env
# Application
APP_NAME="Time Is Money"
APP_ENV=local
APP_DEBUG=true
APP_URL=http://localhost:8000

# Base de données
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=timeismoney2
DB_USERNAME=root
DB_PASSWORD=

# Queue (pour les jobs asynchrones)
QUEUE_CONNECTION=database

# Mail (pour les notifications)
MAIL_MAILER=smtp
MAIL_HOST=mailpit
MAIL_PORT=1025
MAIL_USERNAME=null
MAIL_PASSWORD=null
MAIL_ENCRYPTION=null
MAIL_FROM_ADDRESS="noreply@timeismoney.local"
MAIL_FROM_NAME="${APP_NAME}"

# Pusher (notifications push - optionnel)
BROADCAST_DRIVER=log

# Chorus Pro (optionnel)
CHORUS_PRO_MODE=test
CHORUS_PRO_LOGIN=
CHORUS_PRO_PASSWORD=
CHORUS_PRO_TECH_USER=
CHORUS_PRO_SERVICE_CODE=

# Web Push (notifications PWA - optionnel)
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=
```

## 📦 Dépendances Requises

### Backend
- PHP >= 8.2
- Composer
- MySQL >= 8.0 ou PostgreSQL >= 13
- Extensions PHP : BCMath, Ctype, Fileinfo, JSON, Mbstring, OpenSSL, PDO, Tokenizer, XML

### Frontend
- Node.js >= 18
- NPM ou Yarn

## 🏗️ Architecture

```
timeismoney2/
├── app/                    # Application Laravel
│   ├── Http/
│   │   ├── Controllers/    # Contrôleurs API
│   │   └── Middleware/     # Middlewares
│   ├── Models/             # Modèles Eloquent
│   └── Services/           # Services métier
├── resources/
│   ├── js/                 # Application React/TypeScript
│   │   ├── components/     # Composants réutilisables
│   │   ├── pages/          # Pages de l'application
│   │   ├── hooks/          # Hooks React personnalisés
│   │   └── utils/          # Utilitaires
│   └── views/              # Templates Blade
├── routes/
│   ├── api.php             # Routes API
│   └── web.php             # Routes web
├── database/
│   ├── migrations/         # Migrations
│   └── seeders/            # Seeders
└── public/                 # Assets publics
```

## 🧪 Tests

```bash
# Lancer tous les tests
composer test

# Tests avec couverture
composer test-coverage

# Tests spécifiques
php artisan test --filter=UserTest
```

## 🐛 Debugging

### Logs Laravel
```bash
# Voir les logs en temps réel
php artisan pail

# OU
tail -f storage/logs/laravel.log
```

### Cache Clearing
```bash
# Effacer tous les caches
composer clear

# OU
php artisan optimize:clear
php artisan cache:clear
php artisan config:clear
php artisan route:clear
php artisan view:clear
```

## 📝 Fonctionnalités Principales

### ✅ Déjà Implémentées

1. **Authentification & Sécurité**
   - Connexion/Inscription
   - 2FA (Google Authenticator)
   - Gestion des sessions
   - Codes de récupération

2. **Gestion du Temps**
   - Timer de temps réel
   - TimeSheet (jour/semaine/mois)
   - Approbation des temps
   - Export des temps

3. **Gestion de Projets**
   - CRUD Projets
   - Kanban des tâches
   - Assignation d'utilisateurs
   - Statuts personnalisés

4. **Facturation NF525**
   - Création de factures
   - Génération PDF
   - Inaltérabilité (NF525)
   - Hash SHA-256
   - Export FEC comptable
   - Intégration Chorus Pro

5. **Administration**
   - Dashboard admin
   - Gestion des utilisateurs
   - Gestion des tenants
   - Paramètres système
   - Journaux d'audit

6. **PWA & Offline**
   - Progressive Web App
   - Service Worker
   - SQLite WASM
   - Synchronisation offline

7. **Notifications**
   - Push notifications
   - Email notifications
   - Préférences personnalisables

## 🚀 Déploiement Production

```bash
# 1. Optimiser l'application
composer optimize

# 2. Build des assets
npm run build

# 3. Mettre en mode production
php artisan config:cache
php artisan route:cache
php artisan view:cache

# 4. Permissions
chmod -R 755 storage bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache
```

## 🔒 Sécurité

- CSRF Protection activée
- XSS Protection
- SQL Injection Protection (Eloquent ORM)
- Rate Limiting sur les API
- Validation des entrées
- Hash des mots de passe (bcrypt)
- 2FA disponible

## 📚 Documentation Technique

### Stack Technique

**Backend:**
- Laravel 12
- PHP 8.3+
- MySQL 8.0+
- Laravel Sanctum (API Auth)

**Frontend:**
- React 18
- TypeScript
- TanStack Query (React Query)
- Tailwind CSS
- Vite

**Librairies:**
- dompdf (génération PDF)
- Maatwebsite Excel (exports)
- web-push (notifications)
- Google2FA (2FA)

## 🤝 Support

Pour toute question ou problème :
1. Vérifier les logs : `php artisan pail`
2. Effacer les caches : `composer clear`
3. Vérifier la configuration : `php artisan config:show`

## 📄 Licence

MIT License
