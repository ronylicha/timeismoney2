# Time Is Money

<p align="center">
  <img src="https://img.shields.io/badge/Laravel-12-red?style=for-the-badge&logo=laravel" alt="Laravel 12">
  <img src="https://img.shields.io/badge/React-18-blue?style=for-the-badge&logo=react" alt="React 18">
  <img src="https://img.shields.io/badge/TypeScript-5.9-blue?style=for-the-badge&logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="MIT License">
</p>

## 📋 À Propos

**Time Is Money** est une solution open source complète de gestion du temps et de facturation, conçue pour les freelances, PME et grandes entreprises. L'application offre une conformité totale avec les réglementations françaises (NF525, Chorus Pro, FacturX) tout en proposant une expérience utilisateur moderne avec support offline et PWA.

## ✨ Fonctionnalités Principales

### 🎯 Core Features
- **Gestion du Temps** - Timer temps réel, TimeSheet avancé, mode offline complet
- **Facturation Conforme** - NF525, Chorus Pro, FacturX/ZUGFeRD, signature électronique
- **Gestion de Projets** - Vue Kanban, Gantt, templates réutilisables
- **Multi-tenant** - Support SaaS complet avec isolation des données
- **Progressive Web App** - Installation native, notifications push, sync offline
- **Analytics** - Dashboards personnalisables, rapports détaillés, export FEC

### 🇫🇷 Conformité Française
- ✅ Loi Anti-fraude TVA (NF525)
- ✅ Intégration Chorus Pro (B2G)
- ✅ Format FacturX EXTENDED
- ✅ Export FEC pour comptabilité
- ✅ Signature électronique qualifiée
- ✅ Horodatage certifié

## 🚀 Installation Rapide

### Prérequis Système
- PHP >= 8.3
- Composer >= 2.0
- Node.js >= 18.0
- MySQL/MariaDB >= 10.6 ou SQLite 3
- Redis (optionnel, pour les queues)

### 🚀 Installation Automatique (Recommandée pour Production)

```bash
# 1. Cloner le repository
git clone https://github.com/votre-username/timeismoney2.git
cd timeismoney2

# 2. Installer les dépendances
composer install --optimize-autoloader
npm install

# 3. Configurer l'environnement
cp .env.example .env
# Éditez le fichier .env avec vos paramètres de base de données

# 4. Lancer l'installation automatique pour production
php artisan app:install-production

# Cette commande effectue automatiquement :
# ✅ Génération de la clé d'application
# ✅ Migration de la base de données
# ✅ Création des rôles et permissions
# ✅ Création interactive du super administrateur
# ✅ Génération des clés VAPID
# ✅ Initialisation des seuils TVA
# ✅ Téléchargement des schémas FacturX
# ✅ Build des assets frontend
# ✅ Optimisation des caches pour production

# 5. Lancer l'application
php artisan serve
```

#### Options de la commande d'installation

```bash
# Installation silencieuse avec paramètres pré-définis
php artisan app:install-production \
    --admin-name="John Doe" \
    --admin-email="admin@timeismoney.com" \
    --admin-password="SecurePassword123"

# Skip certaines étapes si déjà configurées
php artisan app:install-production --skip-npm    # Si assets déjà compilés
php artisan app:install-production --skip-admin  # Si admin déjà créé

# Forcer en production
php artisan app:install-production --force
```

### 📝 Installation Manuelle (Développement ou Personnalisée)

```bash
# 1. Cloner le repository
git clone https://github.com/votre-username/timeismoney2.git
cd timeismoney2

# 2. Installer les dépendances PHP
composer install --optimize-autoloader

# 3. Installer les dépendances JavaScript
npm install

# 4. Configuration de l'environnement
cp .env.example .env
php artisan key:generate

# 5. Configuration de la base de données
# Éditez le fichier .env avec vos paramètres de base de données
# Pour SQLite (développement) :
DB_CONNECTION=sqlite
DB_DATABASE=database/database.sqlite
touch database/database.sqlite

# Pour MySQL/MariaDB (production) :
# DB_CONNECTION=mysql
# DB_HOST=127.0.0.1
# DB_PORT=3306
# DB_DATABASE=timeismoney2
# DB_USERNAME=votre_username
# DB_PASSWORD=votre_password

# 6. Initialisation de la base de données
# Pour développement (avec données de démonstration) :
php artisan migrate:fresh --seed

# Pour production (sans données de démonstration) :
php artisan migrate:fresh
php artisan db:seed --class=Database\Seeders\RolePermissionSeeder

# 7. Créer un super administrateur
php artisan admin:create-super

# 8. Générer les clés VAPID pour les notifications push
php artisan vapid:generate

# 9. Initialiser les seuils TVA (requis pour la conformité française)
php artisan vat:initialize-thresholds

# 10. Télécharger les schémas FacturX (requis pour la facturation)
php artisan facturx:download-schemas

# 11. Compiler les assets
npm run build  # Pour production
npm run dev    # Pour développement

# 12. Optimisation pour la production (optionnel en dev)
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan icons:cache
php artisan filament:cache-components

# 13. Lancer l'application
php artisan serve
```

