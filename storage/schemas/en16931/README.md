# Schémas XSD EN 16931 pour Factur-X

Ce répertoire contient les schémas XSD officiels pour la validation des factures électroniques EN 16931.

## Profils supportés

- **BASIC** : Profil minimum (recommandé pour PME)
- **COMFORT** : Profil intermédiaire
- **EXTENDED** : Profil complet

## Sources officielles

Les schémas sont basés sur la norme ZUGFeRD 2.x / Factur-X compatible EN 16931.

Package utilisé : horstoeko/zugferd
Repository : https://github.com/horstoeko/zugferd

## Installation

Les schémas sont automatiquement chargés par le package horstoeko/zugferd.
Ce répertoire sert de référence et de cache local pour validation personnalisée.

## Utilisation

Le service XsdValidationService charge automatiquement ces schémas pour valider
les documents XML générés avant embedding dans le PDF/A-3.
