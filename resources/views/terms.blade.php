<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Conditions Générales d'Utilisation - {{ config('app.name') }}</title>

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

        .hero { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 3rem 0; text-align: center; }
        .hero h1 { font-size: 2.5rem; font-weight: 800; margin-bottom: 0.5rem; }
        .hero p { font-size: 1rem; opacity: 0.95; }

        .content-section { padding: 4rem 0; }
        .content-wrapper { max-width: 900px; margin: 0 auto; background: white; padding: 3rem; border-radius: 1rem; border: 1px solid #e2e8f0; }
        .content-wrapper h2 { font-size: 1.75rem; font-weight: 700; margin-top: 2.5rem; margin-bottom: 1rem; color: #2d3748; }
        .content-wrapper h2:first-child { margin-top: 0; }
        .content-wrapper h3 { font-size: 1.25rem; font-weight: 600; margin-top: 1.5rem; margin-bottom: 0.75rem; color: #2d3748; }
        .content-wrapper p { color: #4a5568; margin-bottom: 1rem; line-height: 1.8; }
        .content-wrapper ul { margin-left: 2rem; margin-bottom: 1rem; color: #4a5568; }
        .content-wrapper li { margin-bottom: 0.5rem; line-height: 1.8; }

        .update-date { background: #f7fafc; padding: 1rem; border-radius: 0.5rem; border-left: 4px solid #3b82f6; margin-bottom: 2rem; color: #4a5568; font-size: 0.95rem; }

        .footer { background: #2d3748; color: white; padding: 2rem 0; text-align: center; margin-top: 4rem; }
        .footer a { color: #cbd5e0; text-decoration: none; margin: 0 1rem; }
        .footer a:hover { color: white; }

        @media (max-width: 768px) {
            .hero h1 { font-size: 1.75rem; }
            .content-wrapper { padding: 1.5rem; }
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
            <h1>Conditions Générales d'Utilisation</h1>
            <p>Time Is Money SaaS</p>
        </div>
    </section>

    <section class="content-section">
        <div class="container">
            <div class="content-wrapper">
                <div class="update-date">
                    <strong>Dernière mise à jour :</strong> {{ date('d/m/Y') }}
                </div>

                <h2>1. Objet</h2>
                <p>
                    Les présentes Conditions Générales d'Utilisation (ci-après « CGU ») régissent l'accès et l'utilisation
                    de la plateforme Time Is Money (ci-après « le Service »), éditée par [Nom de la société] (ci-après « l'Éditeur »).
                </p>
                <p>
                    En accédant au Service, vous acceptez sans réserve les présentes CGU. Si vous n'acceptez pas ces conditions,
                    veuillez ne pas utiliser le Service.
                </p>

                <h2>2. Définitions</h2>
                <ul>
                    <li><strong>Service :</strong> La plateforme SaaS Time Is Money accessible via le site web</li>
                    <li><strong>Utilisateur :</strong> Toute personne physique ou morale utilisant le Service</li>
                    <li><strong>Client :</strong> Utilisateur ayant souscrit à un abonnement payant</li>
                    <li><strong>Compte :</strong> Espace personnel de l'Utilisateur sur le Service</li>
                </ul>

                <h2>3. Inscription et Compte</h2>
                <h3>3.1 Création de compte</h3>
                <p>
                    L'utilisation du Service nécessite la création d'un compte. L'Utilisateur s'engage à fournir des
                    informations exactes, complètes et à jour. Toute information erronée pourra entraîner la suspension
                    ou la suppression du compte.
                </p>

                <h3>3.2 Sécurité du compte</h3>
                <p>
                    L'Utilisateur est responsable de la confidentialité de ses identifiants de connexion. Il s'engage à
                    ne pas les divulguer et à informer immédiatement l'Éditeur en cas d'utilisation non autorisée de son compte.
                </p>

                <h2>4. Services Proposés</h2>
                <p>
                    Time Is Money propose les services suivants :
                </p>
                <ul>
                    <li>Gestion du temps et suivi de projets</li>
                    <li>Création et gestion de devis et factures conformes NF525</li>
                    <li>Intégration Chorus Pro pour la facturation publique</li>
                    <li>Export FEC et rapports analytiques</li>
                    <li>Gestion d'équipe et collaboration</li>
                </ul>

                <h2>5. Abonnements et Tarification</h2>
                <h3>5.1 Offres</h3>
                <p>
                    Les différentes offres et leurs tarifs sont détaillés sur la page de tarification. L'Éditeur se réserve
                    le droit de modifier ses tarifs à tout moment, avec un préavis de 30 jours pour les abonnements en cours.
                </p>

                <h3>5.2 Paiement</h3>
                <p>
                    Les abonnements sont payables mensuellement ou annuellement par carte bancaire. Le paiement est effectué
                    à l'avance pour la période d'abonnement choisie.
                </p>

                <h3>5.3 Résiliation</h3>
                <p>
                    L'Utilisateur peut résilier son abonnement à tout moment depuis son espace client. La résiliation prend
                    effet à la fin de la période d'abonnement en cours. Aucun remboursement ne sera effectué pour la période
                    déjà payée.
                </p>

                <h2>6. Utilisation du Service</h2>
                <h3>6.1 Utilisation conforme</h3>
                <p>
                    L'Utilisateur s'engage à utiliser le Service de manière conforme aux présentes CGU et à la législation
                    en vigueur. Sont notamment interdits :
                </p>
                <ul>
                    <li>L'utilisation du Service à des fins illégales</li>
                    <li>La tentative d'accès non autorisé aux systèmes</li>
                    <li>La diffusion de contenus illicites ou offensants</li>
                    <li>L'utilisation abusive des ressources du Service</li>
                </ul>

                <h3>6.2 Disponibilité</h3>
                <p>
                    L'Éditeur s'efforce d'assurer une disponibilité du Service de 99,9%. Des interruptions peuvent survenir
                    pour maintenance, mises à jour ou incidents techniques. L'Éditeur ne saurait être tenu responsable des
                    interruptions indépendantes de sa volonté.
                </p>

                <h2>7. Données Personnelles</h2>
                <p>
                    Le traitement des données personnelles est régi par notre Politique de Confidentialité. L'Utilisateur
                    dispose d'un droit d'accès, de rectification, de suppression et de portabilité de ses données conformément
                    au RGPD.
                </p>

                <h2>8. Propriété Intellectuelle</h2>
                <p>
                    Tous les éléments du Service (logiciel, design, contenu, marques) sont la propriété exclusive de l'Éditeur
                    ou de ses partenaires. Toute reproduction, représentation ou exploitation non autorisée est interdite.
                </p>

                <h2>9. Responsabilité</h2>
                <h3>9.1 Responsabilité de l'Éditeur</h3>
                <p>
                    L'Éditeur met en œuvre tous les moyens nécessaires pour assurer la qualité et la sécurité du Service.
                    Sa responsabilité ne pourra être engagée qu'en cas de faute prouvée. Elle est limitée aux dommages directs.
                </p>

                <h3>9.2 Responsabilité de l'Utilisateur</h3>
                <p>
                    L'Utilisateur est seul responsable de l'utilisation qu'il fait du Service et des données qu'il y saisit.
                    Il garantit l'Éditeur contre toute réclamation de tiers liée à son utilisation du Service.
                </p>

                <h2>10. Modifications des CGU</h2>
                <p>
                    L'Éditeur se réserve le droit de modifier les présentes CGU à tout moment. Les Utilisateurs seront
                    informés des modifications par email et/ou notification dans le Service. La poursuite de l'utilisation
                    du Service après modification vaut acceptation des nouvelles conditions.
                </p>

                <h2>11. Loi Applicable et Juridiction</h2>
                <p>
                    Les présentes CGU sont régies par le droit français. En cas de litige, et à défaut de résolution
                    amiable, les tribunaux français seront seuls compétents.
                </p>

                <h2>12. Contact</h2>
                <p>
                    Pour toute question concernant ces CGU, vous pouvez nous contacter :
                </p>
                <ul>
                    <li>Email : legal@timeismoney.com</li>
                    <li>Adresse : 123 Avenue de la République, 75011 Paris</li>
                </ul>
            </div>
        </div>
    </section>

    <footer class="footer">
        <div class="container">
            <p>
                <a href="/">Accueil</a>
                <a href="{{ route('privacy') }}">Confidentialité</a>
                <a href="{{ route('contact') }}">Contact</a>
            </p>
            <p style="margin-top: 1rem; color: #cbd5e0;">
                &copy; {{ date('Y') }} Time Is Money. Tous droits réservés.
            </p>
        </div>
    </footer>
</body>
</html>