### Configuration Avancée

#### Variables d'Environnement Importantes

```env
# Application
APP_NAME="Time Is Money"
APP_ENV=production
APP_DEBUG=false
APP_URL=https://votre-domaine.com
APP_TIMEZONE=Europe/Paris

# Base de données
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=timeismoney2
DB_USERNAME=root
DB_PASSWORD=

# Queue (pour les jobs asynchrones)
QUEUE_CONNECTION=database

# Mail
MAIL_MAILER=smtp
MAIL_HOST=smtp.mailgun.org
MAIL_PORT=587
MAIL_USERNAME=
MAIL_PASSWORD=
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=noreply@timeismoney.com
MAIL_FROM_NAME="${APP_NAME}"

# Stripe (paiements)
STRIPE_KEY=pk_live_xxxxx
STRIPE_SECRET=sk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# Chorus Pro (facturation publique)
CHORUS_PRO_ENABLED=true
CHORUS_PRO_MODE=production
CHORUS_PRO_CLIENT_ID=xxxxx
CHORUS_PRO_CLIENT_SECRET=xxxxx

# Stockage
FILESYSTEM_DISK=local
# Pour AWS S3:
# AWS_ACCESS_KEY_ID=
# AWS_SECRET_ACCESS_KEY=
# AWS_DEFAULT_REGION=eu-west-1
# AWS_BUCKET=
```

## 🛠️ Développement

### Lancement en mode développement

```bash
# Terminal 1 - Backend Laravel
php artisan serve

# Terminal 2 - Frontend Vite + React
npm run dev

# Terminal 3 - Queue Worker (optionnel)
php artisan queue:work
```

### Structure du Projet

```
timeismoney2/
├── app/                    # Code source Laravel
│   ├── Console/           # Commandes Artisan
│   ├── Http/              # Controllers, Middleware
│   ├── Models/            # Modèles Eloquent
│   └── Services/          # Logique métier
├── resources/
│   ├── js/                # Code React/TypeScript
│   │   ├── Components/    # Composants React
│   │   ├── Pages/         # Pages de l'application
│   │   ├── Store/         # Redux store
│   │   └── Services/      # API et services
│   └── views/             # Vues Blade
├── database/
│   ├── migrations/        # Migrations de base de données
│   └── seeders/           # Seeders de données
├── public/                # Assets publics
├── storage/               # Fichiers générés
└── tests/                 # Tests unitaires et fonctionnels
```

### Commandes Artisan Utiles

```bash
# Installation & Configuration
php artisan app:install-production      # Installation automatique pour production
php artisan admin:create-super          # Créer un super admin
php artisan vapid:generate              # Générer les clés VAPID
php artisan vat:initialize-thresholds   # Initialiser les seuils TVA
php artisan facturx:download-schemas    # Télécharger les schémas FacturX

# Gestion des utilisateurs
php artisan user:activate {email}       # Activer un utilisateur
php artisan user:deactivate {email}     # Désactiver un utilisateur

# Maintenance
php artisan down                        # Mode maintenance
php artisan up                          # Sortir du mode maintenance
php artisan backup:run                  # Backup de la base de données

# Facturation
php artisan invoice:validate            # Valider l'intégrité des factures
php artisan fec:export                  # Exporter le FEC
php artisan archive:cleanup             # Nettoyer les archives

# Développement
php artisan migrate:fresh --seed        # Réinitialiser la base de données
php artisan cache:clear                 # Vider tous les caches
php artisan queue:failed                # Voir les jobs échoués
```

## 🧪 Tests

```bash
# Lancer tous les tests
php artisan test

# Tests avec coverage
php artisan test --coverage

# Tests spécifiques
php artisan test --filter=InvoiceTest

# Tests JavaScript
npm run test
```

## 📦 Déploiement

### Production avec Docker

```bash
# Build et lancement
docker-compose up -d

# Migrations
docker-compose exec app php artisan migrate --force

# Créer un super admin
docker-compose exec app php artisan admin:create-super
```

### Déploiement sur VPS

1. Cloner le repository sur le serveur
2. Installer les dépendances avec Composer et NPM
3. Configurer Nginx/Apache
4. Configurer SSL avec Let's Encrypt
5. Configurer Supervisor pour les queues
6. Configurer les crons jobs

Exemple de configuration Nginx:

