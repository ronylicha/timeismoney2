<?php

namespace Tests\Unit;

use App\Services\ElectronicSignatureService;
use Tests\TestCase;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Http;

class ElectronicSignatureServiceTest extends TestCase
{

    private ElectronicSignatureService $signatureService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->signatureService = app(ElectronicSignatureService::class);
        
        // Create test directories
        Storage::makeDirectory('test_documents');
        Storage::makeDirectory('private/certificates');
        Storage::makeDirectory('private/timestamps');
        Storage::makeDirectory('private/signatures/audit');
    }

    public function test_service_configuration(): void
    {
        $config = $this->signatureService->getConfiguration();
        
        $this->assertIsArray($config);
        $this->assertArrayHasKey('enabled', $config);
        $this->assertArrayHasKey('timestamp_enabled', $config);
        $this->assertArrayHasKey('signature_level', $config);
        $this->assertArrayHasKey('max_file_size', $config);
    }

    public function test_service_is_configured_with_environment_variables(): void
    {
        $this->assertTrue($this->signatureService->isConfigured());
    }

    public function test_validates_document_for_signing(): void
    {
        // Create a test PDF file
        $testPdfPath = 'test_documents/test_invoice.pdf';
        Storage::put($testPdfPath, '%PDF-1.4 test content');

        // Use reflection to access private method
        $reflection = new \ReflectionClass($this->signatureService);
        $method = $reflection->getMethod('validateDocumentForSigning');
        $method->setAccessible(true);

        $result = $method->invoke($this->signatureService, $testPdfPath);

        $this->assertTrue($result['valid']);
        $this->assertEmpty($result['errors']);
    }

    public function test_rejects_non_pdf_file(): void
    {
        // Create a non-PDF file
        $testFilePath = 'test_documents/test_file.txt';
        Storage::put($testFilePath, 'This is not a PDF');

        $reflection = new \ReflectionClass($this->signatureService);
        $method = $reflection->getMethod('validateDocumentForSigning');
        $method->setAccessible(true);

        $result = $method->invoke($this->signatureService, $testFilePath);

        $this->assertFalse($result['valid']);
        $this->assertNotEmpty($result['errors']);
        $this->assertStringContainsString('PDF', $result['errors'][0]);
    }

    public function test_rejects_nonexistent_file(): void
    {
        $nonexistentPath = 'test_documents/nonexistent.pdf';

        $reflection = new \ReflectionClass($this->signatureService);
        $method = $reflection->getMethod('validateDocumentForSigning');
        $method->setAccessible(true);

        $result = $method->invoke($this->signatureService, $nonexistentPath);

        $this->assertFalse($result['valid']);
        $this->assertNotEmpty($result['errors']);
        $this->assertStringContainsString('non trouvé', $result['errors'][0]);
    }

    public function test_prepares_signature_info(): void
    {
        $signerInfo = [
            'name' => 'Test Signer',
            'email' => 'test@example.com',
            'role' => 'Manager',
            'location' => 'Paris',
            'reason' => 'Test signature',
            'level' => 'QES',
        ];

        $reflection = new \ReflectionClass($this->signatureService);
        $method = $reflection->getMethod('prepareSignatureInfo');
        $method->setAccessible(true);

        $result = $method->invoke($this->signatureService, $signerInfo);

        $this->assertArrayHasKey('id', $result);
        $this->assertArrayHasKey('signer_name', $result);
        $this->assertArrayHasKey('signer_email', $result);
        $this->assertArrayHasKey('signer_role', $result);
        $this->assertArrayHasKey('signature_time', $result);
        $this->assertArrayHasKey('location', $result);
        $this->assertArrayHasKey('reason', $result);
        $this->assertArrayHasKey('signature_level', $result);

        $this->assertEquals('Test Signer', $result['signer_name']);
        $this->assertEquals('test@example.com', $result['signer_email']);
        $this->assertEquals('Manager', $result['signer_role']);
        $this->assertEquals('Paris', $result['location']);
        $this->assertEquals('Test signature', $result['reason']);
        $this->assertEquals('QES', $result['signature_level']);
    }

    public function test_creates_signature_metadata(): void
    {
        $signatureInfo = [
            'id' => 'SIG-123',
            'signer_name' => 'Test Signer',
            'signer_email' => 'test@example.com',
            'signer_role' => 'Manager',
            'signature_time' => now()->toISOString(),
            'location' => 'Paris',
            'reason' => 'Test signature',
            'signature_level' => 'QES',
            'certificate_info' => ['test' => 'cert'],
        ];

        $reflection = new \ReflectionClass($this->signatureService);
        $method = $reflection->getMethod('createSignatureMetadata');
        $method->setAccessible(true);

        $result = $method->invoke($this->signatureService, $signatureInfo);

        $this->assertArrayHasKey('id', $result);
        $this->assertArrayHasKey('signer', $result);
        $this->assertArrayHasKey('signature_time', $result);
        $this->assertArrayHasKey('location', $result);
        $this->assertArrayHasKey('reason', $result);
        $this->assertArrayHasKey('level', $result);
        $this->assertArrayHasKey('certificate_info', $result);

        $this->assertEquals('SIG-123', $result['id']);
        $this->assertEquals('Test Signer', $result['signer']['name']);
        $this->assertEquals('test@example.com', $result['signer']['email']);
        $this->assertEquals('Manager', $result['signer']['role']);
    }

    public function test_generates_signed_file_name(): void
    {
        $originalPath = 'documents/invoice.pdf';

        $reflection = new \ReflectionClass($this->signatureService);
        $method = $reflection->getMethod('generateSignedFileName');
        $method->setAccessible(true);

        $result = $method->invoke($this->signatureService, $originalPath);

        $this->assertStringContainsString('documents/', $result);
        $this->assertStringContainsString('invoice_signed_', $result);
        $this->assertStringEndsWith('.pdf', $result);
        $this->assertNotEquals($originalPath, $result);
    }

    public function test_verifies_document_integrity(): void
    {
        // Create a test file
        $testPath = 'test_documents/integrity_test.pdf';
        $content = 'Test PDF content for integrity check';
        Storage::put($testPath, $content);

        $reflection = new \ReflectionClass($this->signatureService);
        $method = $reflection->getMethod('verifyDocumentIntegrity');
        $method->setAccessible(true);

        $result = $method->invoke($this->signatureService, $testPath);

        $this->assertTrue($result['valid']);
        $this->assertArrayHasKey('hash', $result);
        $this->assertArrayHasKey('algorithm', $result);
        $this->assertEquals('sha256', $result['algorithm']);
        $this->assertEquals(hash('sha256', $content), $result['hash']);
    }

    public function test_handles_integrity_check_failure(): void
    {
        // Test with non-existent file
        $nonexistentPath = 'test_documents/nonexistent.pdf';

        $reflection = new \ReflectionClass($this->signatureService);
        $method = $reflection->getMethod('verifyDocumentIntegrity');
        $method->setAccessible(true);

        $result = $method->invoke($this->signatureService, $nonexistentPath);

        $this->assertFalse($result['valid']);
        $this->assertArrayHasKey('error', $result);
    }

    public function test_collects_validation_errors(): void
    {
        $signatureResults = [
            ['valid' => false, 'error' => 'Certificate expired'],
            ['valid' => true],
        ];

        $timestampResults = [
            ['valid' => false, 'error' => 'Timestamp invalid'],
        ];

        $integrityCheck = ['valid' => true];

        $reflection = new \ReflectionClass($this->signatureService);
        $method = $reflection->getMethod('collectValidationErrors');
        $method->setAccessible(true);

        $errors = $method->invoke($this->signatureService, $signatureResults, $timestampResults, $integrityCheck);

        $this->assertCount(2, $errors);
        $this->assertStringContainsString('Certificate expired', $errors[0]);
        $this->assertStringContainsString('Timestamp invalid', $errors[1]);
    }

    public function test_collects_validation_warnings(): void
    {
        $signatureResults = [
            ['valid' => true, 'warnings' => ['Certificate expires soon']],
            ['valid' => true],
        ];

        $timestampResults = [
            ['valid' => true, 'warnings' => ['Timestamp from untrusted TSA']],
        ];

        $reflection = new \ReflectionClass($this->signatureService);
        $method = $reflection->getMethod('collectValidationWarnings');
        $method->setAccessible(true);

        $warnings = $method->invoke($this->signatureService, $signatureResults, $timestampResults);

        $this->assertCount(2, $warnings);
        $this->assertContains('Certificate expires soon', $warnings);
        $this->assertContains('Timestamp from untrusted TSA', $warnings);
    }

    public function test_signs_document_with_mock_signature(): void
    {
        // Create a test PDF
        $testPdfPath = 'test_documents/test_invoice.pdf';
        Storage::put($testPdfPath, '%PDF-1.4 test invoice content');

        $signerInfo = [
            'name' => 'Test Signer',
            'email' => 'test@example.com',
            'role' => 'Manager',
        ];

        // Mock HTTP for timestamp service
        Http::fake([
            '*/timestamp' => Http::response([
                'token' => 'mock_timestamp_token',
                'time' => now()->toISOString(),
            ], 200),
        ]);

        $result = $this->signatureService->signFacturXDocument($testPdfPath, $signerInfo);

        // The service should now work with real PDF libraries
        $this->assertArrayHasKey('success', $result);
        $this->assertArrayHasKey('signed_path', $result);
    }

    public function test_validates_signed_document(): void
    {
        // Create a test signed PDF
        $testSignedPath = 'test_documents/test_signed_invoice.pdf';
        Storage::put($testSignedPath, '%PDF-1.4 signed content');

        $result = $this->signatureService->validateSignedDocument($testSignedPath);

        $this->assertArrayHasKey('valid', $result);
        $this->assertArrayHasKey('signatures', $result);
        $this->assertArrayHasKey('timestamps', $result);
        $this->assertArrayHasKey('integrity', $result);
        $this->assertArrayHasKey('validation_time', $result);
        $this->assertArrayHasKey('errors', $result);
        $this->assertArrayHasKey('warnings', $result);

        $this->assertIsArray($result['signatures']);
        $this->assertIsArray($result['timestamps']);
        $this->assertIsArray($result['errors']);
        $this->assertIsArray($result['warnings']);
    }

    public function test_verifies_signature(): void
    {
        // Create a test signed PDF with signature metadata
        $testSignedPath = 'test_documents/test_signed_invoice.pdf';
        $signatureMetadata = [
            'id' => 'test_signature_123',
            'signer' => ['name' => 'Test Signer', 'email' => 'test@example.com'],
            'timestamp' => now()->toISOString(),
            'signature_info' => ['location' => 'Paris, France'],
            'certificate' => 'test_certificate_data',
        ];
        
        $signedContent = '%PDF-1.4 signed content' . "\n% FACTUR-X SIGNATURE METADATA% " . json_encode($signatureMetadata) . "\n";
        Storage::put($testSignedPath, $signedContent);

        $result = $this->signatureService->verifySignature($testSignedPath);



        $this->assertArrayHasKey('valid', $result);
        $this->assertArrayHasKey('signatures', $result);
        $this->assertIsArray($result['signatures']);
    }

    protected function tearDown(): void
    {
        // Clean up test files
        Storage::deleteDirectory('test_documents');
        Storage::deleteDirectory('private/certificates');
        Storage::deleteDirectory('private/timestamps');
        Storage::deleteDirectory('private/signatures');
        
        parent::tearDown();
    }
}