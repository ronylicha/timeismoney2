# Guide de Dépannage FacturX

## 🔍 Erreurs courantes et solutions

### Erreur 1 : TypeError - DateTimeInterface

**Message :**
```
TypeError: horstoeko\zugferd\ZugferdDocumentBuilder::setDocumentInformation(): 
Argument #3 ($documentDate) must be of type DateTimeInterface, string given
```

**Cause :**  
La méthode attend un objet DateTime mais reçoit une chaîne de caractères.

**Solution :**  
✅ **CORRIGÉ** - Conversion automatique dans `FacturXService.php` lignes 85, 148, 282

**Si l'erreur persiste :**
```php
// Vérifier que les dates sont bien converties
$invoiceDate = is_string($invoice->date) 
    ? new \DateTime($invoice->date) 
    : $invoice->date;
```

---

### Erreur 2 : ArgumentCountError - setDocumentSellerContact

**Message :**
```
ArgumentCountError: Too few arguments to function 
horstoeko\zugferd\ZugferdDocumentBuilder::setDocumentSellerContact(), 
4 passed in line 116 and exactly 5 expected
```

**Cause :**  
La méthode attend 5 paramètres mais n'en reçoit que 4 (paramètre fax manquant).

**Solution :**  
✅ **CORRIGÉ** - 5 paramètres passés correctement lignes 116 et 145

**Paramètres requis :**
1. Nom contact (string)
2. Département (string)
3. Téléphone (string)
4. **Fax (string)** ← souvent oublié
5. Email (string)

---

### Erreur 3 : PDF Generation Failed

**Message :**
```
Spipu\Html2Pdf\Exception\Html2PdfException: Unable to generate PDF
```

**Causes possibles :**

#### A. Mémoire insuffisante
```bash
# Vérifier memory_limit dans php.ini
php -i | grep memory_limit

# Augmenter si nécessaire (>= 256M)
memory_limit = 512M
```

#### B. Extension PHP manquantes
```bash
# Vérifier extensions requises
php -m | grep -E 'gd|mbstring|zip|xml'

# Installer si manquantes
sudo apt-get install php-gd php-mbstring php-zip php-xml
sudo systemctl restart php-fpm
```

#### C. Permissions fichiers
```bash
# Storage doit être writable
chmod -R 775 storage
chown -R www-data:www-data storage
```

---

### Erreur 4 : XML Validation Failed

**Message :**
```
Invalid XML structure - Does not conform to EN 16931
```

**Causes et solutions :**

#### A. Montants invalides
```php
// ❌ MAUVAIS
$total = "1234.56";  // String

// ✅ BON
$total = 1234.56;    // Float/numeric
```

#### B. TVA manquante
```php
// Vérifier que tax_rate existe
if (!$invoice->tax_rate) {
    throw new \Exception('TVA requise pour FacturX');
}
```

#### C. Dates invalides
```php
// Dates doivent être valides
if (!$invoice->date || !strtotime($invoice->date)) {
    throw new \Exception('Date facture invalide');
}
```

---

### Erreur 5 : Attachment Failed

**Message :**
```
Unable to attach XML to PDF
```

**Cause :**  
Le PDF n'est pas au format PDF/A-3 ou problème d'encodage.

**Solution :**

#### Vérifier configuration Html2Pdf
```php
// Dans FacturXService.php
$html2pdf = new Html2Pdf('P', 'A4', 'fr', true, 'UTF-8', [
    10, // marge gauche
    10, // marge haut
    10, // marge droite
    10  // marge bas
]);

// IMPORTANT: Définir PDF/A
$html2pdf->pdf->SetDisplayMode('fullpage');
```

#### Vérifier XML encodage
```php
// XML doit être UTF-8
$xml = $document->getContent();
if (mb_detect_encoding($xml) !== 'UTF-8') {
    $xml = mb_convert_encoding($xml, 'UTF-8');
}
```

---

### Erreur 6 : Missing Required Fields

**Message :**
```
Missing required field: [field_name]
```

**Champs obligatoires EN 16931 :**

✅ **Facture (Invoice) :**
- `invoice_number` (BT-1)
- `invoice_date` (BT-2)
- `invoice_type_code` (BT-3) : 380
- `currency_code` (BT-5) : EUR
- `seller_name` (BT-27)
- `seller_address` (BT-35 à BT-39)
- `buyer_name` (BT-44)
- `buyer_address` (BT-50 à BT-54)
- `total_amount` (BT-112)

✅ **Avoir (Credit Note) :**
- `credit_note_number` (BT-1)
- `credit_note_date` (BT-2)
- `invoice_type_code` (BT-3) : **381**
- `reference_invoice` (BT-25) : numéro facture d'origine
- Tous les autres champs identiques

---

## 🧪 Tests de diagnostic

### Test 1 : Vérifier installation package

```bash
# Vérifier horstoeko/zugferd installé
composer show horstoeko/zugferd

# Version requise : >= 1.0.116
# Si absent ou version < 1.0.116
composer require horstoeko/zugferd:^1.0
```

### Test 2 : Tester génération simple

```php
// Test minimal dans tinker
php artisan tinker

// Créer document test
$doc = \horstoeko\zugferd\ZugferdDocumentBuilder::CreateNew(
    \horstoeko\zugferd\ZugferdProfiles::PROFILE_EN16931
);

$doc->setDocumentInformation(
    'TEST-001',
    \horstoeko\zugferd\codelists\ZugferdInvoiceType::INVOICE,
    new DateTime('2024-11-09'),
    'EUR'
);

// Si pas d'erreur = package OK
echo "Package FacturX fonctionnel\n";
```

### Test 3 : Vérifier données facture

```php
php artisan tinker

// Charger facture
$invoice = App\Models\Invoice::find(1);

// Vérifier champs requis
$checks = [
    'invoice_number' => $invoice->invoice_number,
    'date' => $invoice->date,
    'total_amount' => $invoice->total_amount,
    'client' => $invoice->client ? '✓' : '✗',
    'tenant' => $invoice->tenant ? '✓' : '✗',
];

print_r($checks);
```

### Test 4 : Test génération complète

```bash
# Via API
curl -X POST http://localhost/api/invoices/1/generate-facturx \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o test_facturx.pdf

# Vérifier fichier créé
file test_facturx.pdf
# Doit afficher : PDF document, version 1.4

# Extraire XML
pdfdetach -list test_facturx.pdf
# Doit montrer : factur-x.xml
```

---

## 🔧 Commandes de maintenance

### Vider les caches

```bash
# Laravel
php artisan config:clear
php artisan cache:clear
php artisan view:clear

# Opcache PHP
sudo systemctl restart php-fpm
# ou
sudo service php8.2-fpm restart
```

### Régénérer autoload

```bash
composer dump-autoload
```

### Vérifier logs

```bash
# Laravel logs
tail -f storage/logs/laravel.log

# PHP errors
tail -f /var/log/php8.2-fpm.log

# Nginx/Apache
tail -f /var/log/nginx/error.log
```

---

## 📊 Vérification conformité

### Outil officiel DGFiP

**Test Compta Demat** : https://www.impots.gouv.fr/

1. Télécharger votre FacturX
2. Uploader sur Test Compta Demat
3. Vérifier rapport validation

### Vérificateurs en ligne

- **ZUGFeRD Validator** : https://www.zugferd-community.net/
- **FacturX Checker** : https://fnfe-mpe.org/factur-x/

### Validation XML manuelle

```bash
# Extraire XML du PDF
pdfdetach -save 1 -o facturx.xml invoice.pdf

# Valider contre XSD EN 16931
xmllint --schema EN16931-CII-validation.xsd facturx.xml
```

---

## 💡 Bonnes pratiques

### 1. Toujours vérifier données avant génération

```php
public function generateFacturX(Invoice $invoice)
{
    // Validation préalable
    if (!$invoice->invoice_number) {
        throw new \Exception('Numéro facture requis');
    }
    
    if (!$invoice->client) {
        throw new \Exception('Client requis');
    }
    
    if (!$invoice->tenant) {
        throw new \Exception('Entreprise (tenant) requise');
    }
    
    // Génération
    return $this->generateInvoiceFacturX($invoice);
}
```

### 2. Logger les erreurs

```php
try {
    $pdf = $this->generateInvoiceFacturX($invoice);
} catch (\Exception $e) {
    Log::error('FacturX generation failed', [
        'invoice_id' => $invoice->id,
        'error' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ]);
    throw $e;
}
```

### 3. Tester en environnement de dev

```bash
# Ne jamais tester en production direct
# Utiliser staging ou local

# Test local
php artisan serve
curl http://localhost:8000/api/invoices/1/generate-facturx
```

---

## 🆘 Support escalade

### Niveau 1 : Logs Laravel
```bash
tail -100 storage/logs/laravel.log
```

### Niveau 2 : Logs PHP
```bash
sudo tail -100 /var/log/php-fpm/error.log
```

### Niveau 3 : Debug mode
```env
# .env
APP_DEBUG=true
LOG_LEVEL=debug
```

### Niveau 4 : Package issue
Si le problème vient de horstoeko/zugferd :
- GitHub : https://github.com/horstoeko/zugferd/issues
- Documentation : https://horstoeko.github.io/zugferd/

---

## 📞 Contact support

**Erreurs non résolues :**
1. Créer issue avec logs complets
2. Joindre exemple facture (données anonymisées)
3. Préciser version PHP, Laravel, horstoeko/zugferd

**Informations à fournir :**
```bash
php -v
composer show | grep horstoeko
cat storage/logs/laravel.log | tail -50
```

---

**Dernière mise à jour :** Novembre 2024  
**Version doc :** 1.1  
**Status :** ✅ Erreurs courantes documentées