```nginx
server {
    listen 80;
    server_name timeismoney.com;
    root /var/www/timeismoney2/public;

    index index.php;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.3-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }

    location ~ /\.(?!well-known).* {
        deny all;
    }
}
```

### Cron Jobs Requis

Ajoutez cette ligne à votre crontab:

```bash
* * * * * cd /path/to/timeismoney2 && php artisan schedule:run >> /dev/null 2>&1
```

## 🔒 Sécurité

### Bonnes Pratiques

1. **Variables d'environnement** - Ne jamais commiter le fichier `.env`
2. **HTTPS obligatoire** - Forcer HTTPS en production
3. **Headers de sécurité** - Configurer CSP, HSTS, X-Frame-Options
4. **Rate Limiting** - Activer le rate limiting sur les API
5. **2FA** - Encourager l'utilisation de l'authentification 2 facteurs
6. **Backups** - Backups automatiques quotidiens
7. **Monitoring** - Surveiller les logs et les accès

### Signaler une Vulnérabilité

Pour signaler une vulnérabilité de sécurité, merci d'envoyer un email à security@timeismoney.com au lieu d'utiliser le tracker public d'issues.

## 🔐 HSM (Hardware Security Module)

### Configuration pour Développement (Simulator)

Pour le développement local, utilisez le simulateur HSM intégré :

```env
# .env pour développement
HSM_MODE=simulator
HSM_SIMULATOR_KEY_STORAGE=storage/app/hsm-simulator
```

⚠️ **ATTENTION** : Le simulateur HSM est uniquement pour le développement et ne doit JAMAIS être utilisé en production !

### Configuration pour Production

#### Option 1 : AWS CloudHSM / KMS

AWS Key Management Service avec CloudHSM pour une sécurité maximale :

```env
# .env pour production AWS
HSM_MODE=cloud
HSM_CLOUD_PROVIDER=aws
HSM_CLOUD_REGION=eu-west-3  # Paris
HSM_CLOUD_ACCESS_KEY=your_access_key
HSM_CLOUD_SECRET_KEY=your_secret_key
```

**Installation AWS SDK** :
```bash
composer require aws/aws-sdk-php
```

**Coûts approximatifs** :
- AWS KMS : ~1$/mois par clé + 0.03$ pour 10 000 opérations
- AWS CloudHSM : ~1 600$/mois par HSM (haute sécurité)

#### Option 2 : Universign (Recommandé pour la France)

Universign est un Tiers de Confiance français certifié eIDAS, idéal pour la conformité européenne :

```env
# .env pour production Universign
HSM_MODE=cloud
HSM_CLOUD_PROVIDER=universign
UNIVERSIGN_API_USER=your_api_user
UNIVERSIGN_API_PASSWORD=your_api_password
UNIVERSIGN_SANDBOX=false  # true pour tests

# Informations du signataire
UNIVERSIGN_SIGNER_FIRSTNAME=John
UNIVERSIGN_SIGNER_LASTNAME=Doe
UNIVERSIGN_SIGNER_EMAIL=signature@timeismoney.com
UNIVERSIGN_SIGNER_PHONE=+33123456789
```

**Avantages Universign** :
- ✅ Certifié eIDAS (signatures qualifiées QES)
- ✅ Horodatage qualifié inclus
- ✅ Conformité française/européenne
- ✅ Support technique en français
- ✅ Archivage légal intégré

**Coûts approximatifs** :
- Pack Starter : ~99€/mois (100 signatures)
- Pack Business : ~299€/mois (500 signatures)
- Enterprise : Sur devis

**Inscription** : https://www.universign.com

### Utilisation dans l'Application

Le service HSM est automatiquement injecté dans le service de signature électronique :

```php
use App\Services\HSM\HSMManager;

// Obtenir l'instance HSM configurée
$hsm = HSMManager::getInstance();

// Vérifier le statut
$status = $hsm->getStatus();

// Signer un document
$signature = $hsm->sign($data, $keyId);

// Vérifier une signature
$isValid = $hsm->verify($data, $signature, $keyId);
```

### Migration Développement → Production

1. **Phase de Test** (Universign Sandbox)
   ```env
   HSM_MODE=cloud
   HSM_CLOUD_PROVIDER=universign
   UNIVERSIGN_SANDBOX=true
   ```

2. **Génération des Certificats**
   ```bash
   php artisan hsm:generate-certificate --level=QES
   ```

3. **Migration des Clés**
   ```bash
   php artisan hsm:migrate-keys --from=simulator --to=universign
   ```

4. **Validation**
   ```bash
   php artisan hsm:validate-signatures
   ```

5. **Passage en Production**
   ```env
   UNIVERSIGN_SANDBOX=false
   ```

### Niveaux de Signature Électronique

