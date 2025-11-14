# Guide d'Installation de SQLite pour les Tests

## 📋 Résumé

**Statut actuel** : 57/310 tests passent sans SQLite (18%)
**Objectif** : Installer SQLite pour exécuter les 253 tests restants (82%)

---

## 🚀 Installation Rapide (Recommandé)

### Option 1: Installation via apt (Ubuntu/Debian)

```bash
# Installer l'extension PHP SQLite
sudo apt-get update
sudo apt-get install -y php8.4-sqlite3

# Vérifier l'installation
php -m | grep -i sqlite

# Devrait afficher :
# pdo_sqlite
# sqlite3
```

### Option 2: Installation via PECL

```bash
# Installer PECL si nécessaire
sudo apt-get install -y php-pear php8.4-dev

# Installer l'extension SQLite
sudo pecl install pdo_sqlite

# Activer l'extension
echo "extension=pdo_sqlite.so" | sudo tee /etc/php/8.4/cli/conf.d/20-pdo_sqlite.ini
echo "extension=sqlite3.so" | sudo tee /etc/php/8.4/cli/conf.d/20-sqlite3.ini

# Redémarrer PHP (si nécessaire)
sudo service php8.4-fpm restart  # Pour PHP-FPM
```

### Option 3: Compilation Manuelle

```bash
# Télécharger les sources PHP 8.4
cd /tmp
wget https://www.php.net/distributions/php-8.4.1.tar.gz
tar -xzf php-8.4.1.tar.gz
cd php-8.4.1/ext/pdo_sqlite

# Compiler l'extension
phpize
./configure
make
sudo make install

# Activer l'extension
echo "extension=pdo_sqlite.so" | sudo tee /etc/php/8.4/cli/conf.d/20-pdo_sqlite.ini

# Vérifier
php -m | grep pdo_sqlite
```

---

## ✅ Vérification de l'Installation

```bash
# Vérifier que SQLite est bien chargé
php -r "var_dump(extension_loaded('pdo_sqlite'));"
# Devrait afficher: bool(true)

# Vérifier la version de SQLite
php -r "echo SQLite3::version()['versionString'];"
# Devrait afficher la version (ex: 3.37.2)

# Tester une connexion SQLite
php -r "new PDO('sqlite::memory:');" && echo "SQLite fonctionne!"
```

---

## 🧪 Exécution des Tests après Installation

### Exécuter tous les tests

```bash
# Tous les tests unitaires
php artisan test --testsuite=Unit

# Tests avec couverture
php artisan test --coverage

# Tests avec couverture minimale requise
php artisan test --coverage --min=80
```

### Tester uniquement les tests nécessitant SQLite

```bash
# Services
php artisan test tests/Unit/FrenchComplianceServiceTest.php
php artisan test tests/Unit/InvoicingComplianceServiceTest.php
php artisan test tests/Unit/LegalFooterServiceTest.php
php artisan test tests/Unit/CreditNoteServiceTest.php

# Modèles
php artisan test tests/Unit/ModelTest.php

# Communication
php artisan test tests/Unit/MailablesTest.php
php artisan test tests/Unit/NotificationsTest.php
php artisan test tests/Unit/JobsTest.php

# Middleware & Traits
php artisan test tests/Unit/MiddlewareTest.php
php artisan test tests/Unit/TraitsTest.php
```

---

## 📊 Tests par Catégorie

### ✅ Tests Passants Sans SQLite (57 tests)

| Suite de Tests | Tests | Assertions | Status |
|---|---|---|---|
| EncryptionServiceTest | 15 | 34 | ✅ 100% |
| VatRulesServiceTest | 19 | 100 | ✅ 100% |
| ElectronicSignatureServiceTest | 13/15 | 70 | ⚠️ 87% |
| XsdValidationServiceTest | 6 | 28 | ✅ 100% |
| PdpSubmissionTest | 3 | 114 | ✅ 100% |
| ExampleTest | 1 | 1 | ✅ 100% |

### ⏳ Tests Nécessitant SQLite (253 tests)

| Suite de Tests | Tests | Description |
|---|---|---|
| FrenchComplianceServiceTest | 42 | Conformité NF525, Chorus Pro |
| InvoicingComplianceServiceTest | 52 | Validation tenant/client |
| LegalFooterServiceTest | 34 | Mentions légales |
| CreditNoteServiceTest | 8 | Avoirs |
| ModelTest | 44 | Relations Eloquent |
| MailablesTest | 31 | Emails |
| NotificationsTest | 24 | Notifications |
| JobsTest | 26 | Jobs asynchrones |
| MiddlewareTest | 13 | Middleware |
| TraitsTest | 16 | Traits multi-tenant |
| PdpServiceTest | 2 | Service PDP |
| StripeEncryptionTest | 1 | Chiffrement Stripe |
| TimestampSettingsValidationTest | ~10 | Validation config timestamp |

---

