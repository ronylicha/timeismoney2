<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Politique de Confidentialité - {{ config('app.name') }}</title>

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

        .highlight-box { background: #edf2f7; padding: 1.5rem; border-radius: 0.75rem; border-left: 4px solid #48bb78; margin: 1.5rem 0; }
        .highlight-box h4 { color: #2d3748; font-weight: 600; margin-bottom: 0.5rem; }
        .highlight-box p { color: #4a5568; margin-bottom: 0; }

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
            <h1>Politique de Confidentialité</h1>
            <p>Protection de vos données personnelles - RGPD</p>
        </div>
    </section>

    <section class="content-section">
        <div class="container">
            <div class="content-wrapper">
                <div class="update-date">
                    <strong>Dernière mise à jour :</strong> {{ date('d/m/Y') }}
                </div>

                <div class="highlight-box">
                    <h4>🔒 Votre vie privée est importante</h4>
                    <p>
                        Nous nous engageons à protéger vos données personnelles et à respecter le Règlement Général
                        sur la Protection des Données (RGPD). Cette politique explique comment nous collectons,
                        utilisons et protégeons vos informations.
                    </p>
                </div>

                <h2>1. Responsable du Traitement</h2>
                <p>
                    Le responsable du traitement des données personnelles est :
                </p>
                <ul>
                    <li><strong>Raison sociale :</strong> [Nom de la société]</li>
                    <li><strong>Adresse :</strong> 123 Avenue de la République, 75011 Paris, France</li>
                    <li><strong>Email :</strong> privacy@timeismoney.com</li>
                    <li><strong>Délégué à la Protection des Données :</strong> dpo@timeismoney.com</li>
                </ul>

                <h2>2. Données Collectées</h2>
                <h3>2.1 Données d'identification</h3>
                <p>Lors de la création de votre compte, nous collectons :</p>
                <ul>
                    <li>Nom et prénom</li>
                    <li>Adresse email</li>
                    <li>Numéro de téléphone (optionnel)</li>
                    <li>Raison sociale et informations d'entreprise</li>
                </ul>

                <h3>2.2 Données d'utilisation</h3>
                <p>Lors de l'utilisation du service, nous collectons :</p>
                <ul>
                    <li>Données de navigation (pages visitées, durée de session)</li>
                    <li>Adresse IP et données de connexion</li>
                    <li>Type de navigateur et système d'exploitation</li>
                    <li>Données saisies dans l'application (projets, temps, factures, etc.)</li>
                </ul>

                <h3>2.3 Données de facturation</h3>
                <p>Si vous souscrivez à un abonnement payant :</p>
                <ul>
                    <li>Informations de paiement (via notre prestataire sécurisé)</li>
                    <li>Adresse de facturation</li>
                    <li>Historique des transactions</li>
                </ul>

                <h2>3. Finalités du Traitement</h2>
                <p>Vos données sont utilisées pour :</p>
                <ul>
                    <li><strong>Fourniture du service :</strong> Créer et gérer votre compte, assurer le fonctionnement de l'application</li>
                    <li><strong>Facturation :</strong> Traiter vos paiements et générer vos factures</li>
                    <li><strong>Support client :</strong> Répondre à vos questions et résoudre les problèmes techniques</li>
                    <li><strong>Amélioration du service :</strong> Analyser l'utilisation pour optimiser l'application</li>
                    <li><strong>Communication :</strong> Vous informer des mises à jour et nouvelles fonctionnalités</li>
                    <li><strong>Conformité légale :</strong> Respecter nos obligations légales et réglementaires</li>
                </ul>

                <h2>4. Base Légale du Traitement</h2>
                <p>Le traitement de vos données repose sur :</p>
                <ul>
                    <li><strong>L'exécution du contrat :</strong> Pour fournir le service souscrit</li>
                    <li><strong>Votre consentement :</strong> Pour les communications marketing (révocable à tout moment)</li>
                    <li><strong>L'intérêt légitime :</strong> Pour améliorer le service et assurer la sécurité</li>
                    <li><strong>Les obligations légales :</strong> Pour la comptabilité et la conformité fiscale</li>
                </ul>

                <h2>5. Destinataires des Données</h2>
                <p>Vos données peuvent être partagées avec :</p>
                <ul>
                    <li><strong>Notre personnel autorisé :</strong> Pour la gestion et le support</li>
                    <li><strong>Prestataires de services :</strong> Hébergement (France), paiement, support technique</li>
                    <li><strong>Autorités compétentes :</strong> Si requis par la loi</li>
                </ul>
                <p>
                    Nous ne vendons jamais vos données à des tiers. Tous nos prestataires sont soumis à des obligations
                    strictes de confidentialité et de sécurité.
                </p>

                <h2>6. Durée de Conservation</h2>
                <p>Nous conservons vos données :</p>
                <ul>
                    <li><strong>Compte actif :</strong> Pendant toute la durée de votre abonnement</li>
                    <li><strong>Après résiliation :</strong> 30 jours pour permettre une réactivation</li>
                    <li><strong>Données comptables :</strong> 10 ans conformément aux obligations légales</li>
                    <li><strong>Données de navigation :</strong> 13 mois maximum</li>
                </ul>

                <h2>7. Sécurité des Données</h2>
                <p>Nous mettons en œuvre des mesures techniques et organisationnelles pour protéger vos données :</p>
                <ul>
                    <li>Cryptage AES-256 pour le stockage</li>
                    <li>Protocole HTTPS pour les transmissions</li>
                    <li>Authentification forte et gestion des accès</li>
                    <li>Sauvegardes quotidiennes automatiques</li>
                    <li>Surveillance et détection des incidents</li>
                    <li>Hébergement en France dans des datacenters certifiés ISO 27001</li>
                </ul>

                <h2>8. Vos Droits</h2>
                <p>Conformément au RGPD, vous disposez des droits suivants :</p>

                <h3>8.1 Droit d'accès</h3>
                <p>Vous pouvez demander une copie de toutes les données personnelles vous concernant.</p>

                <h3>8.2 Droit de rectification</h3>
                <p>Vous pouvez modifier vos données inexactes ou incomplètes depuis votre compte.</p>

                <h3>8.3 Droit à l'effacement</h3>
                <p>Vous pouvez demander la suppression de vos données, sauf obligations légales de conservation.</p>

                <h3>8.4 Droit à la portabilité</h3>
                <p>Vous pouvez exporter vos données dans un format structuré et couramment utilisé.</p>

                <h3>8.5 Droit d'opposition</h3>
                <p>Vous pouvez vous opposer au traitement de vos données à des fins de marketing.</p>

                <h3>8.6 Droit à la limitation</h3>
                <p>Vous pouvez demander la limitation du traitement dans certaines situations.</p>

                <div class="highlight-box">
                    <h4>Exercer vos droits</h4>
                    <p>
                        Pour exercer vos droits, contactez-nous à privacy@timeismoney.com avec une copie de votre pièce d'identité.
                        Nous répondrons dans un délai d'un mois maximum.
                    </p>
                </div>

                <h2>9. Cookies et Traceurs</h2>
                <p>Nous utilisons des cookies pour :</p>
                <ul>
                    <li><strong>Cookies essentiels :</strong> Nécessaires au fonctionnement du service</li>
                    <li><strong>Cookies de préférences :</strong> Mémoriser vos choix (langue, thème)</li>
                    <li><strong>Cookies analytiques :</strong> Analyser l'utilisation du service (avec votre consentement)</li>
                </ul>
                <p>
                    Vous pouvez gérer vos préférences de cookies depuis votre navigateur ou notre interface de gestion.
                </p>

                <h2>10. Transferts de Données</h2>
                <p>
                    Vos données sont hébergées exclusivement en France. Aucun transfert hors de l'Union Européenne n'est effectué.
                    Si un tel transfert devenait nécessaire, nous nous assurerions que des garanties appropriées sont en place.
                </p>

                <h2>11. Mineurs</h2>
                <p>
                    Notre service n'est pas destiné aux mineurs de moins de 16 ans. Nous ne collectons pas sciemment
                    de données personnelles de mineurs sans le consentement parental.
                </p>

                <h2>12. Modifications de la Politique</h2>
                <p>
                    Nous pouvons modifier cette politique de confidentialité. Vous serez informé des changements significatifs
                    par email et/ou notification dans l'application. La version mise à jour sera datée en haut de cette page.
                </p>

                <h2>13. Réclamation</h2>
                <p>
                    Si vous estimez que vos droits ne sont pas respectés, vous pouvez introduire une réclamation auprès de la CNIL :
                </p>
                <ul>
                    <li><strong>Site web :</strong> <a href="https://www.cnil.fr" target="_blank" style="color: #3b82f6;">www.cnil.fr</a></li>
                    <li><strong>Adresse :</strong> 3 Place de Fontenoy, TSA 80715, 75334 Paris Cedex 07</li>
                </ul>

                <h2>14. Contact</h2>
                <p>Pour toute question concernant cette politique ou vos données personnelles :</p>
                <ul>
                    <li><strong>Email :</strong> privacy@timeismoney.com</li>
                    <li><strong>DPO :</strong> dpo@timeismoney.com</li>
                    <li><strong>Adresse :</strong> 123 Avenue de la République, 75011 Paris</li>
                </ul>
            </div>
        </div>
    </section>

    <footer class="footer">
        <div class="container">
            <p>
                <a href="/">Accueil</a>
                <a href="{{ route('terms') }}">CGU</a>
                <a href="{{ route('contact') }}">Contact</a>
            </p>
            <p style="margin-top: 1rem; color: #cbd5e0;">
                &copy; {{ date('Y') }} Time Is Money. Tous droits réservés.
            </p>
        </div>
    </footer>
</body>
</html>
