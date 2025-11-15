<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\PublicQuoteController;

// Redirect root to login
Route::get('/', function () {
    return redirect('/login');
})->name('home');

// Marketing pages
Route::get('/pricing', function () {
    return view('pricing');
})->name('pricing');

Route::get('/contact', function () {
    return view('contact');
})->name('contact');

Route::get('/support', function () {
    return view('support');
})->name('support');

Route::get('/about', function () {
    return view('about');
})->name('about');

Route::get('/documentation', function () {
    return view('documentation');
})->name('documentation');

Route::get('/terms', function () {
    return view('terms');
})->name('terms');

Route::get('/privacy', function () {
    return view('privacy');
})->name('privacy');

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
