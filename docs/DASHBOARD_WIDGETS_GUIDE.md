# Guide du Système de Widgets du Dashboard

## 📊 Vue d'ensemble

Le dashboard de TimeIsMoney a été entièrement refactorisé avec un système de widgets **modulaires**, **personnalisables** et **drag-and-drop**.

### ✨ Fonctionnalités

- **🎨 Widgets modulaires** : Composants réutilisables et indépendants
- **🔄 Drag-and-drop** : Réorganisation des widgets par glisser-déposer
- **💾 Persistance** : Sauvegarde automatique de la disposition dans localStorage
- **📱 Responsive** : Layouts adaptés pour mobile, tablet et desktop
- **🎯 Layouts prédéfinis** : Default, Compact, Analytics, Mobile

## 🏗️ Architecture

### Structure des dossiers

```
resources/js/
├── components/
│   └── Dashboard/
│       ├── DashboardGrid.tsx          # Composant grille principal
│       ├── defaultLayouts.ts          # Configurations de layouts
│       └── Widgets/
│           ├── index.ts               # Export centralisé
│           ├── WidgetContainer.tsx    # Container de base
│           ├── StatWidget.tsx         # Widget statistique
│           ├── ChartWidget.tsx        # Widget graphique
│           ├── TimeTrackingChart.tsx  # Graphique suivi temps
│           ├── ProjectDistributionChart.tsx
│           ├── MonthlyRevenueChart.tsx
│           ├── RecentActivityWidget.tsx
│           ├── QuickActionsWidget.tsx
│           ├── TasksSummaryWidget.tsx
│           ├── ClientStatsWidget.tsx
│           ├── ExpensesSummaryWidget.tsx
│           └── TopProjectsWidget.tsx
└── pages/
    └── Dashboard.tsx                  # Page dashboard principale
```

## 📦 Widgets Disponibles

### 1. **StatWidget** - Widget de statistique
Affiche une métrique avec icône, tendance et badge optionnel.

```tsx
<StatWidget
    title="Aujourd'hui"
    value={formatDuration(hours * 3600)}
    subtitle="12 entrées"
    icon={Clock}
    iconColor="text-blue-600"
    iconBgColor="bg-blue-100"
    trend={15.5}
    trendLabel="vs hier"
    badge="Nouveau"
    badgeColor="bg-green-500"
/>
```

**Props:**
- `title`: string - Titre du widget
- `value`: string | number - Valeur principale
- `subtitle?`: string - Sous-titre
- `icon`: LucideIcon - Icône Lucide
- `iconColor?`: string - Couleur de l'icône (classes Tailwind)
- `iconBgColor?`: string - Couleur de fond de l'icône
- `trend?`: number - Pourcentage de tendance
- `trendLabel?`: string - Label de la tendance
- `badge?`: string - Texte du badge
- `badgeColor?`: string - Couleur du badge
- `onClick?`: () => void - Handler de clic

### 2. **TimeTrackingChart** - Graphique de suivi du temps
Affiche un graphique linéaire des heures et montants.

```tsx
<TimeTrackingChart
    data={[
        { date: '2025-11-01', hours: 8, amount: 400 },
        { date: '2025-11-02', hours: 6, amount: 300 }
    ]}
    isLoading={false}
/>
```

### 3. **ProjectDistributionChart** - Répartition des projets
Graphique en camembert de la distribution des projets.

```tsx
<ProjectDistributionChart
    data={[
        { name: 'Projet A', value: 1500, hours: 30 },
        { name: 'Projet B', value: 1200, hours: 24 }
    ]}
    isLoading={false}
/>
```

### 4. **MonthlyRevenueChart** - Revenu mensuel
Graphique en barres du revenu facturé vs payé.

```tsx
<MonthlyRevenueChart
    data={[
        { month: 'Jan 2025', invoiced: 5000, paid: 4500 },
        { month: 'Fev 2025', invoiced: 6000, paid: 5500 }
    ]}
    isLoading={false}
/>
```

### 5. **RecentActivityWidget** - Activités récentes
Liste des dernières activités avec icônes et horodatage relatif.

```tsx
<RecentActivityWidget
    activities={[
        {
            id: '1',
            type: 'time_entry',
            description: 'Time entry added for Project X',
            created_at: '2025-11-08T10:30:00Z'
        }
    ]}
    isLoading={false}
    maxHeight={384}
/>
```

### 6. **QuickActionsWidget** - Actions rapides
Liens rapides vers les actions fréquentes.

```tsx
<QuickActionsWidget />
```

### 7. **TasksSummaryWidget** - Résumé des tâches
Affiche les statistiques des tâches avec liens vers les filtres.

```tsx
<TasksSummaryWidget
    tasks={{
        todo: 5,
        in_progress: 3,
        completed: 12,
        overdue: 2
    }}
    isLoading={false}
/>
```

### 8. **ClientStatsWidget** - Statistiques clients
Vue d'ensemble des clients avec taux d'activité.

```tsx
<ClientStatsWidget
    stats={{
        total: 45,
        active: 38,
        inactive: 7,
        new_this_month: 3,
        total_revenue: 125000
    }}
    isLoading={false}
/>
```

### 9. **ExpensesSummaryWidget** - Résumé des dépenses
Tendance et catégories principales des dépenses.

```tsx
<ExpensesSummaryWidget
    stats={{
        this_month: 2500,
        last_month: 2100,
        pending: 350,
        categories: [
            { name: 'Logiciels', amount: 800 },
            { name: 'Marketing', amount: 600 }
        ]
    }}
    isLoading={false}
/>
```

### 10. **TopProjectsWidget** - Top projets
Liste des projets principaux avec progression.

```tsx
<TopProjectsWidget
    projects={[
        {
            id: 1,
            name: 'Website Redesign',
            client_name: 'ACME Corp',
            hours: 45.5,
            revenue: 4550,
            progress: 65,
            status: 'active'
        }
    ]}
    isLoading={false}
/>
```

## 🎨 Système de Grille

### DashboardGrid Component

Le composant `DashboardGrid` gère le système de drag-and-drop.

```tsx
<DashboardGrid
    layouts={layout}
    onLayoutChange={handleLayoutChange}
    editable={editMode}
    cols={12}
    rowHeight={80}
>
    {/* Widgets enfants */}
</DashboardGrid>
```

**Props:**
- `layouts`: Layout[] - Configuration de la grille
- `onLayoutChange?`: (layout: Layout[]) => void - Callback de changement
- `editable?`: boolean - Mode édition activé
- `cols?`: number - Nombre de colonnes (défaut: 12)
- `rowHeight?`: number - Hauteur d'une ligne en px (défaut: 80)

### Layouts prédéfinis

```typescript
import { defaultLayout, compactLayout, analyticsLayout, mobileLayout } from './defaultLayouts';

// Ou obtenir un layout par nom
import { getLayoutByName } from './defaultLayouts';
const layout = getLayoutByName('analytics');
```

### Configuration d'un Widget dans le Layout

```typescript
{
    i: 'widget-id',           // ID unique
    x: 0,                     // Position X (0-11)
    y: 0,                     // Position Y
    w: 3,                     // Largeur (en colonnes)
    h: 2,                     // Hauteur (en lignes)
    minW: 2,                  // Largeur minimale
    minH: 2                   // Hauteur minimale
}
```

## 💾 Persistance

### Sauvegarde automatique

Le dashboard sauvegarde automatiquement la disposition dans localStorage :

```typescript
import { saveLayout, loadLayout, resetLayout } from './defaultLayouts';

// Sauvegarder
saveLayout(currentLayout, userId);

// Charger
const savedLayout = loadLayout(userId);

// Réinitialiser
resetLayout(userId);
```

## 🎯 Mode Édition

Le dashboard propose un mode édition pour personnaliser la disposition :

```tsx
const [editMode, setEditMode] = useState(false);

// Bouton de personnalisation
<button onClick={() => setEditMode(!editMode)}>
    {editMode ? 'Terminer' : 'Personnaliser'}
</button>

// Passer le mode à la grille
<DashboardGrid editable={editMode} ... />
```

En mode édition :
- **Drag** : Cliquer et glisser la barre en haut d'un widget
- **Resize** : Utiliser la poignée en bas à droite
- **Auto-save** : La disposition est sauvegardée automatiquement

## 🔧 Créer un Nouveau Widget

### 1. Créer le composant

```tsx
// resources/js/components/Dashboard/Widgets/MyCustomWidget.tsx
import React from 'react';
import WidgetContainer from './WidgetContainer';
import { Icon } from 'lucide-react';

interface MyCustomWidgetProps {
    data?: any;
    isLoading?: boolean;
}

const MyCustomWidget: React.FC<MyCustomWidgetProps> = ({ data, isLoading }) => {
    return (
        <WidgetContainer
            title="Mon Widget"
            icon={Icon}
            iconColor="text-purple-600"
            iconBgColor="bg-purple-100"
            isLoading={isLoading}
        >
            <div>
                {/* Contenu du widget */}
            </div>
        </WidgetContainer>
    );
};

export default MyCustomWidget;
```

### 2. Exporter le widget

```typescript
// resources/js/components/Dashboard/Widgets/index.ts
export { default as MyCustomWidget } from './MyCustomWidget';
```

### 3. Ajouter au Dashboard

```tsx
// resources/js/pages/Dashboard.tsx
import { MyCustomWidget } from '../components/Dashboard/Widgets';

// Dans le DashboardGrid
<DashboardGrid ...>
    {/* ... autres widgets ... */}
    <MyCustomWidget data={customData} isLoading={loading} />
</DashboardGrid>
```

### 4. Ajouter au layout

```typescript
// resources/js/components/Dashboard/defaultLayouts.ts
export const defaultLayout: Layout[] = [
    // ... autres widgets ...
    { i: 'my-custom-widget', x: 0, y: 10, w: 6, h: 3, minW: 4, minH: 3 },
];
```

## 📱 Responsive Design

Les widgets s'adaptent automatiquement grâce aux classes Tailwind :
- `sm:` - Small screens (640px+)
- `md:` - Medium screens (768px+)
- `lg:` - Large screens (1024px+)
- `xl:` - Extra large screens (1280px+)

Exemple :
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    {/* Widgets */}
</div>
```

## 🎨 Personnalisation des Couleurs

Les widgets utilisent des classes Tailwind pour les couleurs :

```tsx
// Bleu
iconColor="text-blue-600 dark:text-blue-400"
iconBgColor="bg-blue-100 dark:bg-blue-900"

// Vert
iconColor="text-green-600 dark:text-green-400"
iconBgColor="bg-green-100 dark:bg-green-900"

// Rouge
iconColor="text-red-600 dark:text-red-400"
iconBgColor="bg-red-100 dark:bg-red-900"

// Purple
iconColor="text-purple-600 dark:text-purple-400"
iconBgColor="bg-purple-100 dark:bg-purple-900"
```

## 🚀 Prochaines Améliorations

- [ ] API backend pour sauvegarder les préférences de dashboard
- [ ] Page Dashboard Settings pour personnalisation avancée
- [ ] Widgets supplémentaires (Google Calendar, Stripe, etc.)
- [ ] Filtres et drill-down interactifs dans les graphiques
- [ ] Export de données des widgets
- [ ] Dashboards par rôle (Admin, Manager, Employee)
- [ ] Widgets cachables/affichables
- [ ] Themes de couleurs personnalisés

## 📚 Ressources

- [React Grid Layout Documentation](https://github.com/react-grid-layout/react-grid-layout)
- [Recharts Documentation](https://recharts.org/)
- [Lucide Icons](https://lucide.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
