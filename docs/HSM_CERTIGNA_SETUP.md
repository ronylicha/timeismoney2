# Guide de Configuration Certigna ID RGS** / eIDAS

## À propos de Certigna

Certigna est un Tiers de Confiance français certifié eIDAS, filiale du groupe Tessi, leader français de la dématérialisation. Certigna propose des certificats électroniques qualifiés conformes au règlement européen eIDAS et au Référentiel Général de Sécurité (RGS**).

## Produit Recommandé : Certigna ID RGS** / eIDAS

### Caractéristiques
- **Certificat qualifié** personne physique
- **Signature électronique qualifiée (QES)** - Valeur légale équivalente à la signature manuscrite
- **Conformité** eIDAS, RGS** niveau 2 étoiles, NF525
- **Validité** dans tous les pays de l'Union Européenne
- **Horodatage qualifié** inclus
- **Support technique** en français

### Tarification
- **216€ HT pour 3 ans** (soit 72€ HT/an)
- Support technique inclus
- Horodatage qualifié inclus
- Pas de limite de signatures
- Pas de frais cachés

## Étapes de Configuration

### 1. Commander le Certificat

1. Accéder à la page de commande :
   https://www.certigna.com/tarif/tarif-certificat-personne-physique/

2. Sélectionner **"Certigna ID RGS** / eIDAS"**

3. Compléter le formulaire de commande :
   - Informations personnelles
   - Justificatifs d'identité
   - Moyen de paiement

### 2. Processus de Validation d'Identité

Certigna suit un processus strict de validation d'identité conforme eIDAS :

1. **Envoi des documents** :
   - Pièce d'identité en cours de validité
   - Justificatif de domicile récent (moins de 3 mois)

2. **Validation en face-à-face** (au choix) :
   - **Rendez-vous physique** avec un Agent de Certification
   - **Visioconférence** avec vérification d'identité
   - **La Poste** - Validation par un agent postal

3. **Délai de traitement** : 24-72h après validation

### 3. Réception et Installation du Certificat

#### A. Réception des éléments

Vous recevrez par email sécurisé :
- Le certificat au format `.p12` (PKCS#12)
- Le mot de passe de protection
- La documentation technique
- Les coordonnées du support

#### B. Extraction du certificat et de la clé

```bash
# Extraire le certificat public du fichier .p12
openssl pkcs12 -in certificate.p12 -out certificate.pem -nokeys -passin pass:YOUR_PASSWORD

# Extraire la clé privée (protégée par mot de passe)
openssl pkcs12 -in certificate.p12 -out private_key.pem -nocerts -passin pass:YOUR_PASSWORD -passout pass:NEW_PASSWORD

# Vérifier le certificat
openssl x509 -in certificate.pem -text -noout
```

#### C. Sécurisation des fichiers

```bash
# Créer un répertoire sécurisé
mkdir -p /etc/timeismoney/certificates
chmod 700 /etc/timeismoney/certificates

# Copier les fichiers
cp certificate.pem /etc/timeismoney/certificates/certigna_cert.pem
cp private_key.pem /etc/timeismoney/certificates/certigna_key.pem

# Sécuriser les permissions
chmod 600 /etc/timeismoney/certificates/*
chown www-data:www-data /etc/timeismoney/certificates/*
```

### 4. Configuration dans Time Is Money

#### A. Variables d'environnement (.env)

```env
# Mode HSM
HSM_MODE=cloud
HSM_CLOUD_PROVIDER=certigna

# API Certigna (optionnel si utilisation locale du certificat)
CERTIGNA_API_KEY=your_api_key_from_certigna
CERTIGNA_CERTIFICATE_ID=your_certificate_id

# Mode sandbox pour tests (false en production)
CERTIGNA_SANDBOX=false

# Chemins vers les certificats (si utilisation locale)
CERTIGNA_CERTIFICATE_PATH=/etc/timeismoney/certificates/certigna_cert.pem
CERTIGNA_PRIVATE_KEY_PATH=/etc/timeismoney/certificates/certigna_key.pem
CERTIGNA_PRIVATE_KEY_PASSWORD="${CERTIGNA_KEY_PASSWORD}"

# Mot de passe de la clé privée (sécurisé)
CERTIGNA_KEY_PASSWORD=your_secure_password
```

#### B. Configuration Laravel (optionnel)

Si vous préférez utiliser le fichier de configuration Laravel :

```php
// config/hsm.php
'certigna' => [
    'api_key' => env('CERTIGNA_API_KEY'),
    'certificate_id' => env('CERTIGNA_CERTIFICATE_ID'),
    'certificate_path' => env('CERTIGNA_CERTIFICATE_PATH'),
    'private_key_path' => env('CERTIGNA_PRIVATE_KEY_PATH'),
    'private_key_password' => env('CERTIGNA_PRIVATE_KEY_PASSWORD'),
    'sandbox' => env('CERTIGNA_SANDBOX', true),
],
```

### 5. Test de Configuration

```bash
# Tester la configuration Certigna
php artisan hsm:test --provider=certigna

# Résultat attendu :
# ✅ Certificat chargé correctement
# ✅ Signature test réussie
# ✅ Vérification réussie
# ✅ Horodatage qualifié disponible
```

## Utilisation en Production

### Signature de Documents

```php
use App\Services\HSM\HSMManager;

// Obtenir l'instance Certigna
$hsm = HSMManager::getInstance();

// Signer un document PDF
$pdfContent = file_get_contents('document.pdf');
$signature = $hsm->sign($pdfContent, 'invoice-key', 'RS256');

// La signature est qualifiée (QES) avec :
// - Valeur légale équivalente à signature manuscrite
// - Horodatage qualifié inclus
// - Conformité eIDAS et RGS**
```

### Formats de Signature Supportés

| Format | Description | Usage |
|--------|-------------|-------|
| **PAdES** | PDF Advanced Electronic Signatures | Documents PDF |
| **XAdES** | XML Advanced Electronic Signatures | Factures FacturX/XML |
| **CAdES** | CMS Advanced Electronic Signatures | Fichiers génériques |

### Niveaux de Signature

| Niveau | Description | Conformité |
|--------|-------------|------------|
| **BASELINE-B** | Signature de base | eIDAS |
| **BASELINE-T** | Avec horodatage | eIDAS + Timestamp |
| **BASELINE-LT** | Long terme | eIDAS + Conservation |
| **BASELINE-LTA** | Archivage long terme | eIDAS + Archivage légal |

## Conformité et Certification

### Conformité Réglementaire
- ✅ **eIDAS** - Règlement européen (UE) n°910/2014
- ✅ **RGS*** - Référentiel Général de Sécurité niveau 2 étoiles
- ✅ **NF525** - Norme française anti-fraude TVA
- ✅ **RGPD** - Protection des données personnelles

### Certifications Certigna
- **ANSSI** - Agence Nationale de la Sécurité des Systèmes d'Information
- **COFRAC** - Comité français d'accréditation
- **ETSI** - European Telecommunications Standards Institute

## Sécurité et Bonnes Pratiques

### 1. Protection de la Clé Privée
```bash
# Utiliser un gestionnaire de secrets
# Option 1 : AWS Secrets Manager
aws secretsmanager create-secret --name certigna-private-key --secret-string file://private_key.pem

# Option 2 : HashiCorp Vault
vault kv put secret/certigna private_key=@private_key.pem password=$PASSWORD

# Option 3 : Chiffrement local
openssl enc -aes-256-cbc -salt -in private_key.pem -out private_key.pem.enc
```

### 2. Rotation du Certificat
- Planifier le renouvellement 30 jours avant expiration
- Conserver l'ancien certificat pour vérification des signatures passées
- Mettre à jour progressivement les systèmes

### 3. Audit et Traçabilité
```php
// Logger toutes les opérations de signature
Log::channel('hsm')->info('Signature créée', [
    'document_id' => $documentId,
    'certificate_serial' => $certificateSerial,
    'timestamp' => $timestamp,
    'user_id' => auth()->id(),
    'ip_address' => request()->ip(),
]);
```

### 4. Sauvegarde et Récupération
- Sauvegarder le certificat et la clé privée chiffrés
- Stocker les sauvegardes dans un lieu sécurisé séparé
- Tester régulièrement la procédure de récupération

## Dépannage

### Problèmes Courants

| Erreur | Cause | Solution |
|--------|-------|----------|
| "Certificate not found" | Chemin incorrect | Vérifier CERTIGNA_CERTIFICATE_PATH |
| "Invalid password" | Mot de passe erroné | Vérifier CERTIGNA_PRIVATE_KEY_PASSWORD |
| "Certificate expired" | Certificat expiré | Renouveler le certificat |
| "Signature verification failed" | Certificat non reconnu | Vérifier la chaîne de certification |

### Commandes de Diagnostic

```bash
# Vérifier la validité du certificat
openssl x509 -in /path/to/certificate.pem -checkend 0

# Afficher les détails du certificat
openssl x509 -in /path/to/certificate.pem -text -noout | grep -E "(Subject:|Issuer:|Not After)"

# Tester la connexion API Certigna
curl -X GET https://api.certigna.com/v1/status \
     -H "Authorization: Bearer YOUR_API_KEY"

# Vérifier les permissions des fichiers
ls -la /etc/timeismoney/certificates/
```

## Support Certigna

### Contacts
- **Support Technique** : support@certigna.fr
- **Téléphone** : +33 (0)1 86 95 02 30
- **Horaires** : Lundi-Vendredi 9h-18h (CET)

### Documentation
- [Documentation technique](https://www.certigna.com/documentation)
- [API Reference](https://api.certigna.com/docs)
- [FAQ](https://www.certigna.com/faq)

## Migration depuis un autre TSP

### Depuis Universign
```bash
# 1. Exporter les données de signature
php artisan hsm:export --provider=universign --output=signatures.json

# 2. Configurer Certigna
# Mettre à jour .env avec les nouvelles credentials

# 3. Importer les références
php artisan hsm:import --provider=certigna --input=signatures.json

# 4. Vérifier la migration
php artisan hsm:validate --provider=certigna
```

### Depuis DocuSign/Adobe Sign
- Les signatures existantes restent valides
- Nouvelles signatures utilisent Certigna
- Conservation des preuves selon la réglementation

## Coûts Détaillés

### Certificat Certigna ID RGS** / eIDAS
- **Première année** : 72€ HT
- **Pack 3 ans** : 216€ HT (économie de 20%)
- **Renouvellement** : 72€ HT/an

### Comparaison avec autres solutions

| Solution | Coût annuel | Signatures incluses | Horodatage | Support |
|----------|-------------|-------------------|------------|---------|
| **Certigna** | 72€ HT | Illimité | Inclus | Inclus |
| Universign | 99€/mois | 100/mois | Inclus | Inclus |
| DocuSign | 360€/an | 100/an | Payant | Email |
| Adobe Sign | 396€/an | 150/an | Payant | Forum |

## Conclusion

Certigna ID RGS** / eIDAS offre une solution de signature électronique qualifiée :
- ✅ **Économique** : 72€/an tout compris
- ✅ **Conforme** : eIDAS, RGS**, NF525
- ✅ **Française** : Support et conformité locale
- ✅ **Illimitée** : Pas de limite de signatures
- ✅ **Légale** : Valeur équivalente à signature manuscrite

Pour Time Is Money, c'est la solution idéale pour :
- Facturation électronique conforme
- Contrats commerciaux sécurisés
- Archivage légal longue durée
- Conformité réglementaire française

---

**Dernière mise à jour** : Novembre 2025
**Version** : 1.0.0
**Contact projet** : security@timeismoney.com