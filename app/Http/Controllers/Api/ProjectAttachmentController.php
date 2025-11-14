<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attachment;
use App\Models\Project;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ProjectAttachmentController extends Controller
{
    public function index(Project $project)
    {
        $this->authorizeAccess($project);

        return $project->attachments()
            ->with('user:id,name,email')
            ->latest()
            ->get();
    }

    public function store(Request $request, Project $project)
    {
        $this->authorizeAccess($project);

        $request->validate([
            'file' => 'required|file|max:10240', // 10MB
        ]);

        $file = $request->file('file');
        $filename = time() . '_' . Str::slug(pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME));
        $extension = $file->getClientOriginalExtension();

        $storedFilename = "{$filename}.{$extension}";
        $path = $file->storeAs("attachments/projects/{$project->id}", $storedFilename, 'private');

        $attachment = $project->attachments()->create([
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

    public function download(Project $project, Attachment $attachment)
    {
        $this->authorizeAttachment($project, $attachment);

        if (!Storage::disk('private')->exists($attachment->path)) {
            return response()->json(['message' => 'Fichier introuvable'], 404);
        }

        return Storage::disk('private')->download($attachment->path, $attachment->original_filename);
    }

    public function destroy(Project $project, Attachment $attachment)
    {
        $this->authorizeAttachment($project, $attachment);

        if ($attachment->user_id !== auth()->id()) {
            return response()->json(['message' => 'Non autorisé'], 403);
        }

        Storage::disk('private')->delete($attachment->path);
        $attachment->delete();

        return response()->json(['message' => 'Pièce jointe supprimée']);
    }

    protected function authorizeAccess(Project $project): void
    {
        if ($project->tenant_id !== auth()->user()->tenant_id) {
            abort(403, 'Non autorisé');
        }

        if (auth()->user()->can('view_all_projects')) {
            return;
        }

        $isMember = $project->users()
            ->where('user_id', auth()->id())
            ->exists();

        if (!$isMember) {
            abort(403, 'Non autorisé');
        }
    }

    protected function authorizeAttachment(Project $project, Attachment $attachment): void
    {
        $this->authorizeAccess($project);

        if ($attachment->attachable_type !== Project::class || $attachment->attachable_id !== $project->id) {
            abort(404, 'Pièce jointe introuvable');
        }
    }
}
