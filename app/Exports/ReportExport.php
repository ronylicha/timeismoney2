<?php

namespace App\Exports;

use Illuminate\Support\Str;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithTitle;

class ReportExport implements FromCollection, WithHeadings, WithTitle
{
    public function __construct(
        private array $rows,
        private string $title = 'Report'
    ) {
    }

    public function collection(): Collection
    {
        return collect($this->rows);
    }

    public function headings(): array
    {
        return ['Section', 'Label', 'Value'];
    }

    public function title(): string
    {
        $clean = trim(preg_replace('/[^A-Za-z0-9 ]/', ' ', $this->title));

        return Str::limit($clean !== '' ? $clean : 'Report', 31, '');
    }
}

