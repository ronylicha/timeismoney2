<?php

use Illuminate\Support\Facades\Route;

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

// Catch-all route for React SPA (except root)
Route::get('/{path}', function () {
    return view('app');
})->where('path', '.*');
