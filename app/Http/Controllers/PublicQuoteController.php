<?php

namespace App\Http\Controllers;

use App\Models\Quote;
use App\Models\ClientContact;
use App\Mail\QuoteAccepted;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class PublicQuoteController extends Controller
{
    /**
     * Display the quote signature page (public route, no auth required)
     */
    public function show($token)
    {
        $quote = Quote::where('signature_token', $token)
            ->with(['client', 'items', 'tenant'])
            ->firstOrFail();

        // Check if quote is already accepted or cancelled
        if ($quote->status === 'accepted') {
            return view('public.quote-already-signed', compact('quote'));
        }

        if ($quote->status === 'cancelled' || $quote->cancelled_at) {
            return view('public.quote-cancelled', compact('quote'));
        }

        // Only allow signing if status is 'sent'
        if ($quote->status !== 'sent') {
            abort(403, 'This quote cannot be signed at this time.');
        }

        return view('public.quote-signature', compact('quote'));
    }

    /**
     * Process the quote signature (public route, no auth required)
     */
    public function sign(Request $request, $token)
    {
        $validator = Validator::make($request->all(), [
            'signature_data' => 'required|string',
            'signer_name' => 'required|string|max:255',
            'signer_email' => 'nullable|email|max:255',
            'signer_position' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        $quote = Quote::where('signature_token', $token)
            ->with(['client', 'tenant'])
            ->firstOrFail();

        // Check if quote can be signed
        if ($quote->status !== 'sent') {
            return response()->json([
                'success' => false,
                'message' => 'This quote cannot be signed. Current status: ' . $quote->status
            ], 403);
        }

        if ($quote->cancelled_at) {
            return response()->json([
                'success' => false,
                'message' => 'This quote has been cancelled.'
            ], 403);
        }

        // Save signature as file for PDF generation
        $signatureData = $request->signature_data;
        $signatureImage = str_replace('data:image/png;base64,', '', $signatureData);
        $signatureImage = str_replace(' ', '+', $signatureImage);
        $signatureFileName = 'signatures/quote_' . $quote->id . '_' . time() . '.png';
        Storage::disk('local')->put($signatureFileName, base64_decode($signatureImage));

        // Update quote with signature data
        $quote->update([
            'status' => 'accepted',
            'accepted_at' => now(),
            'signature_data' => $request->signature_data,
            'signature_path' => $signatureFileName,
            'signer_name' => $request->signer_name,
            'signatory_name' => $request->signer_name, // For backward compatibility
            'signer_email' => $request->signer_email,
            'signer_position' => $request->signer_position,
            'signature_ip' => $request->ip(),
            'signature_user_agent' => $request->userAgent(),
        ]);

        // Send acceptance notification to tenant
        try {
            $primaryContact = ClientContact::where('client_id', $quote->client_id)
                ->where('is_primary', true)
                ->first();

            if ($primaryContact) {
                Mail::to($quote->tenant->email)
                    ->send(new QuoteAccepted($quote, $primaryContact));
            }
        } catch (\Exception $e) {
            // Log error but don't fail the signature
            \Log::error('Failed to send quote acceptance email: ' . $e->getMessage());
        }

        return response()->json([
            'success' => true,
            'message' => 'Quote signed successfully!',
            'quote' => [
                'id' => $quote->id,
                'quote_number' => $quote->quote_number,
                'status' => $quote->status,
                'accepted_at' => $quote->accepted_at,
            ]
        ]);
    }
}
