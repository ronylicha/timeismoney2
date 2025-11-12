<?php

namespace App\Exports;

use Illuminate\Contracts\View\View;
use Maatwebsite\Excel\Concerns\FromView;
use Maatwebsite\Excel\Concerns\WithColumnWidths;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithTitle;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class TaskExport implements FromView, WithColumnWidths, WithStyles, WithTitle
{
    protected $tasks;

    public function __construct($tasks)
    {
        $this->tasks = $tasks;
    }

    public function view(): View
    {
        return view('exports.tasks', [
            'tasks' => $this->tasks,
        ]);
    }

    public function columnWidths(): array
    {
        return [
            'A' => 15, // Code
            'B' => 30, // Title
            'C' => 40, // Description
            'D' => 20, // Project
            'E' => 12, // Status
            'F' => 10, // Priority
            'G' => 12, // Type
            'H' => 15, // Assignees
            'I' => 12, // Start Date
            'J' => 12, // Due Date
            'K' => 12, // Estimated Hours
            'L' => 12, // Actual Hours
            'M' => 10, // Billable
        ];
    }

    public function styles(Worksheet $sheet)
    {
        return [
            1 => ['font' => ['bold' => true]],
            'A1:M1' => [
                'fill' => [
                    'fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,
                    'startColor' => ['rgb' => 'E3F2FD']
                ]
            ],
        ];
    }

    public function title(): string
    {
        return 'Tasks';
    }
}
