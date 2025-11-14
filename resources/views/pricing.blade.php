<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Tarifs - {{ config('app.name') }}</title>
    <meta name="description" content="Découvrez nos offres adaptées à vos besoins : version communautaire gratuite ou plans SaaS professionnels avec support prioritaire.">

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
            background: #f7fafc;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 1.5rem;
        }

        /* Navigation */
        .navbar {
            background: white;
            border-bottom: 1px solid #e2e8f0;
            padding: 1rem 0;
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
            text-align: center;
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

        /* Hero */
        .hero {
            background: white;
            padding: 4rem 0;
            text-align: center;
            border-bottom: 1px solid #e2e8f0;
        }

        .hero h1 {
            font-size: 3rem;
            font-weight: 800;
            margin-bottom: 1rem;
            color: #2d3748;
        }

        .hero p {
            font-size: 1.25rem;
            color: #718096;
            max-width: 700px;
            margin: 0 auto;
        }

        /* Pricing Section */
        .pricing-section {
            padding: 5rem 0;
        }

        .pricing-toggle {
            display: flex;
            justify-content: center;
            margin-bottom: 3rem;
            gap: 0.5rem;
            background: white;
            padding: 0.5rem;
            border-radius: 0.75rem;
            width: fit-content;
            margin-left: auto;
            margin-right: auto;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .toggle-btn {
            padding: 0.75rem 2rem;
            border: none;
            background: transparent;
            border-radius: 0.5rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            color: #718096;
        }

        .toggle-btn.active {
            background: #3b82f6;
            color: white;
        }

        .pricing-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
            gap: 2rem;
            max-width: 1100px;
            margin: 0 auto;
        }

        .pricing-card {
            background: white;
            border-radius: 1rem;
            padding: 2.5rem;
            border: 2px solid #e2e8f0;
            transition: all 0.3s;
            position: relative;
        }

        .pricing-card:hover {
            transform: translateY(-10px);
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
            border-color: #3b82f6;
        }

        .pricing-card.popular {
            border-color: #3b82f6;
            box-shadow: 0 20px 40px rgba(59, 130, 246, 0.2);
        }

        .popular-badge {
            position: absolute;
            top: -15px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 0.5rem 1.5rem;
            border-radius: 2rem;
            font-size: 0.875rem;
            font-weight: 700;
        }

        .plan-name {
            font-size: 1.5rem;
            font-weight: 700;
            margin-bottom: 0.5rem;
            color: #2d3748;
        }

        .plan-description {
            color: #718096;
            margin-bottom: 1.5rem;
            min-height: 3rem;
        }

        .price {
            display: flex;
            align-items: baseline;
            gap: 0.5rem;
            margin-bottom: 2rem;
        }

        .price-amount {
            font-size: 3rem;
            font-weight: 800;
            color: #2d3748;
        }

        .price-currency {
            font-size: 1.5rem;
            color: #718096;
        }

        .price-period {
            color: #718096;
        }

        .features-list {
            list-style: none;
            margin-bottom: 2rem;
        }

        .features-list li {
            padding: 0.75rem 0;
            display: flex;
            align-items: flex-start;
            gap: 0.75rem;
            color: #4a5568;
        }

        .feature-icon {
            color: #48bb78;
            font-size: 1.25rem;
            flex-shrink: 0;
        }

        .feature-icon.disabled {
            color: #cbd5e0;
        }

        /* Community Section */
        .community-section {
            background: white;
            padding: 5rem 0;
            border-top: 1px solid #e2e8f0;
        }

        .community-content {
            max-width: 900px;
            margin: 0 auto;
            text-align: center;
        }

        .community-title {
            font-size: 2.5rem;
            font-weight: 700;
            margin-bottom: 1rem;
            color: #2d3748;
        }

        .community-description {
            font-size: 1.125rem;
            color: #718096;
            margin-bottom: 2rem;
        }

        .community-features {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 2rem;
            text-align: left;
            margin: 3rem 0;
        }

        .community-feature {
            display: flex;
            gap: 1rem;
        }

        .community-feature-icon {
            width: 40px;
            height: 40px;
            background: #edf2f7;
            border-radius: 0.5rem;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.25rem;
            flex-shrink: 0;
        }

        .community-feature h3 {
            font-size: 1.125rem;
            font-weight: 600;
            margin-bottom: 0.5rem;
            color: #2d3748;
        }

        .community-feature p {
            color: #718096;
            font-size: 0.95rem;
        }

        .tech-requirements {
            background: #f7fafc;
            border-radius: 1rem;
            padding: 2rem;
            margin: 2rem 0;
            border: 1px solid #e2e8f0;
        }

        .tech-requirements h4 {
            font-size: 1.125rem;
            font-weight: 600;
            margin-bottom: 1rem;
            color: #2d3748;
        }

        .tech-requirements ul {
            list-style: none;
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 0.75rem;
        }

        .tech-requirements li {
            color: #4a5568;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        /* FAQ */
        .faq-section {
            padding: 5rem 0;
        }

        .faq-title {
            font-size: 2.5rem;
            font-weight: 700;
            text-align: center;
            margin-bottom: 3rem;
            color: #2d3748;
        }

        .faq-list {
            max-width: 800px;
            margin: 0 auto;
        }

        .faq-item {
            background: white;
            border-radius: 0.75rem;
            padding: 1.5rem;
            margin-bottom: 1rem;
            border: 1px solid #e2e8f0;
        }

        .faq-question {
            font-weight: 600;
            color: #2d3748;
            margin-bottom: 0.5rem;
        }

        .faq-answer {
            color: #718096;
        }

        /* Footer */
        .footer {
            background: #2d3748;
            color: white;
            padding: 2rem 0;
            text-align: center;
        }

        .footer a {
            color: #cbd5e0;
            text-decoration: none;
            margin: 0 1rem;
        }

        .footer a:hover {
            color: white;
        }

        @media (max-width: 768px) {
            .hero h1 {
                font-size: 2rem;
            }

            .pricing-grid {
                grid-template-columns: 1fr;
            }

            .nav-links {
                display: none;
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
                    <li><a href="/#features">Fonctionnalités</a></li>
                    <li><a href="{{ route('pricing') }}">Tarifs</a></li>
                    @if (Route::has('login'))
                        @auth
                            <li><a href="{{ url('/dashboard') }}" class="btn btn-primary">Dashboard</a></li>
                        @else
                            <li><a href="{{ route('login') }}">Connexion</a></li>
                        @endauth
                    @endif
                </ul>
            </div>
        </div>
    </nav>

    <!-- Hero -->
    <section class="hero">
        <div class="container">
            <h1>Tarification Simple et Transparente</h1>
            <p>Choisissez l'offre qui correspond à vos besoins. Pas de frais cachés, pas d'engagement.</p>
        </div>
    </section>

    <!-- Pricing Section -->
    <section class="pricing-section">
        <div class="container">
            <div class="pricing-grid">
                <!-- Starter Plan -->
                <div class="pricing-card">
                    <div class="plan-name">Starter</div>
                    <div class="plan-description">Idéal pour les freelances et petites équipes</div>
                    <div class="price">
                        <span class="price-amount">29</span>
                        <span class="price-currency">€</span>
                        <span class="price-period">/ mois</span>
                    </div>
                    <ul class="features-list">
                        <li>
                            <span class="feature-icon">✓</span>
                            <span>1 utilisateur</span>
                        </li>
                        <li>
                            <span class="feature-icon">✓</span>
                            <span>5 projets actifs</span>
                        </li>
                        <li>
                            <span class="feature-icon">✓</span>
                            <span>Facturation conforme NF525</span>
                        </li>
                        <li>
                            <span class="feature-icon">✓</span>
                            <span>Gestion du temps</span>
                        </li>
                        <li>
                            <span class="feature-icon">✓</span>
                            <span>Rapports basiques</span>
                        </li>
                        <li>
                            <span class="feature-icon">✓</span>
                            <span>Support email</span>
                        </li>
                        <li>
                            <span class="feature-icon disabled">✗</span>
                            <span style="color: #cbd5e0;">Chorus Pro</span>
                        </li>
                        <li>
                            <span class="feature-icon disabled">✗</span>
                            <span style="color: #cbd5e0;">API Access</span>
                        </li>
                    </ul>
                    <a href="#" class="btn btn-outline" style="width: 100%;">Commencer</a>
                </div>

                <!-- Professional Plan (Popular) -->
                <div class="pricing-card popular">
                    <div class="popular-badge">🔥 Populaire</div>
                    <div class="plan-name">Professional</div>
                    <div class="plan-description">Pour les entreprises en croissance</div>
                    <div class="price">
                        <span class="price-amount">79</span>
                        <span class="price-currency">€</span>
                        <span class="price-period">/ mois</span>
                    </div>
                    <ul class="features-list">
                        <li>
                            <span class="feature-icon">✓</span>
                            <span>Jusqu'à 10 utilisateurs</span>
                        </li>
                        <li>
                            <span class="feature-icon">✓</span>
                            <span>Projets illimités</span>
                        </li>
                        <li>
                            <span class="feature-icon">✓</span>
                            <span>Toutes les fonctionnalités Starter</span>
                        </li>
                        <li>
                            <span class="feature-icon">✓</span>
                            <span>Chorus Pro intégré</span>
                        </li>
                        <li>
                            <span class="feature-icon">✓</span>
                            <span>Analytics avancés</span>
                        </li>
                        <li>
                            <span class="feature-icon">✓</span>
                            <span>Export FEC automatique</span>
                        </li>
                        <li>
                            <span class="feature-icon">✓</span>
                            <span>Support prioritaire</span>
                        </li>
                        <li>
                            <span class="feature-icon">✓</span>
                            <span>API Access</span>
                        </li>
                    </ul>
                    <a href="#" class="btn btn-primary" style="width: 100%;">Commencer</a>
                </div>

                <!-- Enterprise Plan -->
                <div class="pricing-card">
                    <div class="plan-name">Enterprise</div>
                    <div class="plan-description">Solution sur-mesure pour grandes entreprises</div>
                    <div class="price">
                        <span class="price-amount">Sur devis</span>
                    </div>
                    <ul class="features-list">
                        <li>
                            <span class="feature-icon">✓</span>
                            <span>Utilisateurs illimités</span>
                        </li>
                        <li>
                            <span class="feature-icon">✓</span>
                            <span>Toutes les fonctionnalités Pro</span>
                        </li>
                        <li>
                            <span class="feature-icon">✓</span>
                            <span>Déploiement on-premise possible</span>
                        </li>
                        <li>
                            <span class="feature-icon">✓</span>
                            <span>Support 24/7 dédié</span>
                        </li>
                        <li>
                            <span class="feature-icon">✓</span>
                            <span>Formation personnalisée</span>
                        </li>
                        <li>
                            <span class="feature-icon">✓</span>
                            <span>SLA garanti</span>
                        </li>
                        <li>
                            <span class="feature-icon">✓</span>
                            <span>Personnalisation avancée</span>
                        </li>
                        <li>
                            <span class="feature-icon">✓</span>
                            <span>Intégrations sur-mesure</span>
                        </li>
                    </ul>
                    <a href="#contact" class="btn btn-outline" style="width: 100%;">Nous contacter</a>
                </div>
            </div>
        </div>
    </section>

    <!-- Community Section -->
    <section class="community-section">
        <div class="container">
            <div class="community-content">
                <h2 class="community-title">Version Communautaire</h2>
                <p class="community-description">
                    Pour les développeurs et équipes techniques qui souhaitent auto-héberger la solution,
                    nous proposons une version communautaire avec toutes les fonctionnalités de base.
                </p>

                <div class="community-features">
                    <div class="community-feature">
                        <div class="community-feature-icon">🔧</div>
                        <div>
                            <h3>Auto-hébergement</h3>
                            <p>Installez et gérez votre propre instance</p>
                        </div>
                    </div>
                    <div class="community-feature">
                        <div class="community-feature-icon">💻</div>
                        <div>
                            <h3>Code source</h3>
                            <p>Accédez au code source complet</p>
                        </div>
                    </div>
                    <div class="community-feature">
                        <div class="community-feature-icon">🛠️</div>
                        <div>
                            <h3>Personnalisable</h3>
                            <p>Adaptez la solution à vos besoins</p>
                        </div>
                    </div>
                    <div class="community-feature">
                        <div class="community-feature-icon">👥</div>
                        <div>
                            <h3>Communauté</h3>
                            <p>Support via forums et documentation</p>
                        </div>
                    </div>
                </div>

                <div class="tech-requirements">
                    <h4>Prérequis techniques pour l'auto-hébergement :</h4>
                    <ul>
                        <li><span class="feature-icon">✓</span> PHP 8.3+</li>
                        <li><span class="feature-icon">✓</span> MySQL/MariaDB ou SQLite</li>
                        <li><span class="feature-icon">✓</span> Node.js 18+</li>
                        <li><span class="feature-icon">✓</span> Composer & NPM</li>
                        <li><span class="feature-icon">✓</span> Serveur Linux/Windows</li>
                        <li><span class="feature-icon">✓</span> Compétences Laravel</li>
                    </ul>
                </div>

                <div style="display: flex; gap: 1rem; justify-content: center; margin-top: 2rem;">
                    <a href="#demo" class="btn btn-primary">Accéder à la démo</a>
                    <a href="#documentation" class="btn btn-outline">Documentation technique</a>
                </div>

                <p style="color: #718096; font-size: 0.95rem; margin-top: 1.5rem;">
                    ℹ️ La version communautaire ne comprend pas le support premium, les mises à jour automatiques
                    et certaines fonctionnalités avancées (intégrations tierces, analytics avancés).
                </p>
            </div>
        </div>
    </section>

    <!-- FAQ Section -->
    <section class="faq-section">
        <div class="container">
            <h2 class="faq-title">Questions Fréquentes</h2>
            <div class="faq-list">
                <div class="faq-item">
                    <div class="faq-question">Puis-je changer de plan à tout moment ?</div>
                    <div class="faq-answer">Oui, vous pouvez passer à un plan supérieur ou inférieur à tout moment. Les changements sont appliqués immédiatement et facturés au prorata.</div>
                </div>
                <div class="faq-item">
                    <div class="faq-question">Y a-t-il une période d'essai gratuite ?</div>
                    <div class="faq-answer">Oui, tous nos plans SaaS incluent 14 jours d'essai gratuit sans engagement ni carte bancaire requise.</div>
                </div>
                <div class="faq-item">
                    <div class="faq-question">Quelle est la différence entre la version SaaS et communautaire ?</div>
                    <div class="faq-answer">La version SaaS est hébergée et maintenue par nous avec support inclus. La version communautaire nécessite de l'auto-héberger et ne comprend pas le support premium.</div>
                </div>
                <div class="faq-item">
                    <div class="faq-question">Les données sont-elles sécurisées ?</div>
                    <div class="faq-answer">Absolument. Nous utilisons un cryptage de niveau bancaire, des sauvegardes quotidiennes et sommes conformes RGPD. Vos données sont hébergées en France.</div>
                </div>
                <div class="faq-item">
                    <div class="faq-question">Puis-je exporter mes données ?</div>
                    <div class="faq-answer">Oui, vous pouvez exporter toutes vos données à tout moment aux formats CSV, Excel et FEC pour la comptabilité.</div>
                </div>
            </div>
        </div>
    </section>

    <!-- Footer -->
    <footer class="footer">
        <div class="container">
            <p>
                <a href="/">Accueil</a>
                <a href="/#features">Fonctionnalités</a>
                <a href="#contact">Contact</a>
                <a href="#support">Support</a>
            </p>
            <p style="margin-top: 1rem; color: #cbd5e0;">
                &copy; {{ date('Y') }} Time Is Money. Tous droits réservés.
            </p>
        </div>
    </footer>
</body>
</html>
