<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Documentation - {{ config('app.name') }}</title>

    <link rel="preconnect" href="https://fonts.bunny.net">
    <link href="https://fonts.bunny.net/css?family=inter:400,500,600,700" rel="stylesheet" />

    @vite(['resources/css/app.css', 'resources/js/app.js'])

    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', system-ui, -apple-system, sans-serif; line-height: 1.6; color: #1a202c; background: #f7fafc; }
        .container { max-width: 1200px; margin: 0 auto; padding: 0 1.5rem; }

        .navbar { background: white; border-bottom: 1px solid #e2e8f0; padding: 1rem 0; }
        .nav-content { display: flex; justify-content: space-between; align-items: center; }
        .logo { height: 40px; }

        .hero { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 4rem 0; text-align: center; }
        .hero h1 { font-size: 3rem; font-weight: 800; margin-bottom: 1rem; }
        .hero p { font-size: 1.25rem; opacity: 0.95; }

        .content-section { padding: 5rem 0; }
        .docs-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 2rem; }
        .doc-card { background: white; padding: 2rem; border-radius: 1rem; border: 1px solid #e2e8f0; transition: all 0.3s; }
        .doc-card:hover { transform: translateY(-5px); box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1); border-color: #3b82f6; }
        .doc-icon { width: 60px; height: 60px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 1rem; display: flex; align-items: center; justify-content: center; font-size: 1.75rem; margin-bottom: 1.5rem; }
        .doc-card h3 { font-size: 1.25rem; font-weight: 700; margin-bottom: 0.75rem; color: #2d3748; }
        .doc-card p { color: #718096; margin-bottom: 1rem; line-height: 1.7; }
        .doc-links { display: flex; flex-direction: column; gap: 0.5rem; }
        .doc-link { color: #3b82f6; text-decoration: none; font-weight: 500; display: flex; align-items: center; gap: 0.5rem; transition: color 0.2s; }
        .doc-link:hover { color: #2563eb; }

        .community-section { background: white; padding: 4rem 0; margin-top: 3rem; border-radius: 1rem; }
        .community-content { max-width: 800px; margin: 0 auto; text-align: center; }
        .community-content h2 { font-size: 2rem; font-weight: 700; margin-bottom: 1rem; color: #2d3748; }
        .community-content p { color: #718096; margin-bottom: 2rem; line-height: 1.8; }
        .community-links { display: flex; justify-content: center; gap: 1rem; flex-wrap: wrap; }
        .btn { display: inline-block; padding: 0.75rem 1.5rem; border-radius: 0.5rem; font-weight: 600; text-decoration: none; transition: all 0.2s; }
        .btn-primary { background: #3b82f6; color: white; }
        .btn-primary:hover { background: #2563eb; transform: translateY(-2px); box-shadow: 0 10px 20px rgba(59, 130, 246, 0.3); }
        .btn-outline { background: transparent; color: #3b82f6; border: 2px solid #3b82f6; }
        .btn-outline:hover { background: #3b82f6; color: white; }

        .footer { background: #2d3748; color: white; padding: 2rem 0; text-align: center; margin-top: 4rem; }
        .footer a { color: #cbd5e0; text-decoration: none; margin: 0 1rem; }
        .footer a:hover { color: white; }

        @media (max-width: 768px) {
            .hero h1 { font-size: 2rem; }
            .docs-grid { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>
    <nav class="navbar">
        <div class="container">
            <div class="nav-content">
                <a href="/"><img src="{{ asset('images/logo.svg') }}" alt="Time Is Money" class="logo"></a>
            </div>
        </div>
    </nav>

    <section class="hero">
        <div class="container">
            <h1>Documentation</h1>
            <p>Guides, tutoriels et ressources pour bien démarrer</p>
        </div>
    </section>

    <section class="content-section">
        <div class="container">
            <div class="docs-grid">
                <div class="doc-card">
                    <div class="doc-icon">🚀</div>
                    <h3>Guide de démarrage</h3>
                    <p>Tout ce qu'il faut savoir pour commencer avec Time Is Money</p>
                    <div class="doc-links">
                        <a href="#" class="doc-link">→ Configuration initiale</a>
                        <a href="#" class="doc-link">→ Créer votre premier projet</a>
                        <a href="#" class="doc-link">→ Inviter votre équipe</a>
                    </div>
                </div>

                <div class="doc-card">
                    <div class="doc-icon">⏱️</div>
                    <h3>Gestion du temps</h3>
                    <p>Apprenez à utiliser le timer et les feuilles de temps</p>
                    <div class="doc-links">
                        <a href="#" class="doc-link">→ Utiliser le timer</a>
                        <a href="#" class="doc-link">→ Saisir les temps manuellement</a>
                        <a href="#" class="doc-link">→ Mode hors ligne</a>
                    </div>
                </div>

                <div class="doc-card">
                    <div class="doc-icon">📄</div>
                    <h3>Facturation</h3>
                    <p>Créez des devis et factures conformes NF525</p>
                    <div class="doc-links">
                        <a href="#" class="doc-link">→ Créer une facture</a>
                        <a href="#" class="doc-link">→ Envoyer à Chorus Pro</a>
                        <a href="#" class="doc-link">→ Gérer les paiements</a>
                    </div>
                </div>

                <div class="doc-card">
                    <div class="doc-icon">🏗️</div>
                    <h3>Gestion de projets</h3>
                    <p>Organisez votre travail avec Kanban et Gantt</p>
                    <div class="doc-links">
                        <a href="#" class="doc-link">→ Vue Kanban</a>
                        <a href="#" class="doc-link">→ Diagramme de Gantt</a>
                        <a href="#" class="doc-link">→ Templates de projets</a>
                    </div>
                </div>

                <div class="doc-card">
                    <div class="doc-icon">👥</div>
                    <h3>Gestion d'équipe</h3>
                    <p>Gérez les membres et les permissions</p>
                    <div class="doc-links">
                        <a href="#" class="doc-link">→ Inviter des membres</a>
                        <a href="#" class="doc-link">→ Rôles et permissions</a>
                        <a href="#" class="doc-link">→ Gestion des accès</a>
                    </div>
                </div>

                <div class="doc-card">
                    <div class="doc-icon">📊</div>
                    <h3>Rapports et Analytics</h3>
                    <p>Analysez vos données et exportez vos rapports</p>
                    <div class="doc-links">
                        <a href="#" class="doc-link">→ Tableaux de bord</a>
                        <a href="#" class="doc-link">→ Export FEC</a>
                        <a href="#" class="doc-link">→ Rapports personnalisés</a>
                    </div>
                </div>

                <div class="doc-card">
                    <div class="doc-icon">🔒</div>
                    <h3>Sécurité et Conformité</h3>
                    <p>Comprenez comment vos données sont protégées</p>
                    <div class="doc-links">
                        <a href="#" class="doc-link">→ Conformité NF525</a>
                        <a href="#" class="doc-link">→ RGPD et données</a>
                        <a href="#" class="doc-link">→ Sauvegardes</a>
                    </div>
                </div>

                <div class="doc-card">
                    <div class="doc-icon">🔧</div>
                    <h3>API et Intégrations</h3>
                    <p>Connectez Time Is Money à vos outils</p>
                    <div class="doc-links">
                        <a href="#" class="doc-link">→ Documentation API</a>
                        <a href="#" class="doc-link">→ Webhooks</a>
                        <a href="#" class="doc-link">→ Intégrations tierces</a>
                    </div>
                </div>

                <div class="doc-card">
                    <div class="doc-icon">💻</div>
                    <h3>Version Communautaire</h3>
                    <p>Guide d'installation pour auto-hébergement</p>
                    <div class="doc-links">
                        <a href="#" class="doc-link">→ Prérequis système</a>
                        <a href="#" class="doc-link">→ Installation</a>
                        <a href="#" class="doc-link">→ Configuration avancée</a>
                    </div>
                </div>
            </div>

            <div class="community-section">
                <div class="community-content">
                    <h2>Besoin d'aide supplémentaire ?</h2>
                    <p>
                        Notre communauté et notre équipe support sont là pour vous accompagner.
                        Posez vos questions, partagez vos astuces et découvrez les meilleures pratiques.
                    </p>
                    <div class="community-links">
                        <a href="{{ route('support') }}" class="btn btn-primary">Centre d'aide</a>
                        <a href="{{ route('contact') }}" class="btn btn-outline">Contacter le support</a>
                        <a href="#" class="btn btn-outline">Forum communauté</a>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <footer class="footer">
        <div class="container">
            <p>
                <a href="/">Accueil</a>
                <a href="{{ route('pricing') }}">Tarifs</a>
                <a href="{{ route('support') }}">Support</a>
                <a href="{{ route('about') }}">À propos</a>
            </p>
            <p style="margin-top: 1rem; color: #cbd5e0;">
                &copy; {{ date('Y') }} Time Is Money. Tous droits réservés.
            </p>
        </div>
    </footer>
</body>
</html>
