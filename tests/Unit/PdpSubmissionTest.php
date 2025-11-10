<?php

namespace Tests\Unit;

use App\Models\PdpSubmission;
use PHPUnit\Framework\TestCase;

class PdpSubmissionTest extends TestCase
{
    /**
     * Test de génération d'ID de soumission unique
     */
    public function test_generate_submission_id(): void
    {
        $id1 = PdpSubmission::generateSubmissionId();
        $id2 = PdpSubmission::generateSubmissionId();

        // Vérifier que les IDs sont uniques
        $this->assertNotEquals($id1, $id2);
        
        // Vérifier le format
        $this->assertStringStartsWith('PDP-', $id1);
        $this->assertStringStartsWith('PDP-', $id2);
        $this->assertMatchesRegularExpression('/^PDP-\d{4}-[A-Z0-9]+$/', $id1);
    }

    /**
     * Test du format de l'ID de soumission
     */
    public function test_submission_id_format(): void
    {
        $id = PdpSubmission::generateSubmissionId();
        
        // Vérifier la structure: PDP-YYYY-UNIQUEID
        $this->assertStringStartsWith('PDP-', $id);
        
        // Extraire l'année
        $parts = explode('-', $id);
        $this->assertCount(3, $parts);
        $this->assertEquals('PDP', $parts[0]);
        $this->assertEquals(4, strlen($parts[1])); // YYYY
        $this->assertGreaterThanOrEqual(2020, (int)$parts[1]); // Année plausible
        $this->assertLessThanOrEqual(2030, (int)$parts[1]); // Année plausible
        
        // Vérifier que l'ID unique est alphanumérique
        $this->assertMatchesRegularExpression('/^[A-Z0-9]+$/', $parts[2]);
    }

    /**
     * Test que les IDs générés sont uniques sur plusieurs générations
     */
    public function test_multiple_unique_ids(): void
    {
        $ids = [];
        $count = 100;
        
        for ($i = 0; $i < $count; $i++) {
            $id = PdpSubmission::generateSubmissionId();
            $this->assertNotContains($id, $ids, "ID dupliqué trouvé: {$id}");
            $ids[] = $id;
        }
        
        $this->assertCount($count, $ids);
    }
}