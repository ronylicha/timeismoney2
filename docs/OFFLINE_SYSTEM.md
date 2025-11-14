# Système Offline - Documentation Complète

## Vue d'ensemble

Le système offline de TimeIsMoney permet aux utilisateurs de continuer à travailler sans connexion internet. Toutes les données sont stockées localement et synchronisées automatiquement lors du retour en ligne.

### Filtrage par tenant

**Important** : Toutes les données récupérées sont automatiquement filtrées par tenant grâce à l'authentification Sanctum. Le service worker utilise le token d'authentification pour toutes les requêtes, garantissant que seules les données du tenant de l'utilisateur connecté sont mises en cache et synchronisées. Aucune donnée d'autres tenants n'est accessible.

## Architecture

### 1. Service Worker (`public/service-worker.js`)

Le service worker est le cœur du système offline. Il intercepte toutes les requêtes réseau et fournit des réponses depuis le cache lorsque l'application est hors ligne.

#### Fonctionnalités principales :

- **Cache proactif** : Précharge automatiquement les données essentielles
- **Prefetch périodique** : Actualise le cache toutes les 5 minutes quand l'utilisateur est en ligne
- **Gestion des mutations offline** : Enregistre les créations, modifications et suppressions en attente
- **Support du timer offline** : Permet de démarrer, arrêter, mettre en pause le timer sans connexion

#### Endpoints mis en cache :

```javascript
- /projects - Liste des projets
- /clients - Liste des clients
- /tasks?include_full=true - Liste des tâches avec TOUTES les données (commentaires, pièces jointes, checklist, sous-tâches, dépendances)
- /time-entries?scope=recent - Entrées de temps récentes
- /time-entries/timesheet - Feuilles de temps
- /expenses - Dépenses
- /expense-categories - Catégories de dépenses
- /notifications - Notifications
- /users/me - Profil utilisateur
- /users - Liste des utilisateurs
- /dashboard/summary - Résumé du tableau de bord
```

**Note importante** : Le paramètre `include_full=true` sur l'endpoint `/tasks` permet de charger toutes les relations de la tâche en une seule requête pour une utilisation offline optimale.

#### Données complètes des tâches

Lorsque le paramètre `include_full=true` est utilisé, chaque tâche récupérée contient :

- ✅ **Projet associé** (project)
- ✅ **Utilisateurs assignés** (users)
- ✅ **Tâche parente** (parent) - pour les sous-tâches
- ✅ **Sous-tâches** (children) - liste complète
- ✅ **Dépendances** (dependencies) - tâches liées
- ✅ **Commentaires** (comments) - avec auteur
- ✅ **Pièces jointes** (attachments) - avec auteur
- ✅ **Checklist/étapes** (checklist) - stockées en JSON
- ✅ **Entrées de temps** (timeEntries) - 10 dernières entrées

Cela permet une expérience offline complète sans avoir à charger des données supplémentaires.

#### Entités gérées offline :

```javascript
- projects (projets)
- clients (clients)
- tasks (tâches)
- time-entries (entrées de temps)
- expenses (dépenses)
- expense-categories (catégories de dépenses)
- users (utilisateurs)
- notifications
```

#### Stratégies de cache :

1. **Network First** : Pour les API et données dynamiques
   - Essaie d'abord le réseau
   - Utilise le cache en fallback si offline
   - Applique les modifications en attente aux réponses

2. **Cache First** : Pour les assets statiques (JS, CSS, images)
   - Utilise le cache en priorité
   - Met à jour depuis le réseau en arrière-plan

3. **Prefetch proactif** :
   - Au démarrage de l'application
   - Lors du retour en ligne
   - Toutes les 5 minutes en arrière-plan
   - Quand le token d'authentification change

### 2. Base de données offline (`resources/js/utils/offlineDB.ts`)

Utilise SQLite WASM pour stocker les données localement avec une structure complète.

#### Tables principales :

```sql
- time_entries : Entrées de temps (avec support timer)
- invoices : Factures
- expenses : Dépenses
- projects : Projets (pour référence offline)
- clients : Clients (pour référence offline)
- tasks : Tâches (pour référence offline)
- expense_categories : Catégories de dépenses
- users : Utilisateurs
- sync_queue : Queue de synchronisation
```

#### Fonctionnalités :

- **Sauvegarde automatique** : Toutes les 30 secondes
- **Persistance double** : localStorage + IndexedDB pour plus de fiabilité
- **Gestion des quotas** : Détection et alerte sur iOS
- **Support multi-tenant** : Réinitialisation automatique au changement de tenant

### 3. Contexte offline (`resources/js/contexts/OfflineContext.tsx`)

Gère la synchronisation et l'état de connexion.

#### Fonctionnalités :

- **Détection automatique online/offline**
- **Synchronisation intelligente** :
  - Au retour en ligne (délai de 2s)
  - Après sauvegarde locale (délai de 5s)
  - Manuelle via `syncNow()`

- **Prime du cache** : Précharge 30 jours de données au démarrage

- **Synchronisation des entités** :
  - Time entries
  - Invoices
  - Expenses
  - Clients
  - Projects
  - Tasks
  - Expense categories

### 4. Gestion des attachments (`resources/js/utils/offlineAttachments.ts`)

Gère les fichiers joints créés offline.

#### Entités supportées :
- Projects
- Expenses
- Tasks

#### Fonctionnalités :

- **Queue d'upload** : Stocke les fichiers dans IndexedDB
- **Réassignation automatique** : Quand une entité locale reçoit un ID serveur
- **Upload automatique** : Au retour en ligne
- **Support des IDs locaux** : Les fichiers restent en queue jusqu'à ce que l'entité soit synchronisée

## Flux de données

### Création d'une entité offline

```
1. Utilisateur crée une entité (ex: projet)
   ↓
2. Entité enregistrée dans offlineDB avec ID local (local_xxxxx)
   ↓
3. Ajout à la sync_queue avec action='create'
   ↓
4. Service worker intercepte et renvoie réponse optimiste
   ↓
5. Au retour en ligne:
   - Sync vers le serveur
   - Récupération de l'ID serveur
   - Mise à jour de offlineDB
   - Réassignation des attachments
   - Suppression de la queue
```

### Modification d'une entité offline

```
1. Utilisateur modifie une entité existante
   ↓
2. Mise à jour dans offlineDB
   ↓
3. Ajout/mise à jour dans sync_queue avec action='update'
   - Si l'entité a un ID local : action='create' (car pas encore créée sur le serveur)
   - Si l'entité a un ID serveur : action='update'
   - Si l'entité existe déjà dans la queue, on met à jour l'action et les données
   ↓
4. Service worker intercepte et renvoie réponse optimiste
   ↓
5. Au retour en ligne:
   - Si action='create' : POST vers l'endpoint
   - Si action='update' : PUT vers l'endpoint/{id}
   - Mise à jour confirmée
   - Suppression de la queue
```

### Suppression d'une entité offline

```
1. Utilisateur supprime une entité
   ↓
2. Appel à offlineDB.queueDelete(type, entityId)
   ↓
3. Ajout/mise à jour dans sync_queue avec action='delete'
   ↓
4. Au retour en ligne:
   - Si l'entité a un ID serveur : DELETE vers l'endpoint/{id}
   - Si l'entité a un ID local : suppression locale uniquement
   - Suppression de la queue
```

### Timer offline

```
1. Démarrage du timer offline:
   - Création d'une entrée temporaire dans pendingEntities
   - Statut 'running' avec timestamp
   ↓
2. Pause/Resume:
   - Mise à jour du statut
   - Enregistrement des pauses
   ↓
3. Arrêt du timer:
   - Calcul de la durée totale
   - Conversion en time_entry manuelle
   - Ajout à la sync_queue
   ↓
4. Synchronisation:
   - Upload comme time_entry normale
```

## Messages du Service Worker

Le service worker accepte ces messages depuis l'application :

```javascript
// Définir le statut online/offline
navigator.serviceWorker.controller?.postMessage({
  action: 'SET_ONLINE_STATUS',
  online: true/false
});

// Définir le token d'authentification
navigator.serviceWorker.controller?.postMessage({
  action: 'SET_AUTH_TOKEN',
  token: 'your-token'
});

// Forcer un prefetch manuel
navigator.serviceWorker.controller?.postMessage({
  action: 'PREFETCH_NOW'
});

// Forcer un flush de la queue
navigator.serviceWorker.controller?.postMessage({
  action: 'flushOfflineQueue'
});
```

## Indicateurs UI

### Indicateur offline
```tsx
{!isOnline && (
  <div className="fixed bottom-4 left-4 bg-yellow-500 text-white px-4 py-2">
    Offline Mode
    {pendingChanges > 0 && <div>{pendingChanges} pending changes</div>}
  </div>
)}
```

### Indicateur de synchronisation
```tsx
{isSyncing && (
  <div className="fixed bottom-4 right-4 bg-blue-500 text-white px-4 py-2">
    <Spinner /> Syncing...
  </div>
)}
```

## Utilisation dans les composants

```tsx
import { useOffline } from '../contexts/OfflineContext';

function MyComponent() {
  const {
    isOnline,          // Statut de connexion
    isInitialized,     // DB initialisée
    isSyncing,         // Sync en cours
    pendingChanges,    // Nombre de modifications en attente
    offlineDB,         // Instance de la DB
    syncNow,           // Forcer la sync
    clearOfflineData,  // Tout effacer
    saveOffline,       // Sauvegarder offline
    getOfflineData     // Récupérer les données offline
  } = useOffline();

  // Sauvegarder une entité
  const handleSave = async (data) => {
    if (!isOnline) {
      await saveOffline('project', data);
      toast.info('Saved offline, will sync when online');
    } else {
      // Sauvegarder normalement
      await axios.post('/projects', data);
    }
  };

  // Récupérer des données
  const loadData = async () => {
    if (!isOnline) {
      const projects = await getOfflineData('projects');
      return projects;
    }
    // Charger depuis l'API
    const response = await axios.get('/projects');
    return response.data;
  };
}
```

## Gestion des erreurs

### Quota dépassé (iOS)
```javascript
// Détecté automatiquement dans offlineDB.ts
// Alert affiché à l'utilisateur
// Suggestions :
// 1. Synchroniser les données
// 2. Supprimer les anciennes entrées
// 3. Vider le cache Safari
```

### Échec de synchronisation
```javascript
// Les entrées restent dans la queue
// Compteur d'attempts incrémenté
// lastError enregistré
// Réessai au prochain cycle de sync
```

## Optimisations

### Performance
- Cache limité à 100 entrées (50 sur iOS)
- Nettoyage automatique des entrées vieilles de 7 jours (3 jours sur iOS)
- Prefetch avec timeout de 15s
- Prefetch périodique toutes les 5 minutes

### Stockage
- Compression des données JSON
- Double persistance (localStorage + IndexedDB)
- Nettoyage automatique au changement de tenant
- Gestion des quotas iOS

### Réseau
- Network First pour données fraîches
- Cache First pour assets statiques
- Prefetch en arrière-plan
- Debounce des sauvegardes (5s)

## Debugging

### Logs de développement
```javascript
// Actifs uniquement en dev (localhost, .test, .local)
console.log('[ServiceWorker][Debug]', ...);
console.log('[ServiceWorker][DB]', ...);
console.log('[ServiceWorker][API Cache]', ...);
```

### Vérifier l'état du cache
```javascript
navigator.serviceWorker.controller?.postMessage({
  action: 'getCacheInfo'
});
```

### Vider le cache
```javascript
navigator.serviceWorker.controller?.postMessage({
  action: 'clearCache'
});
```

### Forcer un refresh
```javascript
navigator.serviceWorker.controller?.postMessage({
  action: 'forceRefresh'
});
```

## Tests

Pour tester le mode offline :

1. **Chrome DevTools** :
   - Ouvrir DevTools > Network
   - Sélectionner "Offline" dans le dropdown
   - Ou cocher "Offline"

2. **Firefox** :
   - Ouvrir DevTools > Network
   - Cliquer sur l'icône "Throttling"
   - Sélectionner "Offline"

3. **Test du timer** :
   1. Passer offline
   2. Démarrer le timer
   3. Faire pause/resume
   4. Arrêter le timer
   5. Repasser online
   6. Vérifier la synchronisation

4. **Test des CRUD** :
   1. Passer offline
   2. Créer un client
   3. Créer un projet pour ce client
   4. Créer une tâche pour ce projet
   5. Ajouter une dépense
   6. Repasser online
   7. Vérifier que tout est synchronisé dans le bon ordre

5. **Test des attachments** :
   1. Passer offline
   2. Créer un projet
   3. Ajouter un fichier au projet
   4. Repasser online
   5. Vérifier que le projet ET le fichier sont synchronisés

## Limitations connues

1. **Pas de support pour** :
   - Factures (quotes/invoices) - Bloquées volontairement
   - Paiements (payments/stripe)
   - Synchronisation bidirectionnelle en temps réel

2. **iOS** :
   - Quotas de stockage plus restrictifs
   - Cache limité à 50 entrées
   - Durée de vie du cache réduite (3 jours)

3. **Conflits** :
   - Pas de résolution automatique de conflits
   - Le dernier write gagne (last-write-wins)

4. **Timer** :
   - Les pauses sont stockées mais peuvent perdre quelques secondes de précision
   - Le timer ne peut pas être partagé entre appareils en offline

## Améliorations récentes (2025)

### 1. Gestion complète des actions CRUD

Le système gère maintenant **toutes les actions** (Create, Update, Delete) :

- ✅ **Détection automatique** : Le système détermine l'action en fonction de l'ID (local vs serveur)
- ✅ **Déduplication** : Si une entité est déjà dans la queue, on met à jour l'entrée existante au lieu d'en créer une nouvelle
- ✅ **Gestion intelligente** :
  - Création (ID local) → POST
  - Mise à jour (ID serveur) → PUT
  - Suppression → DELETE ou suppression locale uniquement
- ✅ **Logs de débogage** : En mode développement, tous les événements de sync sont loggés

### 2. Support complet des tâches

Les tâches sont maintenant récupérées avec **toutes leurs données** :

- ✅ Commentaires
- ✅ Pièces jointes
- ✅ Checklist/étapes
- ✅ Sous-tâches
- ✅ Dépendances
- ✅ Entrées de temps

Grâce au paramètre `?include_full=true`, une seule requête suffit au lieu de multiples appels API.

### 3. Filtrage automatique par tenant

- ✅ Toutes les requêtes utilisent le token d'authentification
- ✅ Le backend filtre automatiquement par `tenant_id`
- ✅ Aucune donnée d'autres tenants n'est accessible

## Améliorations futures

1. **Synchronisation intelligente** :
   - Détection de conflits
   - Merge automatique
   - Résolution manuelle en cas de conflit complexe

2. **Compression** :
   - Compression des données avant stockage
   - Décompression à la lecture

3. **Background Sync API** :
   - Utiliser Background Sync pour plus de fiabilité
   - Sync même après fermeture du navigateur

4. **Encryption** :
   - Chiffrement des données sensibles dans le cache
   - Déchiffrement à la lecture

5. **Analytics offline** :
   - Tracking des événements offline
   - Upload lors du retour en ligne
