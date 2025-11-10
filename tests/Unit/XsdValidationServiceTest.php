<?php

namespace Tests\Unit;

use App\Services\XsdValidationService;
use Tests\TestCase;

class XsdValidationServiceTest extends TestCase
{

    private XsdValidationService $xsdService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->xsdService = app(XsdValidationService::class);
    }

    public function test_schemas_are_available(): void
    {
        $this->assertTrue($this->xsdService->schemasAvailable());
        
        $profiles = $this->xsdService->getAvailableProfiles();
        $this->assertContains('BASIC', $profiles);
        $this->assertContains('COMFORT', $profiles);
        $this->assertContains('EXTENDED', $profiles);
        $this->assertContains('EN16931', $profiles);
    }

    public function test_validates_basic_facturx_xml(): void
    {
        $validXml = $this->generateValidBasicXml();
        
        $result = $this->xsdService->validateXml($validXml, 'BASIC');
        
        $this->assertTrue($result['valid']);
        $this->assertEquals('BASIC', $result['profile']);
        $this->assertArrayHasKey('compliance_score', $result);
        $this->assertArrayHasKey('validation_time', $result);
        $this->assertArrayHasKey('schema_version', $result);
    }

    public function test_detects_invalid_xml(): void
    {
        $invalidXml = '<?xml version="1.0" encoding="UTF-8"?>
            <rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100">
                <!-- Missing required elements -->
            </rsm:CrossIndustryInvoice>';
        
        $result = $this->xsdService->validateXml($invalidXml, 'BASIC');
        
        $this->assertFalse($result['valid']);
        $this->assertNotEmpty($result['errors']);
        $this->assertLessThanOrEqual(80, $result['compliance_score']);
    }

    public function test_detects_facturx_profile(): void
    {
        $basicXml = $this->generateValidBasicXml();
        $comfortXml = $this->generateValidComfortXml();
        $extendedXml = $this->generateValidExtendedXml();
        
        // Test profile detection (via reflection since method is private)
        $reflection = new \ReflectionClass($this->xsdService);
        $method = $reflection->getMethod('detectFacturXProfile');
        $method->setAccessible(true);
        
        $this->assertEquals('BASIC', $method->invoke($this->xsdService, $basicXml));
        $this->assertEquals('COMFORT', $method->invoke($this->xsdService, $comfortXml));
        $this->assertEquals('EXTENDED', $method->invoke($this->xsdService, $extendedXml));
    }

    public function test_calculates_compliance_score(): void
    {
        $validXml = $this->generateValidBasicXml();
        $result = $this->xsdService->validateXml($validXml, 'BASIC');
        
        // Valid XML should have high compliance score
        $this->assertGreaterThanOrEqual(80, $result['compliance_score']);
        $this->assertLessThanOrEqual(100, $result['compliance_score']);
    }

    public function test_formats_xsd_errors(): void
    {
        $invalidXml = '<?xml version="1.0" encoding="UTF-8"?>
            <rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100">
                <InvalidElement>Test</InvalidElement>
            </rsm:CrossIndustryInvoice>';
        
        $result = $this->xsdService->validateXml($invalidXml, 'BASIC');
        
        if (!empty($result['errors'])) {
            $error = $result['errors'][0];
            
            $this->assertArrayHasKey('message', $error);
            $this->assertArrayHasKey('code', $error);
            $this->assertArrayHasKey('level', $error);
            $this->assertArrayHasKey('line', $error);
            $this->assertArrayHasKey('column', $error);
            $this->assertArrayHasKey('type', $error);
            $this->assertArrayHasKey('suggestion', $error);
        }
    }

    private function generateValidBasicXml(): string
    {
        return '<?xml version="1.0" encoding="UTF-8"?>
            <rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100">
                <rsm:ExchangedDocument>
                    <rsm:ID>INV-2024-001</rsm:ID>
                    <rsm:TypeCode>380</rsm:TypeCode>
                    <rsm:IssueDateTime>2024-01-15T10:00:00</rsm:IssueDateTime>
                </rsm:ExchangedDocument>
                <rsm:ExchangedDocumentContext>
                    <rsm:GuidelineSpecifiedDocumentContextParameter>
                        <rsm:ID>urn:cen.eu:en16931:2017#conformant#urn:factur-x.eu:1p0:basic</rsm:ID>
                    </rsm:GuidelineSpecifiedDocumentContextParameter>
                </rsm:ExchangedDocumentContext>
                <rsm:SupplyChainTradeTransaction>
                    <rsm:ApplicableHeaderTradeAgreement>
                        <rsm:SellerTradeParty>
                            <rsm:Name>Test Seller</rsm:Name>
                            <rsm:PostalTradeAddress>
                                <rsm:CountryID>FR</rsm:CountryID>
                            </rsm:PostalTradeAddress>
                        </rsm:SellerTradeParty>
                        <rsm:BuyerTradeParty>
                            <rsm:Name>Test Buyer</rsm:Name>
                            <rsm:PostalTradeAddress>
                                <rsm:CountryID>FR</rsm:CountryID>
                            </rsm:PostalTradeAddress>
                        </rsm:BuyerTradeParty>
                    </rsm:ApplicableHeaderTradeAgreement>
                    <rsm:ApplicableHeaderTradeSettlement>
                        <rsm:InvoiceCurrencyCode>EUR</rsm:InvoiceCurrencyCode>
                        <rsm:SpecifiedTradeSettlementHeaderMonetarySummation>
                            <rsm:GrandTotalAmount>100.00</rsm:GrandTotalAmount>
                        </rsm:SpecifiedTradeSettlementHeaderMonetarySummation>
                    </rsm:ApplicableHeaderTradeSettlement>
                </rsm:SupplyChainTradeTransaction>
            </rsm:CrossIndustryInvoice>';
    }

    private function generateValidComfortXml(): string
    {
        return str_replace(
            'urn:cen.eu:en16931:2017#conformant#urn:factur-x.eu:1p0:basic',
            'urn:cen.eu:en16931:2017#conformant#urn:factur-x.eu:1p0:comfort',
            $this->generateValidBasicXml()
        );
    }

    private function generateValidExtendedXml(): string
    {
        return str_replace(
            'urn:cen.eu:en16931:2017#conformant#urn:factur-x.eu:1p0:basic',
            'urn:cen.eu:en16931:2017#conformant#urn:factur-x.eu:1p0:extended',
            $this->generateValidBasicXml()
        );
    }
}