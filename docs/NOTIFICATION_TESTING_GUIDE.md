# Guide de Test du Système de Notifications

## 🎯 Objectif
Vérifier que tous les composants du système de notifications fonctionnent correctement de bout en bout.

## 📋 Prérequis
- [ ] Application accessible sur localhost:8000
- [ ] Base de données migrée avec les tables de notifications
- [ ] Service worker enregistré (vérifier dans Chrome DevTools > Application)
- [ ] Cron job configuré pour les tâches planifiées

## 🔍 Tests à effectuer

### 1. Test de l'interface utilisateur

#### Test de la cloche de notifications
1. Connectez-vous à l'application
2. Vérifiez que l'icône de cloche apparaît dans la barre de navigation
3. Le compteur de notifications non lues devrait être visible (si des notifications existent)
4. Cliquez sur la cloche pour ouvrir le dropdown

**Résultat attendu:**
- Le dropdown s'ouvre avec les notifications récentes
- Le lien "Voir toutes les notifications" est présent

#### Test du centre de notifications
1. Depuis le dropdown, cliquez sur "Voir toutes les notifications"
2. Vous devriez arriver sur la page `/notifications`

**Vérifications:**
- [ ] La liste des notifications s'affiche
- [ ] Les filtres sont disponibles (Type, Non lues seulement)
- [ ] La recherche fonctionne
- [ ] Les actions "Marquer comme lu" et "Supprimer" fonctionnent

### 2. Test des notifications de Timer

#### Test de démarrage de timer
```bash
# Dans la console du navigateur
# Démarrer un timer depuis l'interface
```
**Vérification:** Une notification "Timer démarré" devrait apparaître

#### Test d'arrêt de timer
```bash
# Arrêter le timer en cours
```
**Vérification:** Une notification "Timer arrêté" avec la durée totale

#### Test de timer longue durée
```bash
# Simuler un timer de plus de 4 heures
# Ou modifier temporairement le code pour tester avec 10 secondes au lieu de 4 heures
```
**Vérification:** Notification d'alerte pour timer longue durée

### 3. Test des notifications de facturation

#### Test de création de facture
1. Aller dans Invoices > Créer une nouvelle facture
2. Remplir les informations et sauvegarder

**Vérification:** Notification "Nouvelle facture créée"

#### Test de paiement reçu
```bash
# Via Tinker ou directement dans le code
php artisan tinker
$invoice = App\Models\Invoice::first();
$invoice->markAsPaid();
```
**Vérification:** Notification "Paiement reçu"

### 4. Test des commandes planifiées

#### Test manuel des commandes

```bash
# Test des rappels de timer
php artisan notifications:send-timer-reminders --hour=$(date +%H)

# Test des échéances de projet
php artisan notifications:check-project-deadlines --days=30

# Vérifier les logs
tail -f storage/logs/laravel.log
```

### 5. Test des préférences utilisateur

1. Aller dans Settings > Notifications
2. Modifier les préférences suivantes:
   - [ ] Désactiver les notifications push
   - [ ] Activer les heures silencieuses
   - [ ] Modifier les types de notifications

**Vérification:** Les changements sont sauvegardés et respectés

### 6. Test des notifications Push (PWA)

#### Installation de l'application
1. Ouvrir Chrome/Edge
2. Cliquer sur l'icône d'installation dans la barre d'adresse
3. Installer l'application

#### Test des notifications push
```bash
# Dans la console du navigateur
Notification.requestPermission().then(permission => {
    console.log('Permission:', permission);
    if(permission === 'granted') {
        new Notification('Test TimeIsMoney', {
            body: 'Test de notification push',
            icon: '/images/icons/icon-192x192.png'
        });
    }
});
```

### 7. Test de l'API Backend

#### Test des endpoints de notification
```bash
# Récupérer les notifications
curl -X GET http://localhost:8000/api/notifications \
  -H "Authorization: Bearer YOUR_TOKEN"

# Récupérer le nombre de non-lues
curl -X GET http://localhost:8000/api/notifications/unread-count \
  -H "Authorization: Bearer YOUR_TOKEN"

# Marquer comme lu
curl -X PUT http://localhost:8000/api/notifications/{id}/read \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test de notification timer
curl -X POST http://localhost:8000/api/notifications/timer-started \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "timer_id": 1,
    "project_name": "Test Project",
    "task_name": "Test Task"
  }'
```

## 📊 Checklist de validation

### Interface
- [ ] Cloche de notification visible et fonctionnelle
- [ ] Dropdown de notifications fonctionne
- [ ] Centre de notifications complet accessible
- [ ] Compteur de non-lues correct
- [ ] Filtres et recherche fonctionnels

### Notifications Timer
- [ ] Notification au démarrage
- [ ] Notification à l'arrêt
- [ ] Alerte timer longue durée (>4h)
- [ ] Rappels quotidiens (commande planifiée)

### Notifications Facturation
- [ ] Notification de création de facture
- [ ] Notification de paiement reçu
- [ ] Rappels de factures en retard

### Notifications Projet
- [ ] Échéances approchantes
- [ ] Tâches assignées
- [ ] Changements de statut

### Système
- [ ] Service Worker enregistré
- [ ] Push notifications fonctionnelles
- [ ] Préférences utilisateur respectées
- [ ] Heures silencieuses respectées
- [ ] Commandes planifiées exécutées

## 🐛 Débuggage

### Vérifier le Service Worker
```javascript
// Dans la console du navigateur
navigator.serviceWorker.getRegistrations().then(registrations => {
    console.log('Service Workers:', registrations);
});
```

### Vérifier les permissions
```javascript
// Dans la console
Notification.permission // Should be 'granted', 'denied', or 'default'
```

### Vérifier les logs Laravel
```bash
tail -f storage/logs/laravel.log | grep -i notification
```

### Vérifier la base de données
```sql
-- Vérifier les notifications
SELECT * FROM notifications ORDER BY created_at DESC LIMIT 10;

-- Vérifier les préférences utilisateur
SELECT push_notifications_enabled, email_notifications_enabled, timer_reminders_enabled
FROM users WHERE id = 1;
```

## 🚀 Mise en production

### Configuration requise
1. Configurer le cron job:
```bash
* * * * * cd /var/www/html/timeismoney2 && php artisan schedule:run >> /dev/null 2>&1
```

2. Vérifier les variables d'environnement:
```env
VITE_VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:admin@timeismoney.fr
```

3. Build de production:
```bash
npm run build
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

## 📝 Notes
- Les notifications push nécessitent HTTPS en production
- Les heures silencieuses utilisent le fuseau horaire de l'utilisateur
- Les commandes planifiées s'exécutent selon le fuseau du serveur (Europe/Paris)