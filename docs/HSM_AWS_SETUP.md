# Guide d'Installation AWS KMS pour Time Is Money

## 📋 Prérequis

1. **Compte AWS** avec accès à la console
2. **AWS CLI** installé localement (optionnel mais recommandé)
3. **Composer** pour installer le SDK PHP

## 🚀 Installation Étape par Étape

### Étape 1 : Installer le SDK AWS

```bash
composer require aws/aws-sdk-php
```

### Étape 2 : Créer un utilisateur IAM

1. Connectez-vous à la [Console AWS](https://console.aws.amazon.com)
2. Allez dans **IAM** > **Users** > **Add User**
3. Nom d'utilisateur : `timeismoney-hsm`
4. Type d'accès : ✅ **Programmatic access**
5. Permissions : Créez une nouvelle politique avec le JSON suivant :

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "TimeIsMoneyKMSAccess",
            "Effect": "Allow",
            "Action": [
                "kms:CreateKey",
                "kms:CreateAlias",
                "kms:DeleteAlias",
                "kms:DescribeKey",
                "kms:GetPublicKey",
                "kms:ListKeys",
                "kms:ListAliases",
                "kms:Sign",
                "kms:Verify",
                "kms:ScheduleKeyDeletion",
                "kms:CancelKeyDeletion",
                "kms:TagResource",
                "kms:UntagResource",
                "kms:ListResourceTags"
            ],
            "Resource": "*"
        }
    ]
}
```

6. Téléchargez les **Access Key ID** et **Secret Access Key**

### Étape 3 : Configuration dans .env

```env
# Mode HSM pour production
HSM_MODE=cloud

# Provider AWS KMS
HSM_CLOUD_PROVIDER=aws
HSM_CLOUD_REGION=eu-west-3  # Paris
HSM_CLOUD_ACCESS_KEY=AKIA...  # Votre Access Key ID
HSM_CLOUD_SECRET_KEY=...       # Votre Secret Access Key
```

### Étape 4 : Test de la Configuration

```bash
# Tester AWS KMS
php artisan hsm:test --provider=aws

# Si tout fonctionne, vous verrez :
# ✅ ALL TESTS PASSED SUCCESSFULLY!
```

## 🔑 Gestion des Clés

### Créer une Clé de Signature

```bash
php artisan hsm:generate-key --id=invoice-signature-2025 --algorithm=RS256
```

### Lister les Clés

```bash
php artisan hsm:list-keys
```

### Rotation des Clés

AWS KMS supporte la rotation automatique des clés :

1. Dans la console AWS KMS
2. Sélectionnez votre clé
3. Activez **Automatic key rotation**
4. La rotation se fait automatiquement chaque année

## 💰 Estimation des Coûts

| Service | Coût | Description |
|---------|------|-------------|
| **Clé KMS** | $1/mois | Par clé de signature |
| **Opérations** | $0.03/10k | Sign, Verify, GetPublicKey |
| **Stockage** | Gratuit | Les clés sont gérées par AWS |

### Exemple de Calcul Mensuel

- 1 clé de signature : **$1**
- 10 000 signatures/mois : **$0.03**
- 10 000 vérifications/mois : **$0.03**
- **Total : ~$1.06/mois**

## 🔒 Sécurité

### Bonnes Pratiques

1. **Rotation des Access Keys**
   ```bash
   # Créer une nouvelle Access Key tous les 90 jours
   aws iam create-access-key --user-name timeismoney-hsm
   ```

2. **Restreindre par IP**
   Ajoutez une condition IP à la politique IAM :
   ```json
   "Condition": {
       "IpAddress": {
           "aws:SourceIp": ["YOUR_SERVER_IP/32"]
       }
   }
   ```

3. **CloudTrail pour Audit**
   - Activez CloudTrail pour logger toutes les opérations KMS
   - Conservez les logs dans S3

4. **Alertes CloudWatch**
   Créez des alertes pour :
   - Tentatives d'accès non autorisées
   - Suppressions de clés
   - Utilisation anormale

## 🚨 Dépannage

### Erreur : "Invalid credentials"

```bash
# Vérifier les credentials
aws kms list-keys --region eu-west-3

# Si erreur, reconfigurer AWS CLI
aws configure
```

### Erreur : "Access Denied"

Vérifiez les permissions IAM :
```bash
aws iam simulate-principal-policy \
    --policy-source-arn arn:aws:iam::ACCOUNT:user/timeismoney-hsm \
    --action-names kms:Sign kms:Verify \
    --resource-arns "*"
```

### Erreur : "Key not found"

```bash
# Lister les alias
aws kms list-aliases --region eu-west-3

# Vérifier l'état de la clé
aws kms describe-key --key-id alias/timeismoney-main-signing-key
```

## 📊 Monitoring

### Dashboard CloudWatch

Créez un dashboard avec ces métriques :

1. **Nombre de signatures** par heure
2. **Latence des opérations** KMS
3. **Erreurs** par type
4. **Coût estimé** en temps réel

### Exemple de requête CloudWatch Insights

```sql
fields @timestamp, @message
| filter @message like /kms:Sign/
| stats count() by bin(1h)
```

## 🔄 Migration depuis le Simulator

```bash
# 1. Exporter les clés du simulator
php artisan hsm:export --from=simulator --format=json > keys-backup.json

# 2. Configurer AWS KMS
# (Mettre à jour .env avec les credentials AWS)

# 3. Importer dans AWS KMS
php artisan hsm:import --to=aws --file=keys-backup.json

# 4. Vérifier
php artisan hsm:validate --provider=aws
```

## 📚 Ressources

- [AWS KMS Documentation](https://docs.aws.amazon.com/kms/)
- [AWS KMS Best Practices](https://docs.aws.amazon.com/kms/latest/developerguide/best-practices.html)
- [AWS Pricing Calculator](https://calculator.aws/#/addService/KMS)
- [AWS CloudHSM](https://aws.amazon.com/cloudhsm/) (pour haute sécurité)

## 💡 Tips Production

1. **Multi-Region** : Répliquez les clés dans plusieurs régions pour la haute disponibilité
2. **VPC Endpoint** : Utilisez un VPC Endpoint pour KMS (trafic privé)
3. **Budget Alerts** : Configurez des alertes de budget AWS
4. **Backup** : Exportez régulièrement les public keys pour backup

## 🎯 Checklist Pré-Production

- [ ] Access Keys configurées et testées
- [ ] Politique IAM restrictive en place
- [ ] CloudTrail activé
- [ ] Alertes CloudWatch configurées
- [ ] Rotation automatique des clés activée
- [ ] Test de charge effectué
- [ ] Plan de disaster recovery documenté
- [ ] Budget AWS configuré avec alertes