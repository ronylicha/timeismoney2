<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Export des tâches</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            font-size: 11px;
            color: #333;
        }
        h1 {
            text-align: center;
            color: #2563eb;
            margin-bottom: 20px;
            font-size: 20px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
        }
        th {
            background-color: #e3f2fd;
            color: #1e40af;
            font-weight: bold;
            padding: 8px;
            text-align: left;
            border-bottom: 2px solid #2563eb;
        }
        td {
            padding: 6px 8px;
            border-bottom: 1px solid #e5e7eb;
        }
        tr:nth-child(even) {
            background-color: #f9fafb;
        }
        .status {
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: bold;
        }
        .status-todo {
            background-color: #e5e7eb;
            color: #374151;
        }
        .status-in_progress {
            background-color: #dbeafe;
            color: #1e40af;
        }
        .status-review {
            background-color: #f3e8ff;
            color: #6b21a8;
        }
        .status-done {
            background-color: #dcfce7;
            color: #166534;
        }
        .priority-low {
            color: #6b7280;
        }
        .priority-normal {
            color: #2563eb;
        }
        .priority-high {
            color: #dc2626;
        }
        .priority-urgent {
            color: #dc2626;
            font-weight: bold;
        }
        .footer {
            margin-top: 20px;
            text-align: center;
            font-size: 10px;
            color: #6b7280;
        }
    </style>
</head>
<body>
    <h1>Export des tâches</h1>
    <p style="text-align: center; color: #6b7280; margin-bottom: 20px;">
        Généré le {{ now()->format('d/m/Y à H:i') }}
    </p>

    <table>
        <thead>
            <tr>
                <th>Code</th>
                <th>Titre</th>
                <th>Projet</th>
                <th>Statut</th>
                <th>Priorité</th>
                <th>Échéance</th>
                <th>Heures est.</th>
            </tr>
        </thead>
        <tbody>
            @foreach($tasks as $task)
            <tr>
                <td>{{ $task->code }}</td>
                <td>{{ $task->title }}</td>
                <td>{{ $task->project->name ?? '-' }}</td>
                <td>
                    <span class="status status-{{ $task->status }}">
                        {{ ucfirst(str_replace('_', ' ', $task->status)) }}
                    </span>
                </td>
                <td class="priority-{{ $task->priority }}">
                    {{ ucfirst($task->priority) }}
                </td>
                <td>{{ $task->due_date?->format('d/m/Y') ?? '-' }}</td>
                <td>{{ $task->estimated_hours ? number_format($task->estimated_hours, 1) . 'h' : '-' }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>

    @if($tasks->isEmpty())
    <p style="text-align: center; color: #6b7280; margin-top: 40px;">
        Aucune tâche à exporter
    </p>
    @endif

    <div class="footer">
        <p>Total: {{ $tasks->count() }} tâche(s)</p>
    </div>
</body>
</html>
