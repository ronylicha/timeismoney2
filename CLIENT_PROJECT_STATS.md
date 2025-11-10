# Ajout des statistiques de projets dans les cartes clients

## Description
Ajout du nombre de projets actifs et non actifs dans les cartes de la liste des clients.

## Modifications effectuées

### Backend (PHP/Laravel)

#### 1. Modèle Client (`app/Models/Client.php`)
- Ajout de la méthode `getActiveProjectsCountAttribute()` pour compter les projets actifs (status = 'active')
- Ajout de la méthode `getInactiveProjectsCountAttribute()` pour compter les projets non actifs (status != 'active')

#### 2. Contrôleur API (`app/Http/Controllers/Api/ClientController.php`)
- Modification de la méthode `index()` pour inclure les projets dans la requête
- Ajout du traitement des données pour inclure les compteurs de projets dans la réponse

### Frontend (React/TypeScript)

#### 1. Composant Clients (`resources/js/pages/Clients.tsx`)
- Mise à jour de l'interface `Client` pour inclure les nouveaux champs
- Modification de l'affichage des statistiques dans les cartes clients
- Changement de la grille de 2 colonnes à 3 colonnes pour afficher :
  - Projets actifs (en vert)
  - Projets inactifs (en gris)
  - Revenu total

#### 2. Fichiers de traduction
- Ajout des clés `clients.inactiveProjects` dans les 3 langues (fr, en, es)

## Fonctionnalités

### Définition des statuts de projets
- **Projets actifs** : projets avec le statut `active`
- **Projets inactifs** : projets avec les statuts `completed`, `archived`, `on_hold`, `cancelled`

### Affichage dans l'interface
- Les cartes clients affichent maintenant 3 métriques :
  1. Nombre de projets actifs (texte vert)
  2. Nombre de projets inactifs (texte gris)
  3. Revenu total généré par le client

### Performance
- Les compteurs sont calculés côté serveur via des requêtes optimisées
- Les données sont chargées en une seule fois avec les autres informations client

## Tests
- Build frontend réussi sans erreurs
- Routes API vérifiées et fonctionnelles
- Traductions ajoutées dans les 3 langues supportées

## Utilisation
Les utilisateurs peuvent maintenant voir rapidement combien de projets chaque client a, en distinguant les projets actifs des projets terminés/archivés, ce qui aide à évaluer l'activité commerciale avec chaque client.