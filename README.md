# Time Is Money

<p align="center">
  <img src="https://img.shields.io/badge/Status-Production%20Ready-success?style=for-the-badge" alt="Production Ready">
  <img src="https://img.shields.io/badge/License-Proprietary-red?style=for-the-badge" alt="Proprietary License">
</p>

## 📋 À Propos

**Time Is Money** est une solution SaaS professionnelle de gestion du temps et de facturation, conçue pour les freelances, PME et grandes entreprises. L'application offre une conformité totale avec les réglementations françaises (NF525, Chorus Pro, FacturX) tout en proposant une expérience utilisateur moderne.

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

## 🚀 Offres Disponibles

### Version SaaS (Recommandée)
Notre solution hébergée clés en main avec support premium :
- 🌐 Hébergement cloud sécurisé en France
- 🔄 Mises à jour automatiques
- 🛟 Support technique prioritaire
- 📊 Monitoring et sauvegardes inclus
- 🔒 Conformité RGPD garantie

**Découvrez nos plans tarifaires sur [notre site](https://timeismoney.com/pricing)**

### Version Communautaire
Pour les équipes techniques souhaitant auto-héberger :
- 💻 Code source disponible
- 🔧 Installation et configuration autonome
- 📚 Documentation complète
- 👥 Support via la communauté

#### Prérequis Techniques
- Serveur Linux/Windows
- PHP 8.3+ avec Composer
- Node.js 18+ avec NPM
- MySQL/MariaDB ou SQLite 3
- Compétences en administration système

[Accéder à la documentation d'installation →](#installation-communautaire)

## 📞 Support & Contact

### Pour les clients SaaS
- **Support Prioritaire** : support@timeismoney.com
- **Téléphone** : +33 (0)1 XX XX XX XX
- **Chat en ligne** : Disponible sur votre dashboard

### Pour la version communautaire
- **Documentation** : https://docs.timeismoney.com
- **Forum Communautaire** : https://community.timeismoney.com
- **GitHub Discussions** : Pour les questions techniques

## 🔒 Sécurité

La sécurité de vos données est notre priorité :

- ✅ Cryptage de niveau bancaire (AES-256)
- ✅ Sauvegardes automatiques quotidiennes
- ✅ Infrastructure redondante
- ✅ Conformité RGPD totale
- ✅ Hébergement France (données souveraines)
- ✅ Audits de sécurité réguliers

### Signaler une Vulnérabilité
Pour signaler une vulnérabilité de sécurité : security@timeismoney.com

## 📄 License

Ce logiciel est propriétaire et protégé par le droit d'auteur. Tous droits réservés.

### Version SaaS
L'utilisation de la version SaaS est soumise à nos [Conditions Générales d'Utilisation](https://timeismoney.com/terms).

### Version Communautaire
L'utilisation de la version communautaire est soumise à une licence spécifique permettant l'auto-hébergement pour usage personnel ou commercial, sans redistribution du code source.

---

## Installation Communautaire

<details>
<summary><strong>📦 Guide d'Installation Complet</strong> (Cliquez pour développer)</summary>

### Prérequis Système
- PHP >= 8.3
- Composer >= 2.0
- Node.js >= 18.0
- MySQL/MariaDB >= 10.6 ou SQLite 3
- Redis (optionnel, pour les queues)

### Installation Rapide

```bash
# 1. Cloner le repository
git clone https://github.com/votre-organisation/timeismoney2.git
cd timeismoney2

# 2. Installer les dépendances
composer install --optimize-autoloader
npm install

# 3. Configuration
cp .env.example .env
php artisan key:generate

# 4. Configuration de la base de données
# Éditez le fichier .env avec vos paramètres

# 5. Installation automatique
php artisan app:install-production

# 6. Lancer l'application
php artisan serve
```

### Configuration Avancée

#### Variables d'Environnement Importantes

```env
APP_NAME="Time Is Money"
APP_ENV=production
APP_URL=https://votre-domaine.com
DB_CONNECTION=mysql
DB_DATABASE=timeismoney2
# ... autres configurations
```

### Commandes Utiles

```bash
# Créer un super administrateur
php artisan admin:create-super

# Générer les clés VAPID
php artisan vapid:generate

# Initialiser les seuils TVA
php artisan vat:initialize-thresholds

# Télécharger les schémas FacturX
php artisan facturx:download-schemas
```

Pour plus de détails, consultez la [documentation complète](https://docs.timeismoney.com).

</details>

---

<p align="center">
  Made with ❤️ in France
  <br>
  <strong>Time Is Money</strong> - Votre temps a de la valeur, gérez-le efficacement !
</p>
