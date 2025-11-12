# Évolution conformité eIDAS / Facturation électronique

## Synthèse réglementaire
- **Cadre** : CGI art. 289 V & BOI-TVA-DECLA-30-20-30 (authenticité/intégrité/lisibilité), règlement eIDAS n°910/2014 (art. 24-26 & 41), arrêté Factur-X 15/09/2021 + ETSI EN 319 142 (PAdES), obligations de conservation art. L102-B LPF & NF525.
- **Constat global** : la pile actuelle (services `ElectronicSignature*`, `QualifiedTimestampService`, HSM abstrait) expose les bonnes briques mais reste largement simulée. Aucune facture n’est réellement signée en PAdES avec certificat qualifié, donc non opposable face à l’administration / PDP.

## Tableau de conformité
| # | Exigence (réf.) | Implémentation | Statut |
|---|-----------------|----------------|--------|
|1|Signature PAdES authentifiant la facture (CGI art. 289 V, ETSI EN 319 142)|`ElectronicSignatureService::addSignatureToPdfWithTCPDF` ajoute seulement un bloc texte/metadata (`app/Services/ElectronicSignatureService.php:859-924`) et un fallback purement textuel (`918-924`). Pas de conteneur PKCS#7, pas de ByteRange.|❌ Manquant|
|2|Certificat qualifié délivré par QTSP (eIDAS art. 24-25, RGS**)|Certificat auto-signé généré côté appli (`generateSelfSignedCertificate`, `app/Services/ElectronicSignatureService.php:369-460`). `ElectronicSignatureServiceWithHSM::determineSignatureLevel` force AES/SES (`app/Services/ElectronicSignatureServiceWithHSM.php:295-304`).|❌ Manquant|
|3|Protection des clés via QSCD / HSM certifié (BOFiP, RGS)|`HSMSimulator` actif par défaut (`config/services.php:98-109`) : stockage local chiffré logiciel (`app/Services/HSM/HSMSimulator.php`). Implémentations Certigna/Universign présentes mais non configurées.|⚠️ Partiel|
|4|Horodatage qualifié RFC 3161 (eIDAS art. 41, NF525)|Mode « simple » maison (`generateSimpleTimestamp`, `app/Services/ElectronicSignatureService.php:369-432`). `QualifiedTimestampService` ne fait qu’un mock Universign + appel OpenAPI sans validation TSA (`app/Services/QualifiedTimestampService.php:101-206`).|⚠️ Partiel|
|5|Validation cryptographique + chaîne de confiance (ETSI EN 319 102, BOI)|`validateSignature` et `validateTimestamp` retournent toujours `true`, aucun contrôle CRL/OCSP (`app/Services/ElectronicSignatureService.php:749-779`).|❌ Manquant|
|6|Preuve d’intégrité stockée et vérifiable (CGI art. 289 VII bis)|`verifyDocumentIntegrity` recalcule seulement le hash courant (`app/Services/ElectronicSignatureService.php:800-823`), sans trace scellée pour comparaison.|⚠️ Partiel|
|7|Audit trail et conservation 10 ans (art. L102-B LPF)|Modèle `ElectronicSignature` complet (audit, IP, user agent) + `recordSignatureAudit` (`app/Models/ElectronicSignature.php`, `app/Services/ElectronicSignatureService.php:973-1006`).|✅ Conforme|
|8|Compatibilité Factur-X / PDP (Ord. 2021-1190)|`FacturXService` invoque la signature (`app/Services/FacturXService.php:1289-1313`) mais le PDF généré n’est pas PAdES valide ⇒ refus PDP/Chorus.|❌ Manquant|
|9|Gouvernance sécurité (MFA, rotation, séparation des rôles)|Options prévues dans `config/electronic_signature.php:74-142` mais aucune enforcement applicative.|⚠️ Partiel|
|10|Alignement documentation vs réalité (art. 19 eIDAS)|`docs/ELECTRONIC_SIGNATURE_COMPLETE.md` annonce « QES 100 % » alors que la signature est simulée → risque déclaratif.|⚠️ Partiel|

## Recommandations prioritaires
1. **PAdES réel** : intégrer une librairie (DSS, iText, OpenPDF) pour produire un objet signature CMS avec dictionnaire `/ByteRange` et timestamp PAdES-LT.  
2. **Certificat qualifié & QSCD** : activer un QTSP (Certigna/Universign/ChamberSign) via `HSMManager`, stocker l’OID de politique et le numéro de certificat dans `ElectronicSignature`.  
3. **Horodatage qualifié** : brancher une TSA RFC 3161 reconnue, stocker le token DER dans le PDF et vérifier la chaîne TSA (certificat + OCSP/CRL).  
4. **Vérifications cryptographiques** : implémenter les contrôles de chaîne, de révocation et de validité pour signatures et timestamps (pdfsig/openssl en back-end).  
5. **Intégrité & archivage** : sceller le hash initial (base + métadonnées PDF) et comparer lors des validations pour répondre à l’exigence d’inaltérabilité (CGI art. 289).  
6. **Transparence documentaire** : aligner la documentation produit avec l’état réel jusqu’à l’obtention d’une signature qualifiée opposable.
