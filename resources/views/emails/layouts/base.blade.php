<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>@yield('title')</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
        }

        .email-container {
            background-color: #ffffff;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .header {
            text-align: center;
            padding-bottom: 20px;
            border-bottom: 2px solid #2563eb;
            margin-bottom: 30px;
        }

        .company-name {
            font-size: 24px;
            font-weight: bold;
            color: #2563eb;
            margin-bottom: 5px;
        }

        .company-tagline {
            font-size: 14px;
            color: #666;
        }

        .content {
            margin-bottom: 30px;
        }

        h1 {
            color: #1e40af;
            font-size: 22px;
            margin-bottom: 20px;
        }

        .info-box {
            background-color: #f3f4f6;
            border-left: 4px solid #2563eb;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }

        .info-box strong {
            color: #2563eb;
        }

        .warning-box {
            background-color: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }

        .success-box {
            background-color: #d1fae5;
            border-left: 4px solid #10b981;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }

        .button {
            display: inline-block;
            padding: 12px 30px;
            background-color: #2563eb;
            color: #ffffff;
            text-decoration: none;
            border-radius: 5px;
            font-weight: bold;
            margin: 20px 0;
        }

        .button:hover {
            background-color: #1e40af;
        }

        .footer {
            text-align: center;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            margin-top: 30px;
            font-size: 12px;
            color: #666;
        }

        .footer a {
            color: #2563eb;
            text-decoration: none;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }

        table th {
            background-color: #f3f4f6;
            padding: 10px;
            text-align: left;
            font-weight: bold;
            border-bottom: 2px solid #e5e7eb;
        }

        table td {
            padding: 10px;
            border-bottom: 1px solid #e5e7eb;
        }

        .total-row {
            font-weight: bold;
            font-size: 16px;
            background-color: #f9fafb;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <div class="company-name">{{ $tenant->name }}</div>
            @if($tenant->email)
                <div class="company-tagline">{{ $tenant->email }}</div>
            @endif
        </div>

        <div class="content">
            @yield('content')
        </div>

        <div class="footer">
            <p>
                {{ $tenant->name }}<br>
                @if($tenant->address)
                    {{ $tenant->address }}<br>
                @endif
                @if($tenant->city || $tenant->postal_code)
                    {{ $tenant->postal_code }} {{ $tenant->city }}<br>
                @endif
                @if($tenant->phone)
                    Tél: {{ $tenant->phone }}<br>
                @endif
                @if($tenant->email)
                    Email: <a href="mailto:{{ $tenant->email }}">{{ $tenant->email }}</a>
                @endif
            </p>
            <p style="margin-top: 15px; color: #999; font-size: 11px;">
                Cet email a été envoyé automatiquement, merci de ne pas répondre directement.
            </p>
        </div>
    </div>
</body>
</html>