| Niveau | Description | Usage | HSM Requis |
|--------|-------------|-------|------------|
| **SES** | Simple Electronic Signature | Documents internes | Non (Simulator OK) |
| **AES** | Advanced Electronic Signature | Contrats commerciaux | Recommandé |
| **QES** | Qualified Electronic Signature | Équivalent légal signature manuscrite | Obligatoire (Universign/CloudHSM) |

### Conformité eIDAS

Pour être conforme au règlement européen eIDAS :

1. **Signature Qualifiée (QES)** :
   - Utiliser Universign ou un TSP certifié
   - Certificat qualifié obligatoire
   - Horodatage qualifié requis

2. **Conservation des Preuves** :
   - Archives pendant 10 ans minimum
   - Hash chain pour intégrité
   - Stockage sécurisé

3. **Audit Trail** :
   - Logger toutes les opérations
   - IP, User-Agent, timestamp
   - Identité du signataire

### Commandes Artisan HSM

```bash
# Vérifier le statut HSM
php artisan hsm:status

# Lister les clés
php artisan hsm:list-keys

# Générer une nouvelle clé
php artisan hsm:generate-key --id=invoice-2025 --algorithm=RS256

# Tester la signature
php artisan hsm:test-sign --key=main-signing-key

# Migrer les clés vers un nouveau provider
php artisan hsm:migrate --from=simulator --to=universign
```

### Dépannage HSM

| Problème | Solution |
|----------|----------|
| "HSM not configured" | Vérifier les variables d'environnement HSM_MODE |
| "Key not found" | Exécuter `php artisan hsm:generate-key` |
| "Invalid signature" | Vérifier que le même keyId est utilisé |
| "AWS credentials invalid" | Vérifier IAM permissions pour KMS |
| "Universign timeout" | Vérifier connexion réseau et API credentials |

## 🤝 Contribution

Les contributions sont les bienvenues ! Veuillez lire notre [Guide de Contribution](CONTRIBUTING.md) avant de soumettre des Pull Requests.

### Processus de Contribution

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/AmazingFeature`)
3. Commit vos changements (`git commit -m 'Add: Amazing feature'`)
4. Push sur la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

### Standards de Code

- **PHP** : PSR-12
- **JavaScript/TypeScript** : ESLint + Prettier
- **Commits** : Conventional Commits
- **Tests** : Coverage minimum 80%

## 📝 Documentation

- [Documentation Technique](docs/ARCHITECTURE.md)
- [Guide Utilisateur](docs/USER_GUIDE.md)
- [API Documentation](docs/API.md)
- [Guide de Déploiement](docs/DEPLOYMENT.md)
- [FAQ](docs/FAQ.md)

## 🎯 Roadmap

### Version 2.0 (Q2 2025)
- [ ] Application mobile native (React Native)
- [ ] Intégration comptable (Sage, QuickBooks)
- [ ] IA pour prédictions de temps
- [ ] Marketplace de templates

### Version 3.0 (Q4 2025)
- [ ] Support multi-devises
- [ ] Blockchain pour certification
- [ ] API publique complète
- [ ] White-label solution

## 📊 Stack Technique

### Backend
- **Laravel 12** - Framework PHP
- **MySQL/MariaDB** - Base de données principale
- **Redis** - Cache et queues
- **Laravel Sanctum** - Authentification API
- **Spatie Permissions** - Gestion des rôles
- **DomPDF / TCPDF** - Génération PDF

### Frontend
- **React 18** - UI Framework
- **TypeScript 5.9** - Type Safety
- **Redux Toolkit** - State Management
- **TanStack Query** - Data Fetching
- **Tailwind CSS 4** - Styling
- **Vite** - Build Tool

### DevOps
- **Docker** - Containerisation
- **GitHub Actions** - CI/CD
- **PHPUnit** - Tests PHP
- **Jest** - Tests JavaScript
- **Sentry** - Error Tracking

## 📄 License

Ce projet est sous licence MIT. Voir le fichier [LICENSE](LICENSE) pour plus de détails.

## 🙏 Remerciements

- Laravel Team pour le framework extraordinaire
- React Team pour la bibliothèque UI
- Tous les contributeurs open source
- La communauté française de développeurs

## 📧 Support & Contact

- **Email**: support@timeismoney.com
- **Issues**: [GitHub Issues](https://github.com/votre-username/timeismoney2/issues)
- **Discussions**: [GitHub Discussions](https://github.com/votre-username/timeismoney2/discussions)
- **Twitter**: [@timeismoney](https://twitter.com/timeismoney)
- **Discord**: [Rejoindre notre serveur](https://discord.gg/timeismoney)

---

<p align="center">
  Made with ❤️ in France
  <br>
  <strong>Time Is Money</strong> - Votre temps a de la valeur, gérez-le efficacement !
</p>