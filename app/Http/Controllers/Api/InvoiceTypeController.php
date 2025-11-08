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
            ->orderBy('invoice_date', 'desc')
            ->get(['id', 'invoice_number', 'invoice_date', 'total', 'advance_percentage', 'payment_status', 'client_id']);

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
            'invoice_date' => 'required|date',
            'due_date' => 'required|date|after_or_equal:invoice_date',
            'items' => 'required|array|min:1',
            'items.*.description' => 'required|string',
            'items.*.quantity' => 'required|numeric|min:0',
            'items.*.unit_price' => 'required|numeric|min:0',
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

                // Vérifier que le total des acomptes ne dépasse pas le total de la facture
                $totalAdvances = Invoice::whereIn('id', $request->advance_ids)
                    ->sum('total');

                if ($totalAdvances > $request->total) {
                    return response()->json([
                        'message' => 'Le total des acomptes sélectionnés dépasse le montant total de la facture de solde.'
                    ], 422);
                }
            }

            // Générer le numéro de facture
            $tenant_id = auth()->user()->tenant_id;
            $lastInvoice = Invoice::where('tenant_id', $tenant_id)
                ->orderBy('sequential_number', 'desc')
                ->first();

            $sequentialNumber = $lastInvoice ? $lastInvoice->sequential_number + 1 : 1;
            $invoiceNumber = 'FS-' . date('Y') . '-' . str_pad($sequentialNumber, 5, '0', STR_PAD_LEFT);

            // Créer la facture de solde
            $invoice = Invoice::create([
                'tenant_id' => $tenant_id,
                'client_id' => $request->client_id,
                'invoice_number' => $invoiceNumber,
                'sequential_number' => $sequentialNumber,
                'invoice_date' => $request->invoice_date,
                'due_date' => $request->due_date,
                'type' => 'final',
                'status' => 'draft',
                'payment_status' => 'unpaid',
                'subtotal' => $request->subtotal,
                'tax_rate' => $request->tax_rate ?? 20,
                'tax_amount' => $request->tax_amount,
                'total' => $request->total,
                'currency' => 'EUR',
                'notes' => $request->notes,
                'legal_mentions' => $request->legal_mentions,
                'payment_conditions' => $request->payment_conditions ?? 'Paiement à réception de facture',
                'late_payment_penalty_rate' => 19.59, // 3× taux légal 2025
                'recovery_indemnity' => 40.00, // Obligatoire en France
            ]);

            // Créer les items de la facture
            foreach ($request->items as $position => $itemData) {
                $invoice->items()->create([
                    'type' => 'service',
                    'description' => $itemData['description'],
                    'quantity' => $itemData['quantity'],
                    'unit_price' => $itemData['unit_price'],
                    'tax_rate' => $itemData['tax_rate'] ?? 20,
                    'total' => $itemData['quantity'] * $itemData['unit_price'],
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
            'invoice_date' => 'required|date',
            'due_date' => 'required|date|after_or_equal:invoice_date',
            'advance_percentage' => 'required|numeric|min:0|max:100',
            'items' => 'required|array|min:1',
            'items.*.description' => 'required|string',
            'items.*.quantity' => 'required|numeric|min:0',
            'items.*.unit_price' => 'required|numeric|min:0',
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
            $tenant_id = auth()->user()->tenant_id;
            $lastInvoice = Invoice::where('tenant_id', $tenant_id)
                ->orderBy('sequential_number', 'desc')
                ->first();

            $sequentialNumber = $lastInvoice ? $lastInvoice->sequential_number + 1 : 1;
            $invoiceNumber = 'FA-' . date('Y') . '-' . str_pad($sequentialNumber, 5, '0', STR_PAD_LEFT);

            // Créer la facture d'acompte
            $invoice = Invoice::create([
                'tenant_id' => $tenant_id,
                'client_id' => $request->client_id,
                'invoice_number' => $invoiceNumber,
                'sequential_number' => $sequentialNumber,
                'invoice_date' => $request->invoice_date,
                'due_date' => $request->due_date,
                'type' => 'advance',
                'advance_percentage' => $request->advance_percentage,
                'status' => 'draft',
                'payment_status' => 'unpaid',
                'subtotal' => $request->subtotal,
                'tax_rate' => $request->tax_rate ?? 20,
                'tax_amount' => $request->tax_amount,
                'total' => $request->total,
                'currency' => 'EUR',
                'notes' => $request->notes,
                'legal_mentions' => $request->legal_mentions,
                'payment_conditions' => $request->payment_conditions ?? 'Paiement à réception de facture',
                'late_payment_penalty_rate' => 19.59,
                'recovery_indemnity' => 40.00,
            ]);

            // Créer les items de la facture
            foreach ($request->items as $position => $itemData) {
                $invoice->items()->create([
                    'type' => 'service',
                    'description' => $itemData['description'],
                    'quantity' => $itemData['quantity'],
                    'unit_price' => $itemData['unit_price'],
                    'tax_rate' => $itemData['tax_rate'] ?? 20,
                    'total' => $itemData['quantity'] * $itemData['unit_price'],
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
