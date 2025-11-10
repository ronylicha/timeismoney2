<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>{{ $title ?? 'Export' }}</title>
    <style>
        table {
            border-collapse: collapse;
            width: 100%;
            font-family: Arial, sans-serif;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
        }
        th {
            background-color: #f2f2f2;
            font-weight: bold;
        }
        tfoot tr {
            background-color: #f9f9f9;
            font-weight: bold;
        }
    </style>
</head>
<body>
    @if(isset($title))
        <h1>{{ $title }}</h1>
    @endif
    
    @if(isset($period))
        <p><strong>Période :</strong> {{ $period }}</p>
    @endif
    
    @yield('content')
</body>
</html>