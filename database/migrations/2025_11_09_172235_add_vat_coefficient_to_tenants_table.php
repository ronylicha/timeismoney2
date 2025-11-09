<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            // Coefficient de prorata de déduction de TVA (pour activités mixtes)
            // 100 = 100% de TVA récupérable, 0 = 0% récupérable
            $table->decimal('vat_deduction_coefficient', 5, 2)->default(100)->after('vat_regime');
            
            // Activité principale pour déterminer les règles de TVA automatiquement
            $table->enum('main_activity', [
                'general',              // Activité générale classique
                'insurance',            // Assurance (Art. 261 C CGI)
                'training',             // Formation professionnelle (Art. 261-4-4°)
                'medical',              // Professions médicales (Art. 261-4-1°)
                'banking',              // Banques/Finance (Art. 261 B CGI)
                'real_estate_rental',   // Location immobilière (Art. 261 D)
                'education',            // Enseignement (Art. 261-4-4° bis)
                'sports',               // Éducation sportive (Art. 261-6°)
                'other_exempt'          // Autre activité exonérée
            ])->default('general')->after('vat_deduction_coefficient');
            
            // Numéro d'agrément si nécessaire (formation, etc.)
            $table->string('activity_license_number')->nullable()->after('main_activity');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->dropColumn(['vat_deduction_coefficient', 'main_activity', 'activity_license_number']);
        });
    }
};
