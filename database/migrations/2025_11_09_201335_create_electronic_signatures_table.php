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
        Schema::create('electronic_signatures', function (Blueprint $table) {
            $table->id();
            
            // Tenant
            $table->foreignId('tenant_id')->constrained()->onDelete('cascade');
            
            // Polymorphic relation to signed document
            $table->string('signable_type'); // Invoice, CreditNote, etc.
            $table->unsignedBigInteger('signable_id');
            
            // Signature information
            $table->string('signature_id')->unique(); // Unique signature identifier
            $table->string('signer_name');
            $table->string('signer_email')->nullable();
            $table->string('signer_role')->default('Signataire');
            $table->string('signature_level')->default('QES'); // QES, AES, SES
            
            // Certificate information
            $table->json('certificate_info')->nullable(); // Certificate details
            $table->timestamp('signature_time'); // When signature was created
            $table->string('location')->nullable(); // Geographic location
            $table->text('reason')->nullable(); // Reason for signing
            
            // File paths
            $table->string('original_file_path'); // Original document path
            $table->string('signed_file_path')->nullable(); // Signed document path
            
            // Timestamp information
            $table->json('timestamp_info')->nullable(); // RFC 3161 timestamp details
            
            // Validation results
            $table->json('validation_result')->nullable(); // Full validation details
            $table->decimal('processing_time', 8, 2)->nullable(); // Processing time in ms
            
            // Status tracking
            $table->string('status')->default('pending'); // pending, valid, failed, expired, revoked
            $table->text('error_message')->nullable(); // Error details if failed
            
            // Additional metadata
            $table->json('metadata')->nullable(); // Additional signature metadata
            
            // Audit information
            $table->string('ip_address')->nullable();
            $table->text('user_agent')->nullable();
            $table->foreignId('signed_by')->nullable()->constrained('users')->onDelete('set null');
            
            $table->timestamps();
            
            // Indexes
            $table->index(['signable_type', 'signable_id']);
            $table->index('signature_id');
            $table->index('status');
            $table->index('signature_level');
            $table->index('signature_time');
            $table->index('tenant_id');
            
            // Full-text search for signer information (MySQL only)
            if (DB::getDriverName() === 'mysql') {
                $table->fullText(['signer_name', 'signer_email']);
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('electronic_signatures');
    }
};
