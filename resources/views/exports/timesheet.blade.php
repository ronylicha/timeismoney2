@extends('exports.excel-layout')

@section('content')
<table>
    <thead>
        <tr>
            <th>Date</th>
            <th>Heure début</th>
            <th>Heure fin</th>
            <th>Durée (h)</th>
            <th>Projet</th>
            <th>Tâche</th>
            <th>Description</th>
            <th>Utilisateur</th>
            <th>Facturable</th>
            <th>Taux horaire</th>
            <th>Montant</th>
        </tr>
    </thead>
    <tbody>
        @foreach($timeEntries as $entry)
        <tr>
            <td>{{ $entry->started_at->format('d/m/Y') }}</td>
            <td>{{ $entry->started_at->format('H:i') }}</td>
            <td>{{ $entry->ended_at?->format('H:i') ?? '-' }}</td>
            <td>{{ number_format($entry->duration_seconds / 3600, 2, ',', ' ') }}</td>
            <td>{{ $entry->project->name }}</td>
            <td>{{ $entry->task?->name ?? '-' }}</td>
            <td>{{ $entry->description }}</td>
            <td>{{ $entry->user->name }}</td>
            <td>{{ $entry->is_billable ? 'Oui' : 'Non' }}</td>
            <td>{{ number_format($entry->hourly_rate, 2, ',', ' ') }} €</td>
            <td>{{ number_format(($entry->duration_seconds / 3600) * $entry->hourly_rate, 2, ',', ' ') }} €</td>
        </tr>
        @endforeach
    </tbody>
    <tfoot>
        <tr>
            <td colspan="3"><strong>Totaux</strong></td>
            <td><strong>{{ number_format($totals['total_hours'], 2, ',', ' ') }} h</strong></td>
            <td colspan="5"></td>
            <td><strong>{{ number_format($totals['total_amount'], 2, ',', ' ') }} €</strong></td>
        </tr>
    </tfoot>
</table>
@endsection