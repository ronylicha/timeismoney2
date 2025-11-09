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
        Schema::table('quotes', function (Blueprint $table) {
            // Numéro séquentiel pour NF525
            if (!Schema::hasColumn('quotes', 'sequence_number')) {
                $table->integer('sequence_number')->after('quote_number')->nullable();
            }
            
            // Hash pour inaltérabilité NF525
            if (!Schema::hasColumn('quotes', 'hash')) {
                $table->string('hash')->nullable()->after('signature');
            }
            if (!Schema::hasColumn('quotes', 'previous_hash')) {
                $table->string('previous_hash')->nullable()->after('hash');
            }
            
            // Mentions légales obligatoires
            if (!Schema::hasColumn('quotes', 'legal_mentions')) {
                $table->text('legal_mentions')->nullable()->after('notes');
            }
            if (!Schema::hasColumn('quotes', 'payment_conditions')) {
                $table->string('payment_conditions', 500)->nullable()->after('legal_mentions');
            }
            
            // Conditions générales
            if (!Schema::hasColumn('quotes', 'conditions')) {
                $table->text('conditions')->nullable()->after('payment_conditions');
            }
            
            // Pénalités de retard
            if (!Schema::hasColumn('quotes', 'late_payment_penalty_rate')) {
                $table->decimal('late_payment_penalty_rate', 5, 2)->default(19.59)->after('conditions');
            }
            
            // Indemnité forfaitaire de recouvrement
            if (!Schema::hasColumn('quotes', 'recovery_indemnity')) {
                $table->decimal('recovery_indemnity', 10, 2)->default(40.00)->after('late_payment_penalty_rate');
            }
            
            // Escompte pour paiement anticipé
            if (!Schema::hasColumn('quotes', 'early_payment_discount')) {
                $table->decimal('early_payment_discount', 5, 2)->nullable()->after('recovery_indemnity');
            }
            
            // Verrouillage
            if (!Schema::hasColumn('quotes', 'is_locked')) {
                $table->boolean('is_locked')->default(false)->after('early_payment_discount');
            }
            
            // Footer personnalisé
            if (!Schema::hasColumn('quotes', 'footer')) {
                $table->text('footer')->nullable()->after('notes');
            }
            
            // Cancelled fields
            if (!Schema::hasColumn('quotes', 'cancelled_at')) {
                $table->timestamp('cancelled_at')->nullable()->after('accepted_at');
            }
            if (!Schema::hasColumn('quotes', 'cancellation_reason')) {
                $table->text('cancellation_reason')->nullable()->after('cancelled_at');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('quotes', function (Blueprint $table) {
            $columns = [
                'sequence_number',
                'hash',
                'previous_hash',
                'legal_mentions',
                'payment_conditions',
                'conditions',
                'late_payment_penalty_rate',
                'recovery_indemnity',
                'early_payment_discount',
                'is_locked',
                'footer',
                'cancelled_at',
                'cancellation_reason'
            ];
            
            foreach ($columns as $column) {
                if (Schema::hasColumn('quotes', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
