<?php

namespace Tests\Unit;

use App\Mail\InvoiceSent;
use App\Mail\PaymentReceived;
use App\Mail\QuoteSent;
use App\Mail\CreditNoteSent;
use App\Mail\InvoiceReminder;
use App\Mail\QuoteAccepted;
use App\Mail\PaymentReceivedMail;
use App\Mail\SupplierInvoiceReceivedMail;
use App\Mail\PdpSubmissionAcceptedMail;
use App\Mail\PdpSubmissionRejectedMail;
use App\Mail\VatThresholdAlert;
use App\Models\Client;
use App\Models\Invoice;
use App\Models\Quote;
use App\Models\CreditNote;
use App\Models\Tenant;
use App\Models\User;
use App\Models\SupplierInvoice;
use App\Models\PdpSubmission;
use App\Services\PdfGeneratorService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MailablesTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;
    private Client $client;
    private User $user;
    private Invoice $invoice;
    private Quote $quote;
    private CreditNote $creditNote;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::factory()->create([
            'name' => 'Test Company',
            'email' => 'company@test.com',
        ]);

        $this->user = User::factory()->create(['tenant_id' => $this->tenant->id]);

        $this->client = Client::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Test Client',
            'email' => 'client@test.com',
        ]);

        $this->invoice = Invoice::factory()->create([
            'tenant_id' => $this->tenant->id,
            'client_id' => $this->client->id,
            'invoice_number' => 'INV-2024-001',
            'total' => 1200,
            'status' => 'sent',
        ]);

        $this->quote = Quote::factory()->create([
            'tenant_id' => $this->tenant->id,
            'client_id' => $this->client->id,
            'quote_number' => 'QTE-2024-001',
            'total' => 1500,
            'status' => 'sent',
        ]);

        $this->creditNote = CreditNote::factory()->create([
            'tenant_id' => $this->tenant->id,
            'client_id' => $this->client->id,
            'invoice_id' => $this->invoice->id,
            'credit_note_number' => 'CN-2024-001',
            'total' => 200,
        ]);

        $this->actingAs($this->user);
    }

    /** @test */
    public function invoice_sent_mail_has_correct_subject()
    {
        $pdfService = $this->mock(PdfGeneratorService::class);
        $mail = new InvoiceSent($this->invoice, $pdfService);

        $envelope = $mail->envelope();

        $this->assertEquals(
            "Facture {$this->invoice->invoice_number} - {$this->tenant->name}",
            $envelope->subject
        );
    }

    /** @test */
    public function invoice_sent_mail_has_correct_view_data()
    {
        $pdfService = $this->mock(PdfGeneratorService::class);
        $mail = new InvoiceSent($this->invoice, $pdfService);

        $content = $mail->content();

        $this->assertEquals('emails.invoice-sent', $content->view);
        $this->assertArrayHasKey('invoice', $content->with);
        $this->assertArrayHasKey('client', $content->with);
        $this->assertArrayHasKey('tenant', $content->with);
    }

    /** @test */
    public function payment_received_mail_has_correct_subject()
    {
        $mail = new PaymentReceived($this->invoice, 1200.00, 'bank_transfer');

        $envelope = $mail->envelope();

        $this->assertEquals(
            "Paiement reçu - Facture {$this->invoice->invoice_number}",
            $envelope->subject
        );
    }

    /** @test */
    public function payment_received_mail_has_correct_data()
    {
        $mail = new PaymentReceived($this->invoice, 1200.00, 'credit_card');

        $content = $mail->content();

        $this->assertEquals('emails.payment-received', $content->view);
        $this->assertEquals(1200.00, $content->with['amount']);
        $this->assertEquals('credit_card', $content->with['paymentMethod']);
    }

    /** @test */
    public function payment_received_mail_works_without_payment_method()
    {
        $mail = new PaymentReceived($this->invoice, 500.00);

        $content = $mail->content();

        $this->assertNull($content->with['paymentMethod']);
    }

    /** @test */
    public function quote_sent_mail_has_correct_subject()
    {
        $mail = new QuoteSent($this->quote);

        $envelope = $mail->envelope();

        $this->assertStringContainsString($this->quote->quote_number, $envelope->subject);
    }

    /** @test */
    public function quote_sent_mail_has_correct_view()
    {
        $mail = new QuoteSent($this->quote);

        $content = $mail->content();

        $this->assertEquals('emails.quote-sent', $content->view);
        $this->assertArrayHasKey('quote', $content->with);
    }

    /** @test */
    public function credit_note_sent_mail_has_correct_subject()
    {
        $mail = new CreditNoteSent($this->creditNote);

        $envelope = $mail->envelope();

        $this->assertStringContainsString($this->creditNote->credit_note_number, $envelope->subject);
    }

    /** @test */
    public function credit_note_sent_mail_has_correct_data()
    {
        $mail = new CreditNoteSent($this->creditNote);

        $content = $mail->content();

        $this->assertEquals('emails.credit-note-sent', $content->view);
        $this->assertArrayHasKey('creditNote', $content->with);
    }

    /** @test */
    public function invoice_reminder_mail_has_correct_subject()
    {
        $mail = new InvoiceReminder($this->invoice);

        $envelope = $mail->envelope();

        $this->assertStringContainsString('Rappel', $envelope->subject);
        $this->assertStringContainsString($this->invoice->invoice_number, $envelope->subject);
    }

    /** @test */
    public function invoice_reminder_mail_has_correct_view()
    {
        $mail = new InvoiceReminder($this->invoice);

        $content = $mail->content();

        $this->assertEquals('emails.invoice-reminder', $content->view);
        $this->assertArrayHasKey('invoice', $content->with);
    }

    /** @test */
    public function quote_accepted_mail_has_correct_subject()
    {
        $mail = new QuoteAccepted($this->quote);

        $envelope = $mail->envelope();

        $this->assertStringContainsString('accepté', $envelope->subject);
        $this->assertStringContainsString($this->quote->quote_number, $envelope->subject);
    }

    /** @test */
    public function quote_accepted_mail_has_correct_data()
    {
        $mail = new QuoteAccepted($this->quote);

        $content = $mail->content();

        $this->assertEquals('emails.quote-accepted', $content->view);
        $this->assertArrayHasKey('quote', $content->with);
    }

    /** @test */
    public function payment_received_mail_alt_has_correct_subject()
    {
        $mail = new PaymentReceivedMail($this->invoice, 800.00);

        $envelope = $mail->envelope();

        $this->assertStringContainsString('Paiement', $envelope->subject);
    }

    /** @test */
    public function supplier_invoice_received_mail_has_correct_subject()
    {
        $supplierInvoice = SupplierInvoice::factory()->create([
            'tenant_id' => $this->tenant->id,
            'supplier_name' => 'Supplier XYZ',
            'invoice_number' => 'SUPP-001',
            'total' => 500,
        ]);

        $mail = new SupplierInvoiceReceivedMail($supplierInvoice);

        $envelope = $mail->envelope();

        $this->assertStringContainsString('facture fournisseur', $envelope->subject);
    }

    /** @test */
    public function supplier_invoice_received_mail_has_correct_data()
    {
        $supplierInvoice = SupplierInvoice::factory()->create([
            'tenant_id' => $this->tenant->id,
            'supplier_name' => 'Supplier ABC',
        ]);

        $mail = new SupplierInvoiceReceivedMail($supplierInvoice);

        $content = $mail->content();

        $this->assertEquals('emails.supplier-invoice-received', $content->view);
        $this->assertArrayHasKey('supplierInvoice', $content->with);
    }

    /** @test */
    public function pdp_submission_accepted_mail_has_correct_subject()
    {
        $submission = PdpSubmission::factory()->create([
            'tenant_id' => $this->tenant->id,
            'invoice_id' => $this->invoice->id,
            'status' => 'accepted',
        ]);

        $mail = new PdpSubmissionAcceptedMail($submission);

        $envelope = $mail->envelope();

        $this->assertStringContainsString('acceptée', $envelope->subject);
    }

    /** @test */
    public function pdp_submission_accepted_mail_has_correct_data()
    {
        $submission = PdpSubmission::factory()->create([
            'tenant_id' => $this->tenant->id,
            'invoice_id' => $this->invoice->id,
            'status' => 'accepted',
        ]);

        $mail = new PdpSubmissionAcceptedMail($submission);

        $content = $mail->content();

        $this->assertEquals('emails.pdp-submission-accepted', $content->view);
        $this->assertArrayHasKey('submission', $content->with);
    }

    /** @test */
    public function pdp_submission_rejected_mail_has_correct_subject()
    {
        $submission = PdpSubmission::factory()->create([
            'tenant_id' => $this->tenant->id,
            'invoice_id' => $this->invoice->id,
            'status' => 'rejected',
            'rejection_reason' => 'Invalid data',
        ]);

        $mail = new PdpSubmissionRejectedMail($submission);

        $envelope = $mail->envelope();

        $this->assertStringContainsString('rejetée', $envelope->subject);
    }

    /** @test */
    public function pdp_submission_rejected_mail_has_correct_data()
    {
        $submission = PdpSubmission::factory()->create([
            'tenant_id' => $this->tenant->id,
            'invoice_id' => $this->invoice->id,
            'status' => 'rejected',
            'rejection_reason' => 'Missing fields',
        ]);

        $mail = new PdpSubmissionRejectedMail($submission);

        $content = $mail->content();

        $this->assertEquals('emails.pdp-submission-rejected', $content->view);
        $this->assertArrayHasKey('submission', $content->with);
        $this->assertArrayHasKey('reason', $content->with);
    }

    /** @test */
    public function vat_threshold_alert_mail_has_correct_subject()
    {
        $mail = new VatThresholdAlert($this->tenant, 35000, 36300);

        $envelope = $mail->envelope();

        $this->assertStringContainsString('TVA', $envelope->subject);
        $this->assertStringContainsString('seuil', $envelope->subject);
    }

    /** @test */
    public function vat_threshold_alert_mail_has_correct_data()
    {
        $mail = new VatThresholdAlert($this->tenant, 36300, 37818);

        $content = $mail->content();

        $this->assertEquals('emails.vat-threshold-alert', $content->view);
        $this->assertArrayHasKey('tenant', $content->with);
        $this->assertArrayHasKey('threshold', $content->with);
        $this->assertArrayHasKey('currentRevenue', $content->with);
        $this->assertEquals(36300, $content->with['threshold']);
        $this->assertEquals(37818, $content->with['currentRevenue']);
    }

    /** @test */
    public function payment_received_mail_returns_empty_attachments()
    {
        $mail = new PaymentReceived($this->invoice, 1200.00);

        $attachments = $mail->attachments();

        $this->assertIsArray($attachments);
        $this->assertEmpty($attachments);
    }

    /** @test */
    public function all_mail_classes_are_queueable()
    {
        $pdfService = $this->mock(PdfGeneratorService::class);

        $mails = [
            new InvoiceSent($this->invoice, $pdfService),
            new PaymentReceived($this->invoice, 100),
            new QuoteSent($this->quote),
            new CreditNoteSent($this->creditNote),
            new InvoiceReminder($this->invoice),
            new QuoteAccepted($this->quote),
        ];

        foreach ($mails as $mail) {
            $reflection = new \ReflectionClass($mail);
            $traits = $reflection->getTraitNames();

            $this->assertContains('Illuminate\Bus\Queueable', $traits);
            $this->assertContains('Illuminate\Queue\SerializesModels', $traits);
        }
    }
}
