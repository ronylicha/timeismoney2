<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

/**
 * Contrôleur pour gérer les types de factures françaises
 * (acomptes, solde, avoirs) conformément à la réglementation
 */
class InvoiceTypeController extends Controller
{
    /**
     * Récupère les factures d'acompte disponibles pour un client
     * (non encore liées à une facture de solde)
     *
     * @param string $clientId
     * @return JsonResponse
     */
    public function getAvailableAdvances(string $clientId): JsonResponse
    {
        // Récupérer toutes les factures d'acompte du client
        // qui ne sont pas encore liées à une facture de solde
        $availableAdvances = Invoice::where('client_id', $clientId)
            ->where('type', 'advance')
            ->whereDoesntHave('finalInvoice') // N'a pas de relation avec une facture de solde
            ->with('client:id,name,email')
            ->orderBy('date', 'desc')
            ->get(['id', 'invoice_number', 'date', 'total', 'advance_percentage', 'status', 'client_id']);

        return response()->json($availableAdvances);
    }

    /**
     * Crée une facture de solde avec liaison aux acomptes sélectionnés
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function createFinalInvoice(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'client_id' => 'required|exists:clients,id',
            'date' => 'required|date',
            'due_date' => 'required|date|after_or_equal:date',
            'items' => 'required|array|min:1',
            'items.*.description' => 'required|string',
            'items.*.quantity' => 'required|numeric|min:0',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.tax_rate' => 'nullable|numeric|min:0|max:100',
            'advance_ids' => 'nullable|array',
            'advance_ids.*' => 'exists:invoices,id',
            'subtotal' => 'required|numeric|min:0',
            'tax_amount' => 'required|numeric|min:0',
            'total' => 'required|numeric|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Erreur de validation',
                'errors' => $validator->errors()
            ], 422);
        }

        DB::beginTransaction();
        try {
            // Vérifier que les acomptes appartiennent bien au même client
            if ($request->has('advance_ids') && count($request->advance_ids) > 0) {
                $invalidAdvances = Invoice::whereIn('id', $request->advance_ids)
                    ->where(function ($query) use ($request) {
                        $query->where('client_id', '!=', $request->client_id)
                            ->orWhere('type', '!=', 'advance')
                            ->orWhereHas('finalInvoice'); // Déjà lié à une facture de solde
                    })
                    ->exists();

                if ($invalidAdvances) {
                    return response()->json([
                        'message' => 'Certains acomptes sélectionnés sont invalides ou déjà liés à une autre facture de solde.'
                    ], 422);
                }

                // Vérifier la cohérence des acomptes avec le montant total du projet
                $totalAdvances = Invoice::whereIn('id', $request->advance_ids)
                    ->sum('total');

                // Le montant total de la facture de solde doit être >= au total des acomptes
                // Car la facture de solde représente le montant TOTAL du projet
                // Exemple: Projet 20k€, Acomptes 12k€, Facture de solde = 20k€ (solde à payer: 8k€)
                if ($totalAdvances > $request->total) {
                    return response()->json([
                        'message' => 'Le montant total de la facture de solde doit être au moins égal au total des acomptes. ' .
                                   'La facture de solde doit représenter le montant TOTAL du projet (acomptes + solde). ' .
                                   'Total des acomptes: ' . number_format($totalAdvances, 2) . '€, ' .
                                   'Montant minimum requis: ' . number_format($totalAdvances, 2) . '€'
                    ], 422);
                }
                
                // Calculer le solde restant pour information
                $remainingBalance = $request->total - $totalAdvances;
                
                // Avertir si le solde est négatif ou nul (pas une erreur bloquante, juste une info)
                if ($remainingBalance <= 0) {
                    \Log::warning('Facture de solde créée avec solde nul ou négatif', [
                        'total_facture' => $request->total,
                        'total_acomptes' => $totalAdvances,
                        'solde' => $remainingBalance
                    ]);
                }
            }

            // Générer le numéro de facture
            $tenant = auth()->user()->tenant;
            $tenant->checkVatThreshold(); // Auto-check and apply VAT if threshold exceeded
            $tenant_id = $tenant->id;
            $defaultTaxRate = $tenant->fresh()->getDefaultTaxRate();
            
            $lastInvoice = Invoice::where('tenant_id', $tenant_id)
                ->orderBy('sequence_number', 'desc')
                ->first();

            $sequenceNumber = $lastInvoice ? $lastInvoice->sequence_number + 1 : 1;
            $invoiceNumber = 'FS-' . date('Y') . '-' . str_pad($sequenceNumber, 5, '0', STR_PAD_LEFT);

            // Calculer le solde restant après déduction des acomptes
            $totalAdvancesAmount = 0;
            if ($request->has('advance_ids') && count($request->advance_ids) > 0) {
                $totalAdvancesAmount = Invoice::whereIn('id', $request->advance_ids)
                    ->sum('total');
            }
            $balanceDue = $request->total - $totalAdvancesAmount;

            // Créer la facture de solde
            $invoice = Invoice::create([
                'tenant_id' => $tenant_id,
                'created_by' => auth()->id(),
                'client_id' => $request->client_id,
                'invoice_number' => $invoiceNumber,
                'sequence_number' => $sequenceNumber,
                'date' => $request->date,
                'due_date' => $request->due_date,
                'type' => 'final',
                'status' => $request->status ?? 'draft',
                'subtotal' => $request->subtotal,
                'tax_amount' => $request->tax_amount,
                'total' => $request->total,
                'balance_due' => $balanceDue, // Solde = Total - Acomptes
                'amount_paid' => $totalAdvancesAmount, // Montant déjà payé via acomptes
                'currency' => 'EUR',
                'payment_terms' => $request->payment_terms ?? 30,
                'notes' => $request->notes,
                'legal_mentions' => $request->legal_mentions,
                'payment_conditions' => $request->payment_conditions ?? 'Paiement à réception de facture',
                'late_payment_penalty_rate' => 19.59, // 3× taux légal 2025
                'recovery_indemnity' => 40.00, // Obligatoire en France
            ]);

            // Créer les items de la facture
            foreach ($request->items as $position => $itemData) {
                $subtotal = $itemData['quantity'] * $itemData['unit_price'];
                $taxRate = $itemData['tax_rate'] ?? $defaultTaxRate;
                $taxAmount = $subtotal * ($taxRate / 100);
                
                $invoice->items()->create([
                    'type' => 'service',
                    'description' => $itemData['description'],
                    'quantity' => $itemData['quantity'],
                    'unit_price' => $itemData['unit_price'],
                    'tax_rate' => $taxRate,
                    'subtotal' => $subtotal,
                    'tax_amount' => $taxAmount,
                    'total' => $subtotal + $taxAmount,
                    'position' => $position,
                ]);
            }

            // Lier les acomptes sélectionnés
            if ($request->has('advance_ids') && count($request->advance_ids) > 0) {
                $advancesData = [];
                $advances = Invoice::whereIn('id', $request->advance_ids)->get();

                foreach ($advances as $advance) {
                    $advancesData[$advance->id] = [
                        'advance_amount' => $advance->total,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ];
                }

                $invoice->advances()->attach($advancesData);
            }

            // Charger les relations pour la réponse
            $invoice->load(['client', 'items', 'advances']);

            // Calculer les totaux (via les accessors du modèle)
            $invoice->total_advances = $invoice->total_advances;
            $invoice->remaining_balance = $invoice->remaining_balance;

            DB::commit();

            return response()->json([
                'message' => 'Facture de solde créée avec succès',
                'invoice' => $invoice
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'message' => 'Erreur lors de la création de la facture de solde',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Crée une facture d'acompte
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function createAdvanceInvoice(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'client_id' => 'required|exists:clients,id',
            'date' => 'required|date',
            'due_date' => 'required|date|after_or_equal:date',
            'advance_percentage' => 'required|numeric|min:0|max:100',
            'items' => 'required|array|min:1',
            'items.*.description' => 'required|string',
            'items.*.quantity' => 'required|numeric|min:0',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.tax_rate' => 'nullable|numeric|min:0|max:100',
            'subtotal' => 'required|numeric|min:0',
            'tax_amount' => 'required|numeric|min:0',
            'total' => 'required|numeric|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Erreur de validation',
                'errors' => $validator->errors()
            ], 422);
        }

        DB::beginTransaction();
        try {
            // Générer le numéro de facture
            $tenant = auth()->user()->tenant;
            $tenant->checkVatThreshold(); // Auto-check and apply VAT if threshold exceeded
            $tenant_id = $tenant->id;
            $defaultTaxRate = $tenant->fresh()->getDefaultTaxRate();
            
            $lastInvoice = Invoice::where('tenant_id', $tenant_id)
                ->orderBy('sequence_number', 'desc')
                ->first();

            $sequenceNumber = $lastInvoice ? $lastInvoice->sequence_number + 1 : 1;
            $invoiceNumber = 'FA-' . date('Y') . '-' . str_pad($sequenceNumber, 5, '0', STR_PAD_LEFT);

            // Créer la facture d'acompte
            $invoice = Invoice::create([
                'tenant_id' => $tenant_id,
                'created_by' => auth()->id(),
                'client_id' => $request->client_id,
                'invoice_number' => $invoiceNumber,
                'sequence_number' => $sequenceNumber,
                'date' => $request->date,
                'due_date' => $request->due_date,
                'type' => 'advance',
                'advance_percentage' => $request->advance_percentage,
                'status' => $request->status ?? 'draft',
                'subtotal' => $request->subtotal,
                'tax_amount' => $request->tax_amount,
                'total' => $request->total,
                'balance_due' => $request->total,
                'currency' => 'EUR',
                'payment_terms' => $request->payment_terms ?? 30,
                'notes' => $request->notes,
                'legal_mentions' => $request->legal_mentions,
                'payment_conditions' => $request->payment_conditions ?? 'Paiement à réception de facture',
                'late_payment_penalty_rate' => 19.59,
                'recovery_indemnity' => 40.00,
            ]);

            // Créer les items de la facture
            foreach ($request->items as $position => $itemData) {
                $subtotal = $itemData['quantity'] * $itemData['unit_price'];
                $taxRate = $itemData['tax_rate'] ?? $defaultTaxRate;
                $taxAmount = $subtotal * ($taxRate / 100);
                
                $invoice->items()->create([
                    'type' => 'service',
                    'description' => $itemData['description'],
                    'quantity' => $itemData['quantity'],
                    'unit_price' => $itemData['unit_price'],
                    'tax_rate' => $taxRate,
                    'subtotal' => $subtotal,
                    'tax_amount' => $taxAmount,
                    'total' => $subtotal + $taxAmount,
                    'position' => $position,
                ]);
            }

            // Charger les relations pour la réponse
            $invoice->load(['client', 'items']);

            DB::commit();

            return response()->json([
                'message' => 'Facture d\'acompte créée avec succès',
                'invoice' => $invoice
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'message' => 'Erreur lors de la création de la facture d\'acompte',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Récupère les statistiques des acomptes pour un client
     *
     * @param string $clientId
     * @return JsonResponse
     */
    public function getAdvanceStats(string $clientId): JsonResponse
    {
        $stats = [
            'total_advances' => Invoice::where('client_id', $clientId)
                ->where('type', 'advance')
                ->count(),
            'available_advances' => Invoice::where('client_id', $clientId)
                ->where('type', 'advance')
                ->whereDoesntHave('finalInvoice')
                ->count(),
            'linked_advances' => Invoice::where('client_id', $clientId)
                ->where('type', 'advance')
                ->whereHas('finalInvoice')
                ->count(),
            'total_advance_amount' => Invoice::where('client_id', $clientId)
                ->where('type', 'advance')
                ->sum('total'),
            'available_advance_amount' => Invoice::where('client_id', $clientId)
                ->where('type', 'advance')
                ->whereDoesntHave('finalInvoice')
                ->sum('total'),
        ];

        return response()->json($stats);
    }
}
