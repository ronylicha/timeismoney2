# Time Is Money 2

## 🚀 Application de Gestion du Temps Multi-tenant

**Time Is Money 2** est une application complète de gestion du temps et de facturation, conçue pour les freelances, équipes et entreprises. Elle offre un suivi du temps précis, une facturation conforme aux normes françaises, et fonctionne même hors ligne.

## ✨ Fonctionnalités Principales

### 📊 Gestion du Temps
- ⏱️ Timer temps réel avec mode offline
- 📅 TimeSheet journalier/hebdomadaire/mensuel
- 📈 Rapports détaillés et analytics
- 🔄 Synchronisation automatique online/offline

### 💼 Gestion de Projets
- 📁 Projets multi-équipes
- ✅ Système de tâches complet
- 🎯 Vue Kanban interactive
- 📋 Templates réutilisables

### 💰 Facturation Conforme France
- 🇫🇷 Conformité NF525 (loi anti-fraude TVA)
- 📄 Intégration Chorus Pro (secteur public)
- 💶 Gestion TVA multiple
- 📊 Export FEC pour comptabilité

### 👥 Multi-tenant
- 🏢 Support individuel, équipe et entreprise
- 🔐 Permissions granulaires
- 🤝 Collaboration inter-équipes
- 🎨 Personnalisation par tenant

### 📱 Progressive Web App
- 💾 Mode offline complet avec SQLite
- 📲 Installation native sur mobile/desktop
- 🔔 Notifications push
- ⚡ Performance optimisée

## 🛠️ Technologies

### Backend
- **Laravel 12** - Framework PHP moderne
- **MariaDB** - Base de données principale
- **Laravel Sanctum** - Authentification API
- **Spatie Permissions** - Gestion des rôles
- **DomPDF** - Génération PDF

### Frontend
- **React 18** - Framework UI
- **TypeScript** - Typage fort
- **Redux Toolkit** - State management
- **TanStack Query** - Data fetching
- **Tailwind CSS** - Styling
- **Vite** - Build tool

### PWA & Offline
- **Service Worker** - Cache et sync
- **SQLite WASM** - Base de données locale
- **IndexedDB** - Stockage navigateur
- **Workbox** - PWA toolkit

## 📦 Installation

### Prérequis
- PHP 8.3+
- Composer 2.x
- Node.js 18+
- MariaDB 10.6+

### Installation Rapide

```bash
# 1. Cloner le repository
git clone https://github.com/votre-username/timeismoney2.git
cd timeismoney2

# 2. Installer les dépendances PHP
composer install

# 3. Installer les dépendances JavaScript
npm install

# 4. Copier et configurer .env
cp .env.example .env
php artisan key:generate

# 5. Configurer la base de données dans .env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=timeismoney2
DB_USERNAME=votre_username
DB_PASSWORD=votre_password

# 6. Exécuter les migrations
php artisan migrate --seed

# 7. Compiler les assets
npm run build

# 8. Lancer le serveur de développement
php artisan serve
# Dans un autre terminal
npm run dev
```

## 🚀 Démarrage Rapide

### Accès à l'application
Ouvrez votre navigateur et accédez à : `http://localhost:8000`

### Compte de démonstration
- **Email** : admin@timeismoney.fr
- **Mot de passe** : password

### Configuration initiale
1. Connectez-vous avec le compte admin
2. Créez votre organisation dans Settings > Tenant
3. Invitez vos utilisateurs
4. Configurez vos projets et clients
5. Commencez à tracker votre temps !

## 📱 Installation PWA

### Sur Desktop (Chrome/Edge)
1. Visitez l'application
2. Cliquez sur l'icône d'installation dans la barre d'adresse
3. Suivez les instructions

### Sur Mobile
1. **iOS** : Ajoutez à l'écran d'accueil depuis Safari
2. **Android** : Chrome affichera une bannière d'installation

## 🔄 Mode Offline

L'application fonctionne complètement hors ligne :
- Les données sont stockées localement dans SQLite
- La synchronisation se fait automatiquement au retour en ligne
- Les conflits sont gérés intelligemment
- Notifications des changements synchronisés

## 📊 Conformité Fiscale Française

### NF525 - Loi Anti-fraude TVA
- ✅ Inaltérabilité des données
- ✅ Sécurisation par hash
- ✅ Conservation 6 ans minimum
- ✅ Archivage sécurisé

### Chorus Pro
- ✅ Envoi automatique factures B2G
- ✅ Format Factur-X/ZUGFeRD
- ✅ Suivi statut en temps réel

### Export Comptable
- ✅ Format FEC conforme
- ✅ Export des écritures comptables
- ✅ Compatible avec tous logiciels comptables

## 🔐 Sécurité

- 🔒 Authentification 2FA disponible
- 🛡️ Chiffrement des données sensibles
- 📝 Logs d'audit complets
- 🔑 API tokens avec expiration
- 🚫 Protection CSRF/XSS

## 📖 Documentation

### Pour les Développeurs
- [Architecture Technique](docs/ARCHITECTURE.md)
- [API Documentation](docs/API.md)
- [Guide de Contribution](docs/CONTRIBUTING.md)

### Pour les Utilisateurs
- [Guide Utilisateur](docs/USER_GUIDE.md)
- [FAQ](docs/FAQ.md)
- [Tutoriels Vidéo](https://youtube.com/@timeismoney)

## 🤝 Contribution

Les contributions sont les bienvenues ! Consultez notre [Guide de Contribution](docs/CONTRIBUTING.md).

### Comment contribuer
1. Fork le projet
2. Créez votre branche (`git checkout -b feature/AmazingFeature`)
3. Committez vos changements (`git commit -m 'Add some AmazingFeature'`)
4. Push sur la branche (`git push origin feature/AmazingFeature`)
5. Ouvrez une Pull Request

## 🐛 Signaler un Bug

Utilisez l'[Issue Tracker](https://github.com/votre-username/timeismoney2/issues) pour signaler des bugs.

## 📄 Licence

Ce projet est sous licence MIT - voir le fichier [LICENSE](LICENSE) pour plus de détails.

## 👥 Équipe

- **Lead Developer** - [Votre Nom]
- **UI/UX Designer** - [Designer]
- **Backend Developer** - [Backend Dev]

## 📧 Contact

- Email : contact@timeismoney.fr
- Twitter : [@timeismoney](https://twitter.com/timeismoney)
- Site Web : [https://timeismoney.fr](https://timeismoney.fr)

## 🙏 Remerciements

- Laravel Team
- React Team
- Tous les contributeurs open source

---

**Time Is Money 2** - Votre temps a de la valeur, gérez-le efficacement ! ⏰💰