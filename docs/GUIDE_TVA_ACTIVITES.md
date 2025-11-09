# 🎯 Guide complet : Gestion de la TVA par type d'activité

## 📋 Vue d'ensemble

Le système gère maintenant la TVA selon **3 critères principaux** :

1. **Régime de TVA** (franchise / normal / intracommunautaire...)
2. **Activité principale** (générale / assurance / formation / médical...)
3. **Forme juridique** (EI / SARL / SAS...)

---

## 🏢 Types d'activités supportées

### 1. **Activité générale** ✅
- **Code:** `general`
- **Assujetti TVA:** Oui (20%)
- **Article CGI:** -
- **Seuils applicables:** Oui si EI/EIRL
- **Exemples:** Commerce, prestations classiques

### 2. **Assurances** 🛡️
- **Code:** `insurance`
- **Assujetti TVA:** Non (0%)
- **Article CGI:** 261 C
- **Seuils applicables:** Non
- **Activité mixte:** ✅ Oui
- **Description:** Opérations d'assurance exonérées, MAIS activités annexes (conseil, gestion immobilière) assujetties à 20%

### 3. **Formation professionnelle** 🎓
- **Code:** `training`
- **Assujetti TVA:** Non (0%)
- **Article CGI:** 261-4-4°
- **Seuils applicables:** Non
- **Activité mixte:** ✅ Oui
- **Agrément requis:** ✅ Numéro BPF
- **Description:** Formation continue exonérée, prestations annexes (conseil, audit) assujetties

### 4. **Professions médicales** ⚕️
- **Code:** `medical`
- **Assujetti TVA:** Non (0%)
- **Article CGI:** 261-4-1°
- **Seuils applicables:** Non
- **Description:** Soins médicaux et paramédicaux totalement exonérés

### 5. **Banques et finances** 🏦
- **Code:** `banking`
- **Assujetti TVA:** Non (0%)
- **Article CGI:** 261 B
- **Seuils applicables:** Non
- **Activité mixte:** ✅ Oui
- **Description:** Opérations bancaires exonérées, prestations de conseil assujetties

### 6. **Location immobilière nue** 🏠
- **Code:** `real_estate_rental`
- **Assujetti TVA:** Non (0%)
- **Article CGI:** 261 D
- **Seuils applicables:** Non
- **Note:** Option possible pour la TVA (Art. 260-2°)

### 7. **Enseignement** 📚
- **Code:** `education`
- **Assujetti TVA:** Non (0%)
- **Article CGI:** 261-4-4° bis
- **Seuils applicables:** Non
- **Description:** Enseignement scolaire, universitaire

### 8. **Éducation sportive** ⚽
- **Code:** `sports`
- **Assujetti TVA:** Non (0%)
- **Article CGI:** 261-6°
- **Seuils applicables:** Non

### 9. **Autre activité exonérée** 🔧
- **Code:** `other_exempt`
- **Assujetti TVA:** Non (0%)
- **Article CGI:** À préciser
- **Seuils applicables:** Non
- **Activité mixte:** ✅ Oui

---

## 🔄 Activités mixtes expliquées

### Qu'est-ce qu'une activité mixte ?

Une activité mixte signifie que l'entreprise peut avoir :
- **Activité principale exonérée** (0% de TVA)
- **Activités annexes assujetties** (20% de TVA)

### Exemples concrets

#### 📘 Organisme de formation (SARL)
```
Activité principale : Formation professionnelle → 0% TVA (exonéré)
Activités annexes :
  - Conseil en stratégie → 20% TVA
  - Audit d'entreprise → 20% TVA
  - Vente de livres/supports → 20% TVA
```

#### 🏢 Compagnie d'assurance
```
Activité principale : Assurances → 0% TVA (exonéré)
Activités annexes :
  - Gestion immobilière → 20% TVA
  - Conseil financier → 20% TVA
  - Location de locaux → 0% ou 20% selon option
```

#### 🏦 Banque
```
Activité principale : Opérations bancaires → 0% TVA (exonéré)
Activités annexes :
  - Conseil en gestion de patrimoine → 20% TVA
  - Location de coffres → 20% TVA
  - Vente de produits dérivés → 20% TVA
```

### Comment gérer dans le système ?

1. **Sélectionner l'activité mixte** (ex: Formation)
2. **Définir le coefficient de prorata** :
   - Si 90% du CA est de la formation (0%) et 10% du conseil (20%)
   - Coefficient de déduction : **20%** (car 20% d'activités à TVA)
3. **Créer les factures** :
   - Formation → Sélectionner taux 0% + Mention exonération
   - Conseil → Sélectionner taux 20%

---

## 🎨 Interface utilisateur recommandée

### Section 1 : Informations de base
```
┌─────────────────────────────────────────────────────┐
│ 🏢 Forme juridique : [SARL ▼]                      │
│ 🎯 Activité principale : [Formation prof. ▼]       │
│                                                     │
│ ℹ️  Formation professionnelle (Art. 261-4-4° CGI)  │
│    Exonérée de TVA avec numéro d'agrément          │
│    ⚠️  Activités annexes peuvent être assujetties   │
└─────────────────────────────────────────────────────┘
```

### Section 2 : Configuration TVA (si activité exonérée)
```
┌─────────────────────────────────────────────────────┐
│ 📋 Régime de TVA                                    │
│                                                     │
│ ○ Franchise en base (micro-entreprise)             │
│   → Seuils applicables : 36 800€ / 91 900€         │
│                                                     │
│ ● Régime normal - Activité exonérée                │
│   → Pas de seuils, exonération permanente          │
│                                                     │
│ ⚙️  Activité mixte détectée                         │
│ └─ Coef. prorata de déduction : [20] %             │
│    (% d'activités assujetties à la TVA)            │
└─────────────────────────────────────────────────────┘
```

### Section 3 : Numéros et agréments
```
┌─────────────────────────────────────────────────────┐
│ 📄 N° agrément formation (BPF)                      │
│    [________________]  ✅ Requis pour exonération   │
│                                                     │
│ 📄 N° TVA intracommunautaire                        │
│    [________________]  ℹ️  Optionnel                │
└─────────────────────────────────────────────────────┘
```

### Section 4 : Seuils (si franchise en base uniquement)
```
┌─────────────────────────────────────────────────────┐
│ 📊 Suivi des seuils de franchise en base            │
│                                                     │
│ Type d'activité : [Services ▼]                     │
│ Seuil services : [36 800] €                        │
│ Seuil marchandises : [91 900] €                    │
│                                                     │
│ CA annuel HT : 15 234,50 € / 36 800,00 €           │
│ ████████░░░░░░░░░░ 41%                              │
│                                                     │
│ ☑  Basculer automatiquement en TVA si dépassé      │
└─────────────────────────────────────────────────────┘
```

### Section 5 : Aide contextuelle
```
┌─────────────────────────────────────────────────────┐
│ 💡 Votre configuration actuelle                     │
│                                                     │
│ ✅ Formation professionnelle exonérée (0%)          │
│ ⚠️  Activités annexes assujetties (20%)             │
│                                                     │
│ Lors de la création de facture, vous pourrez       │
│ choisir le taux selon le type de prestation :      │
│   • Formation → 0% (+ mention exonération)         │
│   • Conseil/Audit → 20%                            │
└─────────────────────────────────────────────────────┘
```

---

## 🔧 Modifications techniques

### Backend

#### 1. Ajouter les champs au Tenant
```php
// TenantSettingsController.php - getBillingSettings()
return [
    // ... autres champs
    'vat_regime' => $tenant->vat_regime ?? 'normal',
    'main_activity' => $tenant->main_activity ?? 'general',
    'vat_deduction_coefficient' => $tenant->vat_deduction_coefficient ?? 100,
    'activity_license_number' => $tenant->activity_license_number,
    'vat_explanation' => $tenant->getVatExplanation(),
];
```

#### 2. Validation dans updateBillingSettings()
```php
'vat_regime' => 'nullable|in:franchise_base,normal,intracommunity,export,exempt_article_261,other',
'main_activity' => 'nullable|in:general,insurance,training,medical,banking,real_estate_rental,education,sports,other_exempt',
'vat_deduction_coefficient' => 'nullable|numeric|min:0|max:100',
'activity_license_number' => 'nullable|string|max:100',
```

#### 3. Ajouter au only() des champs updateables
```php
$tenant->update($request->only([
    // ... champs existants
    'vat_regime',
    'main_activity',
    'vat_deduction_coefficient',
    'activity_license_number',
]));
```

### Frontend

#### 1. Ajouter à l'interface TypeScript
```typescript
interface BillingSettings {
    // ... champs existants
    vat_regime: string;
    main_activity: string;
    vat_deduction_coefficient: number;
    activity_license_number: string | null;
    vat_explanation?: string;
}
```

#### 2. Initialisation du formData
```typescript
const [formData, setFormData] = useState<BillingSettings>({
    // ... champs existants
    vat_regime: 'normal',
    main_activity: 'general',
    vat_deduction_coefficient: 100,
    activity_license_number: null,
});
```

---

## 📊 Flux de décision pour le taux de TVA

```
┌─────────────────────┐
│ Création de facture │
└──────────┬──────────┘
           │
           ▼
    ┌──────────────────┐
    │ Régime franchise │
    │    en base ?     │
    └──────┬───────────┘
           │
      Oui  │  Non
       ┌───┴────┐
       ▼        ▼
  ┌────────┐ ┌──────────────┐
  │ Seuil  │ │   Activité   │
  │dépassé?│ │  exonérée ?  │
  └───┬────┘ └──────┬───────┘
      │             │
   Oui│Non     Oui  │  Non
   ┌──┴───┐    ┌───┴────┐
   │ 20%  │    │   0%   │
   └──────┘    └───┬────┘
      │            │
      │         Activité
      │          mixte ?
      │         ┌──┴──┐
      │      Non│  Oui│
      │     ┌───┴─┐ ┌─┴────────┐
      │     │ 0%  │ │Choix user│
      │     │fixe │ │0% ou 20% │
      │     └─────┘ └──────────┘
      │
      ▼
┌──────────┐
│ FACTURE  │
│ avec TVA │
└──────────┘
```

---

## ✅ TODO Liste d'implémentation

- [x] Créer migration `vat_regime`, `main_activity`, `vat_deduction_coefficient`
- [x] Créer service `VatRulesService` avec toutes les règles
- [x] Mettre à jour modèle `Tenant` avec nouvelles méthodes
- [ ] Mettre à jour `TenantSettingsController` pour inclure nouveaux champs
- [ ] Mettre à jour frontend TypeScript avec nouvelle interface
- [ ] Créer composant React `VatConfigurationWizard`
- [ ] Ajouter aide contextuelle selon l'activité sélectionnée
- [ ] Mettre à jour création de facture pour suggérer le bon taux
- [ ] Ajouter tests unitaires pour `VatRulesService`
- [ ] Documenter les cas d'usage dans le guide utilisateur

---

✅ **Le système est maintenant capable de gérer toutes les subtilités de la TVA française !**
