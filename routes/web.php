<?php

use Illuminate\Support\Facades\Route;

// Landing page - serve static HTML
Route::get('/', function () {
    return response()->file(public_path('index.html'));
});

// Catch-all route for React SPA (except root)
Route::get('/{path}', function () {
    return view('app');
})->where('path', '.*');
