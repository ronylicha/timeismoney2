<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\ClientContact;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ClientController extends Controller
{
    /**
     * Display a listing of clients
     */
    public function index(Request $request)
    {
        $query = Client::with('contacts')
            ->where('tenant_id', auth()->user()->tenant_id);

        // Search
        if ($request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%")
                    ->orWhere('vat_number', 'like', "%{$search}%");
            });
        }

        // Filter by active status
        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        // Filter by type
        if ($request->has('is_company')) {
            $query->where('is_company', $request->boolean('is_company'));
        }

        // Sort
        $sortBy = $request->sort_by ?? 'name';
        $sortOrder = $request->sort_order ?? 'asc';
        $query->orderBy($sortBy, $sortOrder);

        return $query->paginate(20);
    }

    /**
     * Store a new client
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'company_name' => 'nullable|string|max:255',
            'is_company' => 'boolean',
            'legal_form' => 'nullable|string|in:SARL,SAS,SA,EI,EIRL,EURL,SNC,SCI,Association,Other',
            'siret' => 'nullable|string|max:14',
            'vat_number' => 'nullable|string|max:50',
            'address' => 'nullable|string|max:500',
            'address_line1' => 'nullable|string|max:255',
            'address_line2' => 'nullable|string|max:255',
            'postal_code' => 'nullable|string|max:20',
            'city' => 'nullable|string|max:100',
            'country' => 'required|string|max:2',
            'phone' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:255',
            'website' => 'nullable|url|max:255',
            'billing_email' => 'nullable|email|max:255',
            'payment_terms' => 'nullable|integer|min:0',
            'payment_method' => 'nullable|string|in:bank_transfer,check,cash,card,other',
            'discount_percentage' => 'nullable|numeric|min:0|max:100',
            'vat_exempt' => 'nullable|boolean',
            'hourly_rate' => 'nullable|numeric|min:0',
            'currency' => 'nullable|string|size:3',
            'status' => 'nullable|string|in:prospect,active,inactive',
            'notes' => 'nullable|string',
            'chorus_structure_id' => 'nullable|string|max:100',
            'chorus_service_id' => 'nullable|string|max:100',
            'chorus_engagement_id' => 'nullable|string|max:100',
            'contacts' => 'nullable|array',
            'contacts.*.name' => 'required|string|max:255',
            'contacts.*.email' => 'nullable|email|max:255',
            'contacts.*.phone' => 'nullable|string|max:50'
        ]);

        // Generate client code
        $validated['code'] = $this->generateClientCode($validated['name']);
        $validated['tenant_id'] = auth()->user()->tenant_id;
        $validated['created_by'] = auth()->id();
        $validated['is_active'] = true;

        // Set defaults for fields with DB defaults
        if (!isset($validated['country'])) {
            $validated['country'] = 'FR';
        }
        if (!isset($validated['payment_terms'])) {
            $validated['payment_terms'] = 30;
        }
        if (!isset($validated['payment_method'])) {
            $validated['payment_method'] = 'bank_transfer';
        }
        if (!isset($validated['discount_percentage'])) {
            $validated['discount_percentage'] = 0;
        }
        if (!isset($validated['vat_exempt'])) {
            $validated['vat_exempt'] = false;
        }
        if (!isset($validated['status'])) {
            $validated['status'] = 'active';
        }

        // Create client
        $client = Client::create($validated);

        // Create contacts
        if (!empty($validated['contacts'])) {
            foreach ($validated['contacts'] as $index => $contactData) {
                $contactData['tenant_id'] = auth()->user()->tenant_id;
                $contactData['is_primary'] = $index === 0;
                $client->contacts()->create($contactData);
            }
        }

        return response()->json([
            'message' => 'Client created successfully',
            'client' => $client->load('contacts')
        ], 201);
    }

    /**
     * Display the specified client
     */
    public function show(Client $client)
    {
        return response()->json([
            'data' => $client->load(['contacts', 'projects', 'invoices'])
        ]);
    }

    /**
     * Update the specified client
     */
    public function update(Request $request, Client $client)
    {
        $validated = $request->validate([
            'name' => 'string|max:255',
            'company_name' => 'nullable|string|max:255',
            'is_company' => 'boolean',
            'legal_form' => 'nullable|string|in:SARL,SAS,SA,EI,EIRL,EURL,SNC,SCI,Association,Other',
            'siret' => 'nullable|string|max:14',
            'vat_number' => 'nullable|string|max:50',
            'address' => 'nullable|string|max:500',
            'address_line1' => 'nullable|string|max:255',
            'address_line2' => 'nullable|string|max:255',
            'postal_code' => 'nullable|string|max:20',
            'city' => 'nullable|string|max:100',
            'country' => 'required|string|max:2',
            'phone' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:255',
            'website' => 'nullable|url|max:255',
            'billing_email' => 'nullable|email|max:255',
            'payment_terms' => 'nullable|integer|min:0',
            'payment_method' => 'nullable|string|in:bank_transfer,check,cash,card,other',
            'discount_percentage' => 'nullable|numeric|min:0|max:100',
            'vat_exempt' => 'nullable|boolean',
            'hourly_rate' => 'nullable|numeric|min:0',
            'currency' => 'nullable|string|size:3',
            'status' => 'nullable|string|in:prospect,active,inactive',
            'notes' => 'nullable|string',
            'is_active' => 'boolean',
            'chorus_structure_id' => 'nullable|string|max:100',
            'chorus_service_id' => 'nullable|string|max:100',
            'chorus_engagement_id' => 'nullable|string|max:100'
        ]);

        $client->update($validated);

        return response()->json([
            'message' => 'Client updated successfully',
            'client' => $client->fresh()->load('contacts')
        ]);
    }

    /**
     * Remove the specified client
     */
    public function destroy(Client $client)
    {
        // Check if client has active projects or unpaid invoices
        if ($client->projects()->where('status', '!=', 'completed')->exists()) {
            return response()->json([
                'message' => 'Cannot delete client with active projects'
            ], 422);
        }

        if ($client->invoices()->whereNotIn('status', ['paid', 'cancelled'])->exists()) {
            return response()->json([
                'message' => 'Cannot delete client with unpaid invoices'
            ], 422);
        }

        $client->delete();

        return response()->json([
            'message' => 'Client deleted successfully'
        ]);
    }

    /**
     * Get client contacts
     */
    public function contacts(Client $client)
    {
        return $client->contacts;
    }

    /**
     * Add contact to client
     */
    public function addContact(Request $request, Client $client)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:50',
            'mobile' => 'nullable|string|max:50',
            'position' => 'nullable|string|max:100',
            'is_primary' => 'boolean',
            'is_billing_contact' => 'boolean',
            'notes' => 'nullable|string'
        ]);

        $validated['tenant_id'] = auth()->user()->tenant_id;

        // If setting as primary, unset other primary contacts
        if ($validated['is_primary'] ?? false) {
            $client->contacts()->update(['is_primary' => false]);
        }

        $contact = $client->contacts()->create($validated);

        return response()->json([
            'message' => 'Contact added successfully',
            'contact' => $contact
        ], 201);
    }

    /**
     * Generate unique client code
     */
    private function generateClientCode($name)
    {
        $prefix = strtoupper(substr(Str::slug($name), 0, 3));
        $count = Client::where('tenant_id', auth()->user()->tenant_id)
            ->where('code', 'like', $prefix . '%')
            ->count();

        return $prefix . str_pad($count + 1, 3, '0', STR_PAD_LEFT);
    }
}