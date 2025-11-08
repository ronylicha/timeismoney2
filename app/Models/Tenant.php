<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Tenant extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'slug',
        'type',
        'settings',
        'is_active',
        'logo',
        'primary_color',
        'secondary_color',
        'company_name',
        'legal_form',
        'siret',
        'vat_number',
        'address_line1',
        'address_line2',
        'postal_code',
        'city',
        'country',
        'email',
        'phone',
        'website'
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'settings' => 'array'
    ];

    protected $attributes = [
        'type' => 'company',
        'is_active' => true,
        'primary_color' => '#3B82F6',
        'secondary_color' => '#10B981',
        'country' => 'FR'
    ];

    /**
     * Get all users belonging to this tenant
     */
    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    /**
     * Get all projects for this tenant
     */
    public function projects(): HasMany
    {
        return $this->hasMany(Project::class);
    }

    /**
     * Get all clients for this tenant
     */
    public function clients(): HasMany
    {
        return $this->hasMany(Client::class);
    }

    /**
     * Get all invoices for this tenant
     */
    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class);
    }

    /**
     * Get all time entries for this tenant
     */
    public function timeEntries(): HasMany
    {
        return $this->hasMany(TimeEntry::class);
    }

    /**
     * Check if tenant is suspended
     */
    public function isSuspended(): bool
    {
        return !$this->is_active;
    }

    /**
     * Get tenant by slug
     */
    public static function findBySlug(string $slug)
    {
        return static::where('slug', $slug)->first();
    }
}