<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Centre d'aide - {{ config('app.name') }}</title>

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

        .search-section { background: white; padding: 2rem 0; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); }
        .search-box { max-width: 600px; margin: 0 auto; position: relative; }
        .search-box input { width: 100%; padding: 1rem 3rem 1rem 1.5rem; border: 2px solid #e2e8f0; border-radius: 0.75rem; font-size: 1.125rem; }
        .search-box input:focus { outline: none; border-color: #3b82f6; }
        .search-icon { position: absolute; right: 1.5rem; top: 50%; transform: translateY(-50%); font-size: 1.5rem; color: #718096; }

        .content-section { padding: 4rem 0; }
        .categories-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; margin-bottom: 4rem; }
        .category-card { background: white; padding: 2rem; border-radius: 1rem; border: 1px solid #e2e8f0; transition: all 0.3s; cursor: pointer; }
        .category-card:hover { transform: translateY(-5px); box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1); border-color: #3b82f6; }
        .category-icon { width: 60px; height: 60px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 1rem; display: flex; align-items: center; justify-content: center; font-size: 1.75rem; margin-bottom: 1rem; }
        .category-card h3 { font-size: 1.25rem; font-weight: 700; margin-bottom: 0.5rem; color: #2d3748; }
        .category-card p { color: #718096; font-size: 0.95rem; }

        .faq-section { max-width: 900px; margin: 0 auto; }
        .section-title { font-size: 2rem; font-weight: 700; text-align: center; margin-bottom: 2rem; color: #2d3748; }
        .faq-item { background: white; border-radius: 0.75rem; padding: 1.5rem; margin-bottom: 1rem; border: 1px solid #e2e8f0; }
        .faq-question { font-weight: 600; color: #2d3748; margin-bottom: 0.75rem; font-size: 1.125rem; }
        .faq-answer { color: #718096; line-height: 1.7; }

        .contact-cta { background: white; padding: 3rem; border-radius: 1rem; text-align: center; border: 2px solid #3b82f6; margin-top: 3rem; }
        .contact-cta h3 { font-size: 1.75rem; font-weight: 700; margin-bottom: 1rem; color: #2d3748; }
        .contact-cta p { color: #718096; margin-bottom: 1.5rem; }
        .btn { display: inline-block; padding: 0.75rem 1.5rem; border-radius: 0.5rem; font-weight: 600; text-decoration: none; transition: all 0.2s; }
        .btn-primary { background: #3b82f6; color: white; }
        .btn-primary:hover { background: #2563eb; transform: translateY(-2px); box-shadow: 0 10px 20px rgba(59, 130, 246, 0.3); }

        .footer { background: #2d3748; color: white; padding: 2rem 0; text-align: center; margin-top: 4rem; }
        .footer a { color: #cbd5e0; text-decoration: none; margin: 0 1rem; }
        .footer a:hover { color: white; }

        @media (max-width: 768px) {
            .hero h1 { font-size: 2rem; }
            .categories-grid { grid-template-columns: 1fr; }
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
            <h1>Centre d'aide</h1>
            <p>Trouvez rapidement les réponses à vos questions</p>
        </div>
    </section>

    <section class="search-section">
        <div class="container">
            <div class="search-box">
                <input type="text" placeholder="Rechercher dans l'aide...">
                <span class="search-icon">🔍</span>
            </div>
        </div>
    </section>

    <section class="content-section">
        <div class="container">
            <div class="categories-grid">
                <div class="category-card">
                    <div class="category-icon">🚀</div>
                    <h3>Démarrage</h3>
                    <p>Guide de démarrage rapide et configuration initiale</p>
                </div>

                <div class="category-card">
                    <div class="category-icon">⏱️</div>
                    <h3>Gestion du temps</h3>
                    <p>Timer, feuilles de temps et suivi de projets</p>
                </div>

                <div class="category-card">
                    <div class="category-icon">📄</div>
                    <h3>Facturation</h3>
                    <p>Créer et gérer vos devis et factures</p>
                </div>

                <div class="category-card">
                    <div class="category-icon">👥</div>
                    <h3>Gestion d'équipe</h3>
                    <p>Inviter des membres et gérer les permissions</p>
                </div>

                <div class="category-card">
                    <div class="category-icon">📊</div>
                    <h3>Rapports</h3>
                    <p>Analytics, tableaux de bord et exports</p>
                </div>

                <div class="category-card">
                    <div class="category-icon">⚙️</div>
                    <h3>Paramètres</h3>
                    <p>Configuration et personnalisation</p>
                </div>
            </div>

            <div class="faq-section">
                <h2 class="section-title">Questions Fréquentes</h2>

                <div class="faq-item">
                    <div class="faq-question">Comment démarrer avec Time Is Money ?</div>
                    <div class="faq-answer">
                        Après votre inscription, commencez par configurer votre profil d'entreprise dans les paramètres.
                        Ensuite, créez votre premier projet et invitez les membres de votre équipe. Vous pourrez alors
                        commencer à suivre votre temps et créer vos premières factures.
                    </div>
                </div>

                <div class="faq-item">
                    <div class="faq-question">Comment créer ma première facture ?</div>
                    <div class="faq-answer">
                        Allez dans la section "Facturation" > "Nouvelle facture". Sélectionnez un client, ajoutez vos
                        lignes de facturation (vous pouvez importer des entrées de temps), définissez les conditions de
                        paiement et validez. La facture sera automatiquement conforme NF525.
                    </div>
                </div>

                <div class="faq-item">
                    <div class="faq-question">Comment inviter des membres à mon équipe ?</div>
                    <div class="faq-answer">
                        Dans "Paramètres" > "Équipe", cliquez sur "Inviter un membre". Entrez l'email de la personne,
                        choisissez son rôle (Admin, Manager, ou Membre) et envoyez l'invitation. Elle recevra un email
                        pour créer son compte.
                    </div>
                </div>

                <div class="faq-item">
                    <div class="faq-question">Est-ce que mes données sont sécurisées ?</div>
                    <div class="faq-answer">
                        Absolument. Nous utilisons un cryptage AES-256, nos serveurs sont hébergés en France, et nous
                        sommes conformes RGPD. Vos données sont sauvegardées quotidiennement et vous pouvez les exporter
                        à tout moment.
                    </div>
                </div>

                <div class="faq-item">
                    <div class="faq-question">Comment exporter mes données comptables ?</div>
                    <div class="faq-answer">
                        Allez dans "Conformité" > "Export FEC". Sélectionnez la période souhaitée et cliquez sur
                        "Générer l'export". Le fichier FEC généré est directement utilisable par votre expert-comptable
                        ou votre logiciel de comptabilité.
                    </div>
                </div>

                <div class="faq-item">
                    <div class="faq-question">Puis-je utiliser l'application hors ligne ?</div>
                    <div class="faq-answer">
                        Oui ! Time Is Money est une Progressive Web App (PWA). Installez-la sur votre appareil et
                        continuez à travailler même sans connexion internet. Vos données seront synchronisées
                        automatiquement dès que vous serez de nouveau en ligne.
                    </div>
                </div>

                <div class="faq-item">
                    <div class="faq-question">Comment fonctionne la facturation Chorus Pro ?</div>
                    <div class="faq-answer">
                        Si vous facturez une entité publique, activez l'option "Chorus Pro" lors de la création de votre
                        facture. Elle sera automatiquement transmise via notre intégration Chorus Pro. Vous recevrez une
                        confirmation une fois la facture déposée.
                    </div>
                </div>

                <div class="faq-item">
                    <div class="faq-question">Comment annuler ou modifier mon abonnement ?</div>
                    <div class="faq-answer">
                        Vous pouvez gérer votre abonnement à tout moment dans "Paramètres" > "Abonnement".
                        Vous pouvez changer de plan, ajouter des utilisateurs ou annuler. Aucun engagement,
                        vous pouvez résilier quand vous voulez.
                    </div>
                </div>
            </div>

            <div class="contact-cta">
                <h3>Vous ne trouvez pas de réponse ?</h3>
                <p>Notre équipe support est là pour vous aider</p>
                <a href="{{ route('contact') }}" class="btn btn-primary">Contactez le support</a>
            </div>
        </div>
    </section>

    <footer class="footer">
        <div class="container">
            <p>
                <a href="/">Accueil</a>
                <a href="{{ route('pricing') }}">Tarifs</a>
                <a href="{{ route('contact') }}">Contact</a>
                <a href="{{ route('about') }}">À propos</a>
            </p>
            <p style="margin-top: 1rem; color: #cbd5e0;">
                &copy; {{ date('Y') }} Time Is Money. Tous droits réservés.
            </p>
        </div>
    </footer>
</body>
</html>
