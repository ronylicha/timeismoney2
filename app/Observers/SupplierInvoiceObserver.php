<?php

namespace App\Observers;

use App\Models\SupplierInvoice;
use App\Models\User;
use App\Notifications\SupplierInvoiceReceived;
use Illuminate\Support\Facades\Log;

/**
 * Observer pour les SupplierInvoices
 * 
 * Notifications lors de la réception de factures fournisseurs
 */
class SupplierInvoiceObserver
{
    /**
     * Handle the SupplierInvoice "created" event.
     */
    public function created(SupplierInvoice $supplierInvoice): void
    {
        // Notifier la réception de la facture fournisseur
        $this->handleSupplierInvoiceReceived($supplierInvoice);
    }

    /**
     * Handle the SupplierInvoice "updated" event.
     */
    public function updated(SupplierInvoice $supplierInvoice): void
    {
        //
    }

    /**
     * Handle the SupplierInvoice "deleted" event.
     */
    public function deleted(SupplierInvoice $supplierInvoice): void
    {
        //
    }

    /**
     * Handle the SupplierInvoice "restored" event.
     */
    public function restored(SupplierInvoice $supplierInvoice): void
    {
        //
    }

    /**
     * Handle the SupplierInvoice "force deleted" event.
     */
    public function forceDeleted(SupplierInvoice $supplierInvoice): void
    {
        //
    }

    /**
     * Gère la réception d'une facture fournisseur
     * - Notifications aux utilisateurs
     */
    private function handleSupplierInvoiceReceived(SupplierInvoice $supplierInvoice): void
    {
        try {
            Log::info('Supplier invoice received', [
                'supplier_invoice_id' => $supplierInvoice->id,
                'invoice_number' => $supplierInvoice->invoice_number,
                'supplier_id' => $supplierInvoice->supplier_id,
                'amount' => $supplierInvoice->total_ttc
            ]);

            // Envoyer les notifications aux utilisateurs du tenant
            $this->sendSupplierInvoiceNotifications($supplierInvoice);

        } catch (\Exception $e) {
            Log::error('Failed to process supplier invoice', [
                'supplier_invoice_id' => $supplierInvoice->id,
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * Envoyer les notifications de facture fournisseur reçue
     */
    private function sendSupplierInvoiceNotifications(SupplierInvoice $supplierInvoice): void
    {
        try {
            $tenant = $supplierInvoice->tenant;
            
            // Récupérer tous les utilisateurs du tenant qui peuvent voir les factures fournisseurs
            $users = User::where('tenant_id', $tenant->id)
                ->where(function($query) {
                    $query->whereHas('roles', function($q) {
                        $q->whereIn('name', ['admin', 'super_admin']);
                    })->orWhereDoesntHave('roles'); // Utilisateurs sans rôle spécifique
                })
                ->get();

            foreach ($users as $user) {
                try {
                    $user->notify(new SupplierInvoiceReceived($supplierInvoice));
                    Log::info('Supplier invoice notification sent', [
                        'supplier_invoice_id' => $supplierInvoice->id,
                        'user_id' => $user->id,
                        'user_email' => $user->email
                    ]);
                } catch (\Exception $notificationError) {
                    Log::error('Failed to send supplier invoice notification', [
                        'supplier_invoice_id' => $supplierInvoice->id,
                        'user_id' => $user->id,
                        'error' => $notificationError->getMessage()
                    ]);
                }
            }

        } catch (\Exception $e) {
            Log::error('Failed to get users for supplier invoice notifications', [
                'supplier_invoice_id' => $supplierInvoice->id,
                'error' => $e->getMessage()
            ]);
        }
    }
}