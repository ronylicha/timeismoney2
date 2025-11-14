<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ config('app.name') }} - Gestion du temps et facturation professionnelle</title>
    <meta name="description" content="Solution SaaS professionnelle de gestion du temps et de facturation conforme aux normes françaises (NF525, Chorus Pro, FacturX).">

    <link rel="preconnect" href="https://fonts.bunny.net">
    <link href="https://fonts.bunny.net/css?family=inter:400,500,600,700" rel="stylesheet" />

    @vite(['resources/css/app.css', 'resources/js/app.js'])

    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            line-height: 1.6;
            color: #1a202c;
            background: #ffffff;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 1.5rem;
        }

        /* Navigation */
        .navbar {
            position: sticky;
            top: 0;
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border-bottom: 1px solid #e2e8f0;
            padding: 1rem 0;
            z-index: 100;
        }

        .nav-content {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .logo {
            height: 40px;
        }

        .nav-links {
            display: flex;
            gap: 2rem;
            list-style: none;
            align-items: center;
        }

        .nav-links a {
            color: #4a5568;
            text-decoration: none;
            font-weight: 500;
            transition: color 0.2s;
        }

        .nav-links a:hover {
            color: #3b82f6;
        }

        .btn {
            display: inline-block;
            padding: 0.75rem 1.5rem;
            border-radius: 0.5rem;
            font-weight: 600;
            text-decoration: none;
            transition: all 0.2s;
            border: none;
            cursor: pointer;
        }

        .btn-primary {
            background: #3b82f6;
            color: white;
        }

        .btn-primary:hover {
            background: #2563eb;
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(59, 130, 246, 0.3);
        }

        .btn-outline {
            background: transparent;
            color: #3b82f6;
            border: 2px solid #3b82f6;
        }

        .btn-outline:hover {
            background: #3b82f6;
            color: white;
        }

        /* Hero Section */
        .hero {
            padding: 5rem 0;
            text-align: center;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }

        .hero h1 {
            font-size: 3.5rem;
            font-weight: 800;
            margin-bottom: 1.5rem;
            line-height: 1.2;
        }

        .hero p {
            font-size: 1.25rem;
            margin-bottom: 2.5rem;
            opacity: 0.95;
            max-width: 700px;
            margin-left: auto;
            margin-right: auto;
        }

        .hero-buttons {
            display: flex;
            gap: 1rem;
            justify-content: center;
            flex-wrap: wrap;
        }

        .btn-white {
            background: white;
            color: #667eea;
        }

        .btn-white:hover {
            background: #f7fafc;
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
        }

        /* Features Section */
        .features {
            padding: 5rem 0;
        }

        .section-title {
            text-align: center;
            font-size: 2.5rem;
            font-weight: 700;
            margin-bottom: 1rem;
            color: #2d3748;
        }

        .section-subtitle {
            text-align: center;
            font-size: 1.125rem;
            color: #718096;
            margin-bottom: 3rem;
            max-width: 600px;
            margin-left: auto;
            margin-right: auto;
        }

        .features-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 2rem;
            margin-top: 3rem;
        }

        .feature-card {
            padding: 2rem;
            background: white;
            border-radius: 1rem;
            border: 1px solid #e2e8f0;
            transition: all 0.3s;
        }

        .feature-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
            border-color: #3b82f6;
        }

        .feature-icon {
            width: 60px;
            height: 60px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 1rem;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.75rem;
            margin-bottom: 1.5rem;
        }

        .feature-card h3 {
            font-size: 1.25rem;
            font-weight: 600;
            margin-bottom: 0.75rem;
            color: #2d3748;
        }

        .feature-card p {
            color: #718096;
            line-height: 1.7;
        }

        /* Compliance Section */
        .compliance {
            padding: 5rem 0;
            background: #f7fafc;
        }

        .compliance-badges {
            display: flex;
            justify-content: center;
            gap: 2rem;
            flex-wrap: wrap;
            margin-top: 2rem;
        }

        .badge {
            padding: 1rem 2rem;
            background: white;
            border-radius: 0.75rem;
            border: 2px solid #e2e8f0;
            font-weight: 600;
            color: #2d3748;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        .badge-icon {
            color: #48bb78;
            font-size: 1.25rem;
        }

        /* CTA Section */
        .cta {
            padding: 5rem 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-align: center;
        }

        .cta h2 {
            font-size: 2.5rem;
            font-weight: 700;
            margin-bottom: 1rem;
        }

        .cta p {
            font-size: 1.25rem;
            margin-bottom: 2rem;
            opacity: 0.95;
        }

        /* Footer */
        .footer {
            background: #2d3748;
            color: white;
            padding: 3rem 0 1.5rem;
        }

        .footer-content {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 2rem;
            margin-bottom: 2rem;
        }

        .footer h4 {
            font-size: 1.125rem;
            margin-bottom: 1rem;
        }

        .footer ul {
            list-style: none;
        }

        .footer ul li {
            margin-bottom: 0.5rem;
        }

        .footer a {
            color: #cbd5e0;
            text-decoration: none;
            transition: color 0.2s;
        }

        .footer a:hover {
            color: white;
        }

        .footer-bottom {
            text-align: center;
            padding-top: 2rem;
            border-top: 1px solid #4a5568;
            color: #cbd5e0;
        }

        @media (max-width: 768px) {
            .hero h1 {
                font-size: 2.5rem;
            }

            .nav-links {
                display: none;
            }

            .features-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <!-- Navigation -->
    <nav class="navbar">
        <div class="container">
            <div class="nav-content">
                <a href="/">
                    <img src="{{ asset('images/logo.svg') }}" alt="Time Is Money" class="logo">
                </a>

                <ul class="nav-links">
                    <li><a href="#features">Fonctionnalités</a></li>
                    <li><a href="#compliance">Conformité</a></li>
                    <li><a href="{{ route('pricing') }}">Tarifs</a></li>
                    @if (Route::has('login'))
                        @auth
                            <li><a href="{{ url('/dashboard') }}" class="btn btn-primary">Dashboard</a></li>
                        @else
                            <li><a href="{{ route('login') }}">Connexion</a></li>
                            <li><a href="#" class="btn btn-primary">Essai Gratuit</a></li>
                        @endauth
                    @endif
                </ul>
            </div>
        </div>
    </nav>

    <!-- Hero Section -->
    <section class="hero">
        <div class="container">
            <h1>Gérez votre temps,<br>Optimisez votre facturation</h1>
            <p>
                La solution SaaS professionnelle pour le suivi du temps et la facturation conforme
                aux normes françaises. Gagnez en productivité et en sérénité.
            </p>
            <div class="hero-buttons">
                <a href="#" class="btn btn-white">Commencer l'essai gratuit</a>
                <a href="{{ route('pricing') }}" class="btn btn-outline">Voir les tarifs</a>
            </div>
        </div>
    </section>

    <!-- Features Section -->
    <section id="features" class="features">
        <div class="container">
            <h2 class="section-title">Tout ce dont vous avez besoin</h2>
            <p class="section-subtitle">
                Une suite complète d'outils pour gérer votre activité en toute simplicité
            </p>

            <div class="features-grid">
                <div class="feature-card">
                    <div class="feature-icon">⏱️</div>
                    <h3>Gestion du Temps</h3>
                    <p>Timer en temps réel, suivi multi-projets, mode offline et synchronisation automatique.</p>
                </div>

                <div class="feature-card">
                    <div class="feature-icon">📄</div>
                    <h3>Facturation Intelligente</h3>
                    <p>Création de devis et factures conformes NF525, signature électronique et suivi des paiements.</p>
                </div>

                <div class="feature-card">
                    <div class="feature-icon">📊</div>
                    <h3>Analytics Avancés</h3>
                    <p>Dashboards personnalisables, rapports détaillés et export FEC pour votre comptable.</p>
                </div>

                <div class="feature-card">
                    <div class="feature-icon">🏗️</div>
                    <h3>Gestion de Projets</h3>
                    <p>Vue Kanban et Gantt, templates réutilisables et collaboration en équipe.</p>
                </div>

                <div class="feature-card">
                    <div class="feature-icon">📱</div>
                    <h3>Multi-plateforme</h3>
                    <p>Application web progressive (PWA), notifications push et mode hors ligne.</p>
                </div>

                <div class="feature-card">
                    <div class="feature-icon">🔒</div>
                    <h3>Sécurité Maximale</h3>
                    <p>Cryptage des données, sauvegardes automatiques et conformité RGPD garantie.</p>
                </div>
            </div>
        </div>
    </section>

    <!-- Compliance Section -->
    <section id="compliance" class="compliance">
        <div class="container">
            <h2 class="section-title">100% Conforme aux normes françaises</h2>
            <p class="section-subtitle">
                Nous respectons toutes les réglementations en vigueur pour vous garantir une tranquillité d'esprit totale
            </p>

            <div class="compliance-badges">
                <div class="badge">
                    <span class="badge-icon">✓</span>
                    NF525
                </div>
                <div class="badge">
                    <span class="badge-icon">✓</span>
                    Chorus Pro
                </div>
                <div class="badge">
                    <span class="badge-icon">✓</span>
                    FacturX
                </div>
                <div class="badge">
                    <span class="badge-icon">✓</span>
                    RGPD
                </div>
                <div class="badge">
                    <span class="badge-icon">✓</span>
                    Export FEC
                </div>
            </div>
        </div>
    </section>

    <!-- CTA Section -->
    <section class="cta">
        <div class="container">
            <h2>Prêt à transformer votre gestion ?</h2>
            <p>Rejoignez des centaines de professionnels qui font confiance à Time Is Money</p>
            <div class="hero-buttons">
                <a href="#" class="btn btn-white">Démarrer maintenant</a>
                <a href="#demo" class="btn btn-outline">Version démo</a>
            </div>
        </div>
    </section>

    <!-- Footer -->
    <footer class="footer">
        <div class="container">
            <div class="footer-content">
                <div>
                    <h4>Time Is Money</h4>
                    <p style="color: #cbd5e0; margin-top: 0.5rem;">
                        Solution professionnelle de gestion du temps et de facturation.
                    </p>
                </div>

                <div>
                    <h4>Produit</h4>
                    <ul>
                        <li><a href="#features">Fonctionnalités</a></li>
                        <li><a href="{{ route('pricing') }}">Tarifs</a></li>
                        <li><a href="#demo">Version communautaire</a></li>
                        <li><a href="#documentation">Documentation</a></li>
                    </ul>
                </div>

                <div>
                    <h4>Entreprise</h4>
                    <ul>
                        <li><a href="#about">À propos</a></li>
                        <li><a href="#contact">Contact</a></li>
                        <li><a href="#support">Support</a></li>
                        <li><a href="#blog">Blog</a></li>
                    </ul>
                </div>

                <div>
                    <h4>Légal</h4>
                    <ul>
                        <li><a href="#privacy">Politique de confidentialité</a></li>
                        <li><a href="#terms">Conditions d'utilisation</a></li>
                        <li><a href="#security">Sécurité</a></li>
                    </ul>
                </div>
            </div>

            <div class="footer-bottom">
                <p>&copy; {{ date('Y') }} Time Is Money. Tous droits réservés. | Made with ❤️ in France</p>
            </div>
        </div>
    </footer>
</body>
</html>
