<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">

    <!-- PWA Meta Tags -->
    <meta name="theme-color" content="#3B82F6">
    <meta name="description" content="Time Is Money 2 - Gestion du temps et facturation professionnelle">

    <!-- Apple PWA Meta Tags -->
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="default">
    <meta name="apple-mobile-web-app-title" content="TIM2">

    <title>{{ config('app.name', 'Time Is Money 2') }}</title>

    <!-- PWA Manifest -->
    <link rel="manifest" href="/manifest.json">

    <!-- PWA Icons -->
    <link rel="icon" type="image/png" sizes="32x32" href="/images/icons/icon-32x32.png">
    <link rel="icon" type="image/png" sizes="16x16" href="/images/icons/icon-16x16.png">
    <link rel="apple-touch-icon" href="/images/icons/icon-192x192.png">

    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.bunny.net">
    <link href="https://fonts.bunny.net/css?family=inter:400,500,600,700" rel="stylesheet" />

    <!-- Scripts -->
    @viteReactRefresh
    @vite(['resources/css/app.css', 'resources/js/app.tsx'])
</head>
<body class="font-sans antialiased">
    <div id="app"></div>
</body>
</html>