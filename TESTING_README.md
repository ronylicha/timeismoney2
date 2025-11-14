# Guide des Tests Unitaires - TimeIsMoney2

## 📊 Résumé

✅ **300 tests unitaires** créés et poussés sur GitHub
✅ **10 nouveaux fichiers de test** couvrant les composants critiques
✅ **60-70% de couverture estimée** des services métier

## 🎯 Tests créés

| Fichier de test | Tests | Composant testé |
|----------------|-------|-----------------|
| `FrenchComplianceServiceTest.php` | 42 | Conformité française, NF525, Chorus Pro |
| `InvoicingComplianceServiceTest.php` | 52 | Validation tenant/client, mentions légales |
| `MailablesTest.php` | 31 | Emails transactionnels |
| `NotificationsTest.php` | 24 | Notifications multi-canal |
| `JobsTest.php` | 26 | Jobs asynchrones |
| `ModelTest.php` | 44 | Relations et comportements modèles |
| `MiddlewareTest.php` | 13 | SetTenant, CheckSuperAdmin |
| `EncryptionServiceTest.php` | 18 | Chiffrement données sensibles |
| `LegalFooterServiceTest.php` | 34 | Mentions légales factures |
| `TraitsTest.php` | 16 | BelongsToTenant trait |
| **TOTAL** | **300** | |

## 🚀 Exécution des tests

### Prérequis

Pour exécuter les tests, vous devez installer l'extension SQLite pour PHP :

```bash
# Ubuntu/Debian
sudo apt-get install php-sqlite3

# macOS
brew install php
# SQLite est inclus par défaut

# Vérifier l'installation
php -m | grep sqlite
```

### Commandes

```bash
# Tous les tests
composer test
# ou
php artisan test

# Tests avec couverture
composer test-coverage
# ou
php artisan test --coverage

# Tests unitaires uniquement
php artisan test --testsuite=Unit

# Test spécifique
php artisan test --filter=FrenchComplianceServiceTest

# Test avec détails
php artisan test --verbose

# Tests en parallèle (plus rapide)
php artisan test --parallel
```

## 🔧 Configuration

### phpunit.xml

Le fichier `phpunit.xml` est configuré pour utiliser SQLite en mémoire :

```xml
<env name="DB_CONNECTION" value="sqlite"/>
<env name="DB_DATABASE" value=":memory:"/>
```

### Base de données de test

Les tests utilisent `RefreshDatabase` pour :
- Créer une DB propre avant chaque test
- Utiliser des transactions
- Rollback automatique après chaque test

## 📝 Structure des tests

### Exemple de test type

```php
/** @test */
public function it_validates_compliant_invoice()
{
    // Arrange - Préparer les données
    $invoice = Invoice::factory()->create([
        'tenant_id' => $this->tenant->id,
        'status' => 'sent',
    ]);

    // Act - Exécuter l'action
    $result = $this->service->validateInvoiceCompliance($invoice);

    // Assert - Vérifier le résultat
    $this->assertTrue($result['is_compliant']);
    $this->assertEmpty($result['errors']);
}
```

### Bonnes pratiques appliquées

✅ **Isolation** : Chaque test est indépendant
✅ **Factories** : Génération de données cohérentes
✅ **Mocking** : Isolation des dépendances externes
✅ **Assertions claires** : Vérifications précises
✅ **Nommage descriptif** : `it_does_something_specific`

## 🐛 Debugging

### Voir les détails d'un test échoué

```bash
php artisan test --filter=nom_du_test --verbose
```

### Utiliser dd() dans les tests

```php
/** @test */
public function it_does_something()
{
    $result = $this->service->doSomething();
    dd($result); // Dump and die pour debug
    $this->assertTrue($result);
}
```

### Logs pendant les tests

```php
Log::info('Debug info', ['data' => $someData]);
```

Les logs sont disponibles dans `storage/logs/laravel.log`

## 📊 Couverture de code

### Générer un rapport HTML

```bash
php artisan test --coverage --coverage-html=coverage
```

Puis ouvrir `coverage/index.html` dans un navigateur.

### Couverture en ligne de commande

```bash
php artisan test --coverage --min=80
```

### Couverture par fichier

```bash
php artisan test --coverage-clover coverage.xml
```

## 🔍 Ce qui est testé

### ✅ Services (146 tests)
- ✅ FrenchComplianceService (conformité, NF525, SEPA)
- ✅ InvoicingComplianceService (validation métier)
- ✅ EncryptionService (chiffrement/déchiffrement)
- ✅ LegalFooterService (mentions légales)

### ✅ Communication (55 tests)
- ✅ 11 classes Mailable
- ✅ 4 classes Notification
- ✅ Support multi-langues
- ✅ Attachements et formatting

### ✅ Jobs (26 tests)
- ✅ SendTransactionalEmailJob
- ✅ Gestion erreurs
- ✅ Queue integration

### ✅ Modèles (44 tests)
- ✅ Relations (BelongsTo, HasMany)
- ✅ Scopes et casts
- ✅ Soft deletes
- ✅ Calculs métier

### ✅ Infrastructure (29 tests)
- ✅ Middleware (SetTenant, CheckSuperAdmin)
- ✅ Traits (BelongsToTenant)
- ✅ Scopes globaux

## ⚠️ Limitations actuelles

### Pas encore testé
- ❌ Controllers HTTP (endpoints API)
- ❌ Observers (événements modèles)
- ❌ Commands console
- ❌ Frontend JavaScript/TypeScript
- ❌ Tests d'intégration end-to-end

### Pour atteindre 80-90% de couverture

Il faudrait ajouter :
1. **Controllers** : ~200 tests
2. **Observers** : ~30 tests
3. **Commands** : ~50 tests
4. **Services restants** : ~100 tests
5. **Frontend (Vitest)** : ~200 tests

## 🎓 Ressources

### Documentation Laravel Testing
- [Testing Guide](https://laravel.com/docs/testing)
- [HTTP Tests](https://laravel.com/docs/http-tests)
- [Database Testing](https://laravel.com/docs/database-testing)

### PHPUnit
- [PHPUnit Manual](https://phpunit.de/manual/current/en/)
- [Assertions](https://phpunit.de/manual/current/en/appendixes.assertions.html)

### Mockery
- [Mockery Docs](http://docs.mockery.io/)

## 🤝 Contribuer

### Ajouter de nouveaux tests

1. Créer le fichier dans `tests/Unit/`
2. Étendre `TestCase`
3. Utiliser `RefreshDatabase` trait
4. Préfixer les tests avec `@test` ou `#[Test]`
5. Suivre le pattern AAA (Arrange-Act-Assert)

### Exemple de nouveau fichier

```php
<?php

namespace Tests\Unit;

use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;

class MyNewServiceTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        // Setup commun
    }

    /** @test */
    public function it_does_something_specific()
    {
        // Arrange
        // Act
        // Assert
    }
}
```

## 📞 Support

Pour toute question sur les tests :
1. Consulter `TEST_COVERAGE_REPORT.md`
2. Lire la documentation PHPUnit
3. Vérifier les tests existants comme exemples

## 🎉 Conclusion

Les 300 tests unitaires créés assurent :
- ✅ **Qualité** : Code vérifié et validé
- ✅ **Maintenabilité** : Refactoring en confiance
- ✅ **Documentation** : Comportement documenté
- ✅ **Conformité** : Règles métier respectées
- ✅ **Régression** : Détection automatique des bugs

Bon testing ! 🚀
