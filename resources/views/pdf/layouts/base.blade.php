<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>@yield('title')</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'DejaVu Sans', sans-serif;
            font-size: 10pt;
            color: #333;
            line-height: 1.6;
        }

        .container {
            padding: 20px;
        }

        /* Header Styles */
        .header {
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #2563eb;
        }

        .header-content {
            display: table;
            width: 100%;
        }

        .header-left {
            display: table-cell;
            width: 50%;
            vertical-align: top;
        }

        .header-right {
            display: table-cell;
            width: 50%;
            text-align: right;
            vertical-align: top;
        }

        .company-name {
            font-size: 18pt;
            font-weight: bold;
            color: #2563eb;
            margin-bottom: 10px;
        }

        .company-info {
            font-size: 9pt;
            color: #666;
            line-height: 1.4;
        }

        .document-title {
            font-size: 24pt;
            font-weight: bold;
            color: #1e40af;
            margin-bottom: 5px;
        }

        .document-number {
            font-size: 12pt;
            color: #666;
        }

        /* Client Info */
        .client-info {
            margin: 30px 0;
            background-color: #f3f4f6;
            padding: 15px;
            border-radius: 5px;
        }

        .client-label {
            font-weight: bold;
            font-size: 11pt;
            margin-bottom: 10px;
            color: #2563eb;
        }

        .client-details {
            font-size: 10pt;
            line-height: 1.5;
        }

        /* Meta Info */
        .meta-info {
            display: table;
            width: 100%;
            margin: 20px 0;
        }

        .meta-left {
            display: table-cell;
            width: 50%;
        }

        .meta-right {
            display: table-cell;
            width: 50%;
            text-align: right;
        }

        .meta-item {
            margin-bottom: 5px;
        }

        .meta-label {
            font-weight: bold;
            color: #666;
        }

        /* Table Styles */
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }

        .items-table thead {
            background-color: #2563eb;
            color: white;
        }

        .items-table th {
            padding: 10px;
            text-align: left;
            font-weight: bold;
            font-size: 10pt;
        }

        .items-table td {
            padding: 10px;
            border-bottom: 1px solid #e5e7eb;
        }

        .items-table tbody tr:nth-child(even) {
            background-color: #f9fafb;
        }

        .text-right {
            text-align: right;
        }

        .text-center {
            text-align: center;
        }

        /* Totals Section */
        .totals {
            width: 300px;
            margin-left: auto;
            margin-top: 20px;
        }

        .totals-row {
            display: table;
            width: 100%;
            padding: 8px 0;
            border-bottom: 1px solid #e5e7eb;
        }

        .totals-row.total {
            background-color: #2563eb;
            color: white;
            font-weight: bold;
            font-size: 12pt;
            padding: 12px 10px;
            border-bottom: none;
        }

        .totals-label {
            display: table-cell;
            width: 60%;
            padding-left: 10px;
        }

        .totals-value {
            display: table-cell;
            width: 40%;
            text-align: right;
            padding-right: 10px;
        }

        /* Footer */
        .footer {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            height: 50px;
            text-align: center;
            font-size: 8pt;
            color: #999;
            padding: 15px 0;
            border-top: 1px solid #e5e7eb;
        }

        .footer-content {
            line-height: 1.4;
        }

        /* Notes Section */
        .notes {
            margin-top: 30px;
            padding: 15px;
            background-color: #fffbeb;
            border-left: 4px solid #f59e0b;
        }

        .notes-title {
            font-weight: bold;
            color: #f59e0b;
            margin-bottom: 5px;
        }

        .notes-content {
            font-size: 9pt;
            color: #78350f;
        }

        /* Payment Info */
        .payment-info {
            margin-top: 30px;
            padding: 15px;
            background-color: #ecfdf5;
            border-left: 4px solid #10b981;
        }

        .payment-title {
            font-weight: bold;
            color: #065f46;
            margin-bottom: 10px;
        }

        .payment-details {
            font-size: 9pt;
            color: #064e3b;
            line-height: 1.6;
        }

        /* Status Badge */
        .status-badge {
            display: inline-block;
            padding: 5px 15px;
            border-radius: 20px;
            font-weight: bold;
            font-size: 9pt;
            text-transform: uppercase;
        }

        .status-paid {
            background-color: #d1fae5;
            color: #065f46;
        }

        .status-unpaid {
            background-color: #fef3c7;
            color: #92400e;
        }

        .status-overdue {
            background-color: #fee2e2;
            color: #991b1b;
        }

        .status-draft {
            background-color: #e0e7ff;
            color: #3730a3;
        }

        .status-sent {
            background-color: #dbeafe;
            color: #1e40af;
        }

        /* NF525 Compliance */
        .compliance-info {
            margin-top: 30px;
            padding: 10px;
            background-color: #f3f4f6;
            border: 1px solid #d1d5db;
            font-size: 8pt;
            color: #6b7280;
        }

        .compliance-title {
            font-weight: bold;
            margin-bottom: 5px;
        }

        .hash-value {
            font-family: 'Courier New', monospace;
            font-size: 7pt;
            word-break: break-all;
        }

        /* Page Break */
        .page-break {
            page-break-after: always;
        }
    </style>
</head>
<body>
    <div class="container">
        @yield('content')
    </div>

    <div class="footer">
        <div class="footer-content">
            @yield('footer')
        </div>
    </div>
</body>
</html>
