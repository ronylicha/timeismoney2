<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\PublicQuoteController;

// Landing page - serve static HTML
Route::get('/', function () {
    return response()->file(public_path('index.html'));
});

// Serve PWA manifest with no-cache headers
Route::get('/app-manifest-v3.json', function () {
    $manifestPath = public_path('app-manifest-v3.json');

    if (!file_exists($manifestPath)) {
        abort(404);
    }

    return response()
        ->file($manifestPath, [
            'Content-Type' => 'application/manifest+json',
            'Cache-Control' => 'no-store, no-cache, must-revalidate, max-age=0',
            'Pragma' => 'no-cache',
            'Expires' => '0'
        ]);
});

// Public quote signature routes (no auth required)
Route::prefix('quote/sign')->group(function () {
    Route::get('/{token}', [PublicQuoteController::class, 'show'])->name('quote.public.show');
    Route::post('/{token}', [PublicQuoteController::class, 'sign'])->name('quote.public.sign');
});

// Catch-all route for React SPA (except root and public routes)
Route::get('/{path}', function () {
    return view('app');
})->where('path', '(?!quote/sign).*');