## 🔧 Dépannage

### Erreur: "could not find driver (Connection: sqlite)"

**Cause**: Extension PHP SQLite manquante

**Solution**:
```bash
# Vérifier les extensions chargées
php -m | grep -i pdo

# Si pdo_sqlite n'apparaît pas, installer :
sudo apt-get install php8.4-sqlite3
```

### Erreur: "unable to open database file"

**Cause**: Permissions ou chemin invalide

**Solution**:
```bash
# Vérifier la configuration dans phpunit.xml
cat phpunit.xml | grep DB_DATABASE
# Devrait être: <env name="DB_DATABASE" value=":memory:"/>

# Vérifier les permissions du dossier storage
chmod -R 775 storage/
```

### Erreur: "SQLSTATE[HY000] General error: 1 no such table"

**Cause**: Migrations non exécutées

**Solution**:
```bash
# Les tests utilisent RefreshDatabase
# Vérifier que les migrations sont présentes
ls -la database/migrations/

# Forcer le refresh des migrations
php artisan migrate:fresh --env=testing
```

### Tests très lents

**Cause**: RefreshDatabase recrée la DB à chaque test

**Optimisations**:
```bash
# Utiliser SQLite en mémoire (déjà configuré dans phpunit.xml)
# Utiliser LazilyRefreshDatabase au lieu de RefreshDatabase (optionnel)
# Paralléliser les tests
php artisan test --parallel
```

---

## 📈 Résultats Attendus après Installation

**Avant SQLite** :
- Tests passants: 57/310 (18%)
- Tests échouant: 253/310 (82%)
- Durée: ~14 secondes

**Après SQLite** (estimé):
- Tests passants: ~290/310 (94%)
- Tests échouant: ~20/310 (6%)
- Durée: ~45-60 secondes

**Problèmes potentiels** :
- ~5-10 tests pourraient échouer à cause de données de test manquantes
- ~5-10 tests pourraient échouer à cause de services externes (timestamp, HSM)

---

## 🎯 Prochaines Étapes

1. **Installer SQLite** (5 min)
   ```bash
   sudo apt-get install php8.4-sqlite3
   ```

2. **Exécuter tous les tests** (2 min)
   ```bash
   php artisan test
   ```

3. **Corriger les échecs restants** (30-60 min)
   - Analyser les erreurs
   - Ajuster les données de test
   - Mocker les services externes

4. **Générer le rapport de couverture** (5 min)
   ```bash
   php artisan test --coverage --coverage-html coverage/
   firefox coverage/index.html
   ```

5. **Atteindre 100% de couverture** (variable)
   - Identifier les lignes non couvertes
   - Ajouter des tests pour les cas manquants
   - Itérer jusqu'à 100%

---

## 💡 Alternatives à SQLite

Si l'installation de SQLite n'est pas possible :

### MySQL/MariaDB

```bash
# Installer MySQL
sudo apt-get install mysql-server php8.4-mysql

# Créer une base de test
mysql -u root -p
CREATE DATABASE timeismoney_test;
GRANT ALL ON timeismoney_test.* TO 'test'@'localhost' IDENTIFIED BY 'password';

# Modifier phpunit.xml
<env name="DB_CONNECTION" value="mysql"/>
<env name="DB_HOST" value="127.0.0.1"/>
<env name="DB_PORT" value="3306"/>
<env name="DB_DATABASE" value="timeismoney_test"/>
<env name="DB_USERNAME" value="test"/>
<env name="DB_PASSWORD" value="password"/>
```

### PostgreSQL

```bash
# Installer PostgreSQL
sudo apt-get install postgresql php8.4-pgsql

# Créer une base de test
sudo -u postgres psql
CREATE DATABASE timeismoney_test;
CREATE USER test WITH PASSWORD 'password';
GRANT ALL PRIVILEGES ON DATABASE timeismoney_test TO test;

# Modifier phpunit.xml
<env name="DB_CONNECTION" value="pgsql"/>
<env name="DB_HOST" value="127.0.0.1"/>
<env name="DB_PORT" value="5432"/>
<env name="DB_DATABASE" value="timeismoney_test"/>
<env name="DB_USERNAME" value="test"/>
<env name="DB_PASSWORD" value="password"/>
```

---

## 📞 Support

Si vous rencontrez des problèmes :

1. **Vérifier les logs**
   ```bash
   tail -f storage/logs/laravel.log
   ```

2. **Mode debug**
   ```bash
   php artisan test --debug
   ```

3. **Tests individuels**
   ```bash
   php artisan test --filter=test_method_name
   ```

4. **Désactiver Xdebug** (si installé, ralentit les tests)
   ```bash
   php -d xdebug.mode=off artisan test
   ```

---

**Créé le**: 14 Novembre 2025
**Version PHP**: 8.4.14
**Version Laravel**: 11.x
**Extension requise**: pdo_sqlite, sqlite3
