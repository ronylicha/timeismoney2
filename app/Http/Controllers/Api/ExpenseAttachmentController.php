<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attachment;
use App\Models\Expense;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ExpenseAttachmentController extends Controller
{
    public function index(Expense $expense)
    {
        $this->authorizeAccess($expense);

        return $expense->attachments()
            ->with('user:id,name,email')
            ->latest()
            ->get();
    }

    public function store(Request $request, Expense $expense)
    {
        $this->authorizeAccess($expense);

        $request->validate([
            'file' => 'required|file|max:10240', // 10MB
        ]);

        $file = $request->file('file');
        $filename = time() . '_' . Str::slug(pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME));
        $extension = $file->getClientOriginalExtension();

        $storedFilename = "{$filename}.{$extension}";
        $path = $file->storeAs("attachments/expenses/{$expense->id}", $storedFilename, 'private');

        $attachment = $expense->attachments()->create([
            'tenant_id' => auth()->user()->tenant_id,
            'user_id' => auth()->id(),
            'filename' => $storedFilename,
            'original_filename' => $file->getClientOriginalName(),
            'mime_type' => $file->getMimeType(),
            'size' => $file->getSize(),
            'path' => $path,
            'disk' => 'private',
        ]);

        return $attachment->load('user:id,name,email');
    }

    public function download(Expense $expense, Attachment $attachment)
    {
        $this->authorizeAttachment($expense, $attachment);

        if (!Storage::disk('private')->exists($attachment->path)) {
            return response()->json(['message' => 'Fichier introuvable'], 404);
        }

        return Storage::disk('private')->download($attachment->path, $attachment->original_filename);
    }

    public function destroy(Expense $expense, Attachment $attachment)
    {
        $this->authorizeAttachment($expense, $attachment);

        if ($attachment->user_id !== auth()->id()) {
            return response()->json(['message' => 'Non autorisé'], 403);
        }

        Storage::disk('private')->delete($attachment->path);
        $attachment->delete();

        return response()->json(['message' => 'Pièce jointe supprimée']);
    }

    protected function authorizeAccess(Expense $expense): void
    {
        if ($expense->tenant_id !== auth()->user()->tenant_id) {
            abort(403, 'Non autorisé');
        }
    }

    protected function authorizeAttachment(Expense $expense, Attachment $attachment): void
    {
        $this->authorizeAccess($expense);

        if ($attachment->attachable_type !== Expense::class || $attachment->attachable_id !== $expense->id) {
            abort(404, 'Pièce jointe introuvable');
        }
    }
}
