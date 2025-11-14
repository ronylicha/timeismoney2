<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>À propos - {{ config('app.name') }}</title>

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

        .hero { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 5rem 0; text-align: center; }
        .hero h1 { font-size: 3rem; font-weight: 800; margin-bottom: 1rem; }
        .hero p { font-size: 1.25rem; opacity: 0.95; max-width: 700px; margin: 0 auto; }

        .content-section { padding: 5rem 0; }
        .content-wrapper { max-width: 900px; margin: 0 auto; background: white; padding: 3rem; border-radius: 1rem; border: 1px solid #e2e8f0; }
        .content-wrapper h2 { font-size: 2rem; font-weight: 700; margin-bottom: 1rem; color: #2d3748; }
        .content-wrapper h3 { font-size: 1.5rem; font-weight: 600; margin-top: 2rem; margin-bottom: 1rem; color: #2d3748; }
        .content-wrapper p { color: #4a5568; margin-bottom: 1rem; line-height: 1.8; }
        .content-wrapper ul { margin-left: 1.5rem; margin-bottom: 1rem; color: #4a5568; }
        .content-wrapper li { margin-bottom: 0.5rem; line-height: 1.8; }

        .values-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 2rem; margin: 2rem 0; }
        .value-card { padding: 1.5rem; background: #f7fafc; border-radius: 0.75rem; border: 1px solid #e2e8f0; }
        .value-icon { font-size: 2rem; margin-bottom: 0.75rem; }
        .value-card h4 { font-weight: 600; color: #2d3748; margin-bottom: 0.5rem; }
        .value-card p { color: #718096; font-size: 0.95rem; }

        .stats-section { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 4rem 0; margin: 3rem 0; border-radius: 1rem; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 2rem; text-align: center; }
        .stat-item h3 { font-size: 3rem; font-weight: 800; margin-bottom: 0.5rem; }
        .stat-item p { font-size: 1.125rem; opacity: 0.95; }

        .cta-section { background: white; padding: 3rem; border-radius: 1rem; text-align: center; border: 2px solid #3b82f6; margin-top: 3rem; }
        .cta-section h3 { font-size: 1.75rem; font-weight: 700; margin-bottom: 1rem; color: #2d3748; }
        .cta-section p { color: #718096; margin-bottom: 1.5rem; }
        .btn { display: inline-block; padding: 0.75rem 1.5rem; border-radius: 0.5rem; font-weight: 600; text-decoration: none; transition: all 0.2s; margin: 0 0.5rem; }
        .btn-primary { background: #3b82f6; color: white; }
        .btn-primary:hover { background: #2563eb; transform: translateY(-2px); box-shadow: 0 10px 20px rgba(59, 130, 246, 0.3); }
        .btn-outline { background: transparent; color: #3b82f6; border: 2px solid #3b82f6; }
        .btn-outline:hover { background: #3b82f6; color: white; }

        .footer { background: #2d3748; color: white; padding: 2rem 0; text-align: center; }
        .footer a { color: #cbd5e0; text-decoration: none; margin: 0 1rem; }
        .footer a:hover { color: white; }

        @media (max-width: 768px) {
            .hero h1 { font-size: 2rem; }
            .content-wrapper { padding: 1.5rem; }
            .values-grid, .stats-grid { grid-template-columns: 1fr; }
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
            <h1>À propos de Time Is Money</h1>
            <p>
                Notre mission : simplifier la gestion du temps et la facturation pour les professionnels français
            </p>
        </div>
    </section>

    <section class="content-section">
        <div class="container">
            <div class="content-wrapper">
                <h2>Notre histoire</h2>
                <p>
                    Time Is Money est née d'un constat simple : les professionnels perdent un temps précieux à gérer
                    leur facturation et leur suivi de temps avec des outils complexes ou inadaptés aux normes françaises.
                </p>
                <p>
                    Fondée en 2024, notre entreprise s'est donné pour mission de créer une solution moderne, intuitive
                    et 100% conforme aux réglementations françaises. Nous croyons que la technologie doit simplifier
                    le travail quotidien, pas le compliquer.
                </p>

                <h3>Notre mission</h3>
                <p>
                    Permettre à chaque professionnel et chaque entreprise en France de gérer efficacement leur temps
                    et leur facturation, tout en respectant les normes légales les plus strictes. Nous voulons que vous
                    puissiez vous concentrer sur votre cœur de métier, pendant que nous nous occupons du reste.
                </p>

                <h3>Nos valeurs</h3>
                <div class="values-grid">
                    <div class="value-card">
                        <div class="value-icon">🎯</div>
                        <h4>Simplicité</h4>
                        <p>Nous concevons des outils intuitifs qui s'apprennent en quelques minutes</p>
                    </div>
                    <div class="value-card">
                        <div class="value-icon">🔒</div>
                        <h4>Sécurité</h4>
                        <p>Vos données sont cryptées, sauvegardées et hébergées en France</p>
                    </div>
                    <div class="value-card">
                        <div class="value-icon">⚖️</div>
                        <h4>Conformité</h4>
                        <p>100% conforme aux normes françaises (NF525, RGPD, Chorus Pro)</p>
                    </div>
                    <div class="value-card">
                        <div class="value-icon">🚀</div>
                        <h4>Innovation</h4>
                        <p>Nous évoluons constamment pour vous offrir les meilleures fonctionnalités</p>
                    </div>
                </div>

                <div class="stats-section">
                    <div class="stats-grid">
                        <div class="stat-item">
                            <h3>500+</h3>
                            <p>Entreprises clientes</p>
                        </div>
                        <div class="stat-item">
                            <h3>99.9%</h3>
                            <p>Disponibilité</p>
                        </div>
                        <div class="stat-item">
                            <h3>50K+</h3>
                            <p>Factures générées</p>
                        </div>
                        <div class="stat-item">
                            <h3>100%</h3>
                            <p>Made in France</p>
                        </div>
                    </div>
                </div>

                <h3>Pourquoi nous choisir ?</h3>
                <ul>
                    <li><strong>Conformité garantie :</strong> Toutes nos factures sont conformes NF525 et peuvent être transmises via Chorus Pro</li>
                    <li><strong>Support français :</strong> Notre équipe basée à Paris vous répond rapidement en français</li>
                    <li><strong>Données souveraines :</strong> Vos données sont hébergées en France et jamais partagées</li>
                    <li><strong>Mises à jour continues :</strong> Nous améliorons la plateforme chaque semaine</li>
                    <li><strong>Pas de mauvaise surprise :</strong> Tarification transparente, sans frais cachés</li>
                    <li><strong>Version communautaire :</strong> Pour les équipes techniques, possibilité d'auto-hébergement</li>
                </ul>

                <h3>Notre engagement</h3>
                <p>
                    Nous nous engageons à maintenir les plus hauts standards de qualité, de sécurité et de conformité.
                    Chaque fonctionnalité est testée rigoureusement avant d'être déployée. Nous écoutons nos utilisateurs
                    et leurs retours façonnent activement l'évolution du produit.
                </p>
                <p>
                    Time Is Money est plus qu'un logiciel : c'est un partenaire de confiance pour votre activité professionnelle.
                </p>
            </div>

            <div class="cta-section">
                <h3>Prêt à nous rejoindre ?</h3>
                <p>Essayez Time Is Money gratuitement pendant 14 jours, sans engagement</p>
                <div>
                    <a href="{{ route('pricing') }}" class="btn btn-primary">Voir les offres</a>
                    <a href="{{ route('contact') }}" class="btn btn-outline">Nous contacter</a>
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
                <a href="{{ route('contact') }}">Contact</a>
            </p>
            <p style="margin-top: 1rem; color: #cbd5e0;">
                &copy; {{ date('Y') }} Time Is Money. Tous droits réservés.
            </p>
        </div>
    </footer>
</body>
</html>
