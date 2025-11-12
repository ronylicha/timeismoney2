<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>{{ $reportType }} - Time Is Money</title>
    <style>
        body { font-family: Arial, sans-serif; font-size: 12px; color: #1f2937; }
        h1 { font-size: 20px; margin-bottom: 4px; }
        h2 { font-size: 14px; margin-top: 16px; margin-bottom: 8px; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        th, td { border: 1px solid #d1d5db; padding: 6px; text-align: left; }
        th { background-color: #f3f4f6; font-weight: 600; }
        .meta { margin-top: 8px; }
    </style>
</head>
<body>
    <h1>{{ $reportType }}</h1>
    <div class="meta">
        <div>Période : {{ $metadata['period']['start'] }} → {{ $metadata['period']['end'] }}</div>
        <div>Généré par : {{ $metadata['generated_by'] ?? 'system' }}</div>
        <div>Date : {{ \Carbon\Carbon::parse($metadata['generated_at'])->format('d/m/Y H:i') }}</div>
    </div>

    <table>
        <thead>
            <tr>
                <th>Section</th>
                <th>Libellé</th>
                <th>Valeur</th>
            </tr>
        </thead>
        <tbody>
            @foreach($rows as $row)
                <tr>
                    <td>{{ $row['Section'] }}</td>
                    <td>{{ $row['Label'] }}</td>
                    <td>{{ $row['Value'] }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>
</body>
</html>
