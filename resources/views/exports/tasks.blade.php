@extends('exports.excel-layout')

@section('content')
<table>
    <thead>
        <tr>
            <th>Code</th>
            <th>Titre</th>
            <th>Description</th>
            <th>Projet</th>
            <th>Statut</th>
            <th>Priorité</th>
            <th>Type</th>
            <th>Assignés</th>
            <th>Date début</th>
            <th>Date échéance</th>
            <th>Heures estimées</th>
            <th>Heures réelles</th>
            <th>Facturable</th>
        </tr>
    </thead>
    <tbody>
        @foreach($tasks as $task)
        <tr>
            <td>{{ $task->code }}</td>
            <td>{{ $task->title }}</td>
            <td>{{ $task->description }}</td>
            <td>{{ $task->project->name ?? '-' }}</td>
            <td>{{ ucfirst($task->status) }}</td>
            <td>{{ ucfirst($task->priority) }}</td>
            <td>{{ ucfirst($task->type) }}</td>
            <td>{{ $task->users->pluck('name')->join(', ') }}</td>
            <td>{{ $task->start_date?->format('d/m/Y') ?? '-' }}</td>
            <td>{{ $task->due_date?->format('d/m/Y') ?? '-' }}</td>
            <td>{{ $task->estimated_hours ? number_format($task->estimated_hours, 2, ',', ' ') : '-' }}</td>
            <td>{{ $task->actual_hours ? number_format($task->actual_hours, 2, ',', ' ') : '-' }}</td>
            <td>{{ $task->is_billable ? 'Oui' : 'Non' }}</td>
        </tr>
        @endforeach
    </tbody>
</table>
@endsection
