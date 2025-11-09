<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Alerte Seuil TVA</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background-color: #ffffff;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #e5e7eb;
        }
        .alert-icon {
            font-size: 48px;
            margin-bottom: 10px;
        }
        .alert-title {
            color: #1f2937;
            font-size: 24px;
            font-weight: bold;
            margin: 10px 0;
        }
        .alert-box {
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
        }
        .alert-danger {
            background-color: #fee2e2;
            border-left: 4px solid #dc2626;
        }
        .alert-warning {
            background-color: #fef3c7;
            border-left: 4px solid #f59e0b;
        }
        .alert-info {
            background-color: #dbeafe;
            border-left: 4px solid #3b82f6;
        }
        .progress-bar {
            width: 100%;
            height: 30px;
            background-color: #e5e7eb;
            border-radius: 15px;
            overflow: hidden;
            margin: 20px 0;
        }
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #3b82f6, #2563eb);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 14px;
        }
        .progress-fill.warning {
            background: linear-gradient(90deg, #f59e0b, #d97706);
        }
        .progress-fill.danger {
            background: linear-gradient(90deg, #dc2626, #b91c1c);
        }
        .stats-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin: 20px 0;
        }
        .stat-card {
            background-color: #f9fafb;
            padding: 15px;
            border-radius: 6px;
            border: 1px solid #e5e7eb;
        }
        .stat-label {
            font-size: 12px;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 5px;
        }
        .stat-value {
            font-size: 20px;
            font-weight: bold;
            color: #1f2937;
        }
        .action-button {
            display: inline-block;
            padding: 12px 24px;
            background-color: #3b82f6;
            color: white;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            margin: 20px 0;
        }
        .action-button:hover {
            background-color: #2563eb;
        }
        .info-section {
            background-color: #f9fafb;
            padding: 20px;
            border-radius: 6px;
            margin: 20px 0;
        }
        .info-section h3 {
            color: #1f2937;
            font-size: 16px;
            margin-top: 0;
            margin-bottom: 10px;
        }
        .info-section ul {
            margin: 10px 0;
            padding-left: 20px;
        }
        .info-section li {
            margin: 8px 0;
            color: #4b5563;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            color: #6b7280;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="alert-icon">
                @if($isExceeded)
                    🚨
                @elseif($isNearThreshold)
                    ⚠️
                @else
                    ℹ️
                @endif
            </div>
            <h1 class="alert-title">
                @if($isExceeded)
                    Seuil de franchise TVA dépassé
                @elseif($isNearThreshold)
                    Attention : Seuil TVA proche
                @else
                    Alerte Seuil TVA
                @endif
            </h1>
            <p style="color: #6b7280; margin: 5px 0;">{{ $tenantName }}</p>
        </div>

        <div class="alert-box {{ $isExceeded ? 'alert-danger' : ($isNearThreshold ? 'alert-warning' : 'alert-info') }}">
            <p style="margin: 0; font-weight: 600;">
                @if($isExceeded)
                    Votre chiffre d'affaires a dépassé le seuil de franchise en base de TVA.
                @elseif($isNearThreshold)
                    Vous approchez du seuil de franchise en base de TVA. Préparez-vous au passage en régime normal.
                @else
                    Votre chiffre d'affaires atteint {{ $percentage }}% du seuil de franchise.
                @endif
            </p>
        </div>

        <div class="progress-bar">
            <div class="progress-fill {{ $isExceeded ? 'danger' : ($isNearThreshold ? 'warning' : '') }}" 
                 style="width: {{ min($percentage, 100) }}%">
                {{ $percentage }}%
            </div>
        </div>

        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-label">CA Annuel Actuel</div>
                <div class="stat-value">{{ $yearlyRevenue }}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Seuil {{ ucfirst($thresholdType) }}</div>
                <div class="stat-value">{{ $threshold }}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Pourcentage</div>
                <div class="stat-value" style="color: {{ $isExceeded ? '#dc2626' : ($isNearThreshold ? '#f59e0b' : '#3b82f6') }}">
                    {{ $percentage }}%
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Marge Restante</div>
                <div class="stat-value" style="color: {{ $isExceeded ? '#dc2626' : '#059669' }}">
                    {{ $remaining }}
                </div>
            </div>
        </div>

        @if($isExceeded)
            <div class="info-section">
                <h3>⚠️ Actions requises</h3>
                <ul>
                    @if($autoApply)
                        <li><strong>Bascule automatique activée :</strong> La TVA à 20% sera automatiquement appliquée sur vos prochaines factures.</li>
                        <li>Vérifiez vos paramètres de facturation pour confirmer la configuration.</li>
                    @else
                        <li><strong>Action manuelle requise :</strong> Vous devez passer en régime normal de TVA.</li>
                        <li>Modifiez vos paramètres de facturation pour appliquer la TVA à 20%.</li>
                    @endif
                    <li>Déclarez le dépassement auprès de votre centre des impôts.</li>
                    <li>Préparez vos premières déclarations de TVA (CA3 ou CA12).</li>
                    <li>Adaptez votre trésorerie pour collecter et reverser la TVA.</li>
                </ul>
            </div>
        @elseif($isNearThreshold)
            <div class="info-section" style="background-color: #fef3c7; border-left: 4px solid #f59e0b;">
                <h3>⚠️ ALERTE CRITIQUE - Seuil imminent</h3>
                <p style="color: #78350f; font-weight: 600; margin-bottom: 10px;">
                    Vous êtes à {{ $percentage }}% du seuil. Le dépassement peut survenir à tout moment.
                </p>
                <p style="color: #78350f; padding: 15px; background-color: #fef9e7; border-radius: 6px; font-size: 14px; margin-bottom: 15px;">
                    <strong>⚖️ RAPPEL LÉGAL (Article 293 B du CGI) :</strong><br>
                    En cas de dépassement du seuil, <strong>TOUS les encaissements du mois de dépassement</strong> 
                    deviennent assujettis à la TVA à 20%, même si le seuil est franchi le dernier jour du mois.
                    Vous devrez facturer avec TVA <strong>rétroactivement sur tout le mois concerné</strong>.
                </p>
                <p style="color: #dc2626; font-weight: 600; padding: 12px; background-color: #fee2e2; border-radius: 6px; margin-bottom: 15px;">
                    🚫 TimeIsMoney ne prend pas la responsabilité de la gestion de ce cas complexe. 
                    Nous vous conseillons vivement de <strong>facturer avec TVA dès maintenant</strong> 
                    pour éviter toute complication administrative.
                </p>
                <h3 style="margin-top: 20px;">💡 Actions recommandées</h3>
                <ul>
                    <li><strong>Urgent :</strong> Consultez votre expert-comptable immédiatement</li>
                    <li><strong>Recommandé :</strong> Basculez en TVA dès maintenant pour éviter la régularisation rétroactive</li>
                    <li>Prévenez vos clients du passage imminent en TVA (+20%)</li>
                    <li>Préparez votre trésorerie pour collecter et reverser la TVA</li>
                    <li>Préparez vos premières déclarations de TVA (CA3 ou CA12)</li>
                </ul>
            </div>
        @else
            <div class="info-section">
                <h3>📊 Suivi de votre seuil</h3>
                <ul>
                    <li>Vous avez atteint {{ $percentage }}% du seuil de franchise en base.</li>
                    <li>Marge restante : {{ $remaining }}</li>
                    <li>Type d'activité : {{ ucfirst($thresholdType) }}</li>
                    <li>Continuez à surveiller votre chiffre d'affaires annuel.</li>
                </ul>
            </div>

            <div class="info-section" style="background-color: #fef3c7; border-left: 4px solid #f59e0b;">
                <h3>⚠️ IMPORTANT - Réglementation en cas de dépassement</h3>
                <p style="color: #78350f; font-weight: 600; margin-bottom: 10px;">
                    Selon l'article 293 B du CGI, en cas de dépassement du seuil en cours d'année :
                </p>
                <ul style="color: #78350f;">
                    <li><strong>TOUS les encaissements du mois de dépassement</strong> deviennent assujettis à la TVA à 20%</li>
                    <li>Vous devez facturer avec TVA <strong>rétroactivement sur tout le mois</strong> où le seuil est franchi</li>
                    <li>Cette règle s'applique même si le seuil est dépassé le dernier jour du mois</li>
                </ul>
                <p style="margin-top: 15px; padding: 15px; background-color: #fef9e7; border-radius: 6px; color: #78350f; font-size: 14px;">
                    <strong>⚖️ Clause de non-responsabilité :</strong><br>
                    TimeIsMoney ne prend pas la responsabilité de la gestion de ce cas de figure complexe. 
                    Nous vous conseillons vivement de <strong>consulter votre expert-comptable</strong> et de 
                    <strong>facturer en conséquence</strong> en anticipant le dépassement potentiel.
                </p>
                <p style="margin-top: 10px; color: #78350f; font-size: 14px; font-style: italic;">
                    💡 Conseil : Si vous approchez des 80% du seuil, envisagez de facturer avec TVA dès maintenant 
                    pour éviter les complications administratives liées à la régularisation rétroactive.
                </p>
            </div>
        @endif

        <div style="text-align: center;">
            <a href="{{ config('app.url') }}/settings/billing" class="action-button">
                Voir mes paramètres TVA
            </a>
        </div>

        <div class="info-section" style="background-color: #eff6ff; border-left: 4px solid #3b82f6;">
            <h3>📚 Rappel des seuils de franchise en base</h3>
            <ul>
                <li><strong>Prestations de services :</strong> 36 800 € HT</li>
                <li><strong>Vente de marchandises :</strong> 91 900 € HT</li>
                <li><strong>Activité mixte :</strong> Le seuil le plus restrictif s'applique</li>
            </ul>
            <p style="margin-top: 15px; color: #6b7280; font-size: 14px;">
                Une fois le seuil dépassé, vous devez appliquer la TVA sur toutes vos factures et effectuer 
                des déclarations régulières de TVA auprès de l'administration fiscale.
            </p>
        </div>

        <div class="footer">
            <p>
                Cet email a été généré automatiquement par TimeIsMoney<br>
                <a href="{{ config('app.url') }}" style="color: #3b82f6; text-decoration: none;">{{ config('app.url') }}</a>
            </p>
            <p style="font-size: 12px; margin-top: 10px;">
                Pour toute question, consultez votre expert-comptable ou contactez votre centre des impôts.
            </p>
        </div>
    </div>
</body>
</html>
