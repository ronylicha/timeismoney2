<?php

namespace App\Exports;

use App\Models\TimeEntry;
use Illuminate\Contracts\View\View;
use Maatwebsite\Excel\Concerns\FromView;
use Maatwebsite\Excel\Concerns\WithColumnWidths;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithTitle;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class TimesheetExport implements FromView, WithColumnWidths, WithStyles, WithTitle
{
    protected $timeEntries;
    protected $totals;
    protected $period;

    public function __construct($timeEntries, $totals, $period = null)
    {
        $this->timeEntries = $timeEntries;
        $this->totals = $totals;
        $this->period = $period;
    }

    public function view(): View
    {
        return view('exports.timesheet', [
            'timeEntries' => $this->timeEntries,
            'totals' => $this->totals,
            'period' => $this->period
        ]);
    }

    public function columnWidths(): array
    {
        return [
            'A' => 12, // Date
            'B' => 8,  // Start Time
            'C' => 8,  // End Time
            'D' => 10, // Duration
            'E' => 25, // Project
            'F' => 20, // Task
            'G' => 40, // Description
            'H' => 15, // User
            'I' => 10, // Billable
            'J' => 12, // Hourly Rate
            'K' => 12, // Amount
        ];
    }

    public function styles(Worksheet $sheet)
    {
        return [
            1 => ['font' => ['bold' => true]],
            'A1:K1' => [
                'fill' => [
                    'fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,
                    'startColor' => ['rgb' => 'E3F2FD']
                ]
            ],
            'A' . ($this->timeEntries->count() + 3) . ':K' . ($this->timeEntries->count() + 3) => [
                'font' => ['bold' => true],
                'fill' => [
                    'fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,
                    'startColor' => ['rgb' => 'F3E5F5']
                ]
            ],
        ];
    }

    public function title(): string
    {
        return $this->period ? 'Timesheet ' . $this->period : 'Timesheet';
    }
}