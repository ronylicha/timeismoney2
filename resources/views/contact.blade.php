<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Contact - {{ config('app.name') }}</title>

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
        .content-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 3rem; max-width: 1000px; margin: 0 auto; }

        .contact-info { background: white; padding: 2rem; border-radius: 1rem; border: 1px solid #e2e8f0; }
        .contact-info h3 { font-size: 1.5rem; font-weight: 700; margin-bottom: 1.5rem; color: #2d3748; }
        .info-item { display: flex; gap: 1rem; margin-bottom: 1.5rem; align-items: flex-start; }
        .info-icon { width: 40px; height: 40px; background: #edf2f7; border-radius: 0.5rem; display: flex; align-items: center; justify-content: center; font-size: 1.25rem; flex-shrink: 0; }
        .info-content h4 { font-weight: 600; color: #2d3748; margin-bottom: 0.25rem; }
        .info-content p { color: #718096; }

        .contact-form { background: white; padding: 2.5rem; border-radius: 1rem; border: 1px solid #e2e8f0; }
        .contact-form h3 { font-size: 1.5rem; font-weight: 700; margin-bottom: 1.5rem; color: #2d3748; }
        .form-group { margin-bottom: 1.5rem; }
        .form-group label { display: block; font-weight: 600; margin-bottom: 0.5rem; color: #2d3748; }
        .form-group input, .form-group textarea, .form-group select { width: 100%; padding: 0.75rem; border: 1px solid #e2e8f0; border-radius: 0.5rem; font-family: inherit; font-size: 1rem; }
        .form-group input:focus, .form-group textarea:focus, .form-group select:focus { outline: none; border-color: #3b82f6; }
        .form-group textarea { min-height: 150px; resize: vertical; }

        .btn { display: inline-block; padding: 0.75rem 1.5rem; border-radius: 0.5rem; font-weight: 600; text-decoration: none; transition: all 0.2s; border: none; cursor: pointer; }
        .btn-primary { background: #3b82f6; color: white; width: 100%; }
        .btn-primary:hover { background: #2563eb; transform: translateY(-2px); box-shadow: 0 10px 20px rgba(59, 130, 246, 0.3); }

        .footer { background: #2d3748; color: white; padding: 2rem 0; text-align: center; }
        .footer a { color: #cbd5e0; text-decoration: none; margin: 0 1rem; }
        .footer a:hover { color: white; }

        @media (max-width: 768px) {
            .hero h1 { font-size: 2rem; }
            .content-grid { grid-template-columns: 1fr; }
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
            <h1>Contactez-nous</h1>
            <p>Notre équipe est à votre écoute pour répondre à toutes vos questions</p>
        </div>
    </section>

    <section class="content-section">
        <div class="container">
            <div class="content-grid">
                <div class="contact-info">
                    <h3>Informations de contact</h3>

                    <div class="info-item">
                        <div class="info-icon">📧</div>
                        <div class="info-content">
                            <h4>Email</h4>
                            <p>contact@timeismoney.com</p>
                            <p style="font-size: 0.875rem; margin-top: 0.25rem;">Réponse sous 24h</p>
                        </div>
                    </div>

                    <div class="info-item">
                        <div class="info-icon">📞</div>
                        <div class="info-content">
                            <h4>Téléphone</h4>
                            <p>+33 (0)1 XX XX XX XX</p>
                            <p style="font-size: 0.875rem; margin-top: 0.25rem;">Lun-Ven : 9h-18h</p>
                        </div>
                    </div>

                    <div class="info-item">
                        <div class="info-icon">💬</div>
                        <div class="info-content">
                            <h4>Support Client</h4>
                            <p>support@timeismoney.com</p>
                            <p style="font-size: 0.875rem; margin-top: 0.25rem;">Support technique</p>
                        </div>
                    </div>

                    <div class="info-item">
                        <div class="info-icon">📍</div>
                        <div class="info-content">
                            <h4>Adresse</h4>
                            <p>123 Avenue de la République</p>
                            <p>75011 Paris, France</p>
                        </div>
                    </div>

                    <div style="margin-top: 2rem; padding-top: 2rem; border-top: 1px solid #e2e8f0;">
                        <h4 style="font-weight: 600; margin-bottom: 1rem; color: #2d3748;">Besoin d'aide rapidement ?</h4>
                        <p style="color: #718096; margin-bottom: 1rem;">Consultez notre centre d'aide ou contactez le support.</p>
                        <div style="display: flex; gap: 0.5rem;">
                            <a href="{{ route('support') }}" style="display: inline-block; padding: 0.5rem 1rem; background: #edf2f7; color: #2d3748; border-radius: 0.5rem; text-decoration: none; font-size: 0.875rem; font-weight: 600;">Centre d'aide</a>
                        </div>
                    </div>
                </div>

                <div class="contact-form">
                    <h3>Envoyez-nous un message</h3>
                    <form action="#" method="POST">
                        @csrf
                        <div class="form-group">
                            <label for="name">Nom complet *</label>
                            <input type="text" id="name" name="name" required>
                        </div>

                        <div class="form-group">
                            <label for="email">Email *</label>
                            <input type="email" id="email" name="email" required>
                        </div>

                        <div class="form-group">
                            <label for="phone">Téléphone</label>
                            <input type="tel" id="phone" name="phone">
                        </div>

                        <div class="form-group">
                            <label for="subject">Sujet *</label>
                            <select id="subject" name="subject" required>
                                <option value="">Sélectionnez un sujet</option>
                                <option value="sales">Questions commerciales</option>
                                <option value="support">Support technique</option>
                                <option value="billing">Facturation</option>
                                <option value="demo">Demande de démo</option>
                                <option value="partnership">Partenariat</option>
                                <option value="other">Autre</option>
                            </select>
                        </div>

                        <div class="form-group">
                            <label for="message">Message *</label>
                            <textarea id="message" name="message" required></textarea>
                        </div>

                        <button type="submit" class="btn btn-primary">Envoyer le message</button>

                        <p style="color: #718096; font-size: 0.875rem; margin-top: 1rem;">
                            * Champs obligatoires. Vos données sont protégées et ne seront jamais partagées.
                        </p>
                    </form>
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
