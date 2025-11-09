<?php

namespace App\Mail;

use App\Models\Tenant;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class VatThresholdAlert extends Mailable
{
    use Queueable, SerializesModels;

    public Tenant $tenant;
    public int $percentage;
    public float $yearlyRevenue;
    public float $threshold;
    public string $thresholdType;

    /**
     * Create a new message instance.
     */
    public function __construct(Tenant $tenant, int $percentage, float $yearlyRevenue, float $threshold, string $thresholdType = 'services')
    {
        $this->tenant = $tenant;
        $this->percentage = $percentage;
        $this->yearlyRevenue = $yearlyRevenue;
        $this->threshold = $threshold;
        $this->thresholdType = $thresholdType;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        $subject = $this->percentage >= 100 
            ? '🚨 Seuil de franchise TVA dépassé !'
            : "⚠️ Alerte seuil TVA : {$this->percentage}% atteint";

        return new Envelope(
            subject: $subject,
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.vat-threshold-alert',
            with: [
                'tenantName' => $this->tenant->company_name,
                'percentage' => $this->percentage,
                'yearlyRevenue' => $this->formatCurrency($this->yearlyRevenue),
                'threshold' => $this->formatCurrency($this->threshold),
                'remaining' => $this->formatCurrency(max(0, $this->threshold - $this->yearlyRevenue)),
                'thresholdType' => $this->thresholdType,
                'isExceeded' => $this->percentage >= 100,
                'isNearThreshold' => $this->percentage >= 90 && $this->percentage < 100,
                'autoApply' => $this->tenant->auto_apply_vat_on_threshold,
            ],
        );
    }

    /**
     * Format currency for display
     */
    private function formatCurrency(float $amount): string
    {
        return number_format($amount, 2, ',', ' ') . ' €';
    }
}
