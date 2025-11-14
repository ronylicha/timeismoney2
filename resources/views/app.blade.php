<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <!-- iOS Safari viewport meta for better PWA experience -->
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes, viewport-fit=cover">
    <meta name="csrf-token" content="{{ csrf_token() }}">

    <!-- PWA Meta Tags -->
    <meta name="theme-color" content="#3B82F6">
    <meta name="description" content="Time Is Money - Gestion du temps et facturation professionnelle">

    <!-- Apple PWA Meta Tags -->
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="apple-mobile-web-app-title" content="TIM2">

    <!-- Disable automatic detection of possible phone numbers -->
    <meta name="format-detection" content="telephone=no">

    <title>{{ config('app.name', 'Time Is Money') }}</title>

    <!-- PWA Manifest -->
    <link rel="manifest" href="/manifest.json" crossorigin="use-credentials">

    <!-- PWA Icons -->
    <link rel="icon" type="image/png" sizes="32x32" href="/images/icons/icon-32x32.png">
    <link rel="icon" type="image/png" sizes="16x16" href="/images/icons/icon-16x16.png">

    <!-- Apple Touch Icons - Multiple sizes for better iOS support -->
    <link rel="apple-touch-icon" href="/images/icons/icon-192x192.png">
    <link rel="apple-touch-icon" sizes="120x120" href="/images/icons/icon-192x192.png">
    <link rel="apple-touch-icon" sizes="152x152" href="/images/icons/icon-192x192.png">
    <link rel="apple-touch-icon" sizes="167x167" href="/images/icons/icon-192x192.png">
    <link rel="apple-touch-icon" sizes="180x180" href="/images/icons/icon-192x192.png">

    <!-- Apple Splash Screens - For better PWA experience on iOS -->
    <meta name="apple-mobile-web-app-capable" content="yes">

    <!-- iOS Safari status bar appearance -->
    <meta name="theme-color" content="#3B82F6" media="(prefers-color-scheme: light)">
    <meta name="theme-color" content="#1E40AF" media="(prefers-color-scheme: dark)">

    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.bunny.net">
    <link href="https://fonts.bunny.net/css?family=inter:400,500,600,700" rel="stylesheet" />

    <!-- Scripts -->
    @viteReactRefresh
    @vite(['resources/css/app.css', 'resources/js/index.tsx'])
</head>
<body class="font-sans antialiased">
    <div id="app"></div>
</body>
</html>