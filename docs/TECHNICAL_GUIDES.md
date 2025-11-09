# TimeIsMoney2 - Technical Guides & References

**Version:** 2.0  
**Last Updated:** 2025-11-09

## 🤖 AI Agent Development Guide

### Overview
TimeIsMoney2 uses AI agents for specialized tasks like code analysis, documentation generation, and automated testing.

### Available Agents

#### 1. Code Review Agent
```typescript
// Usage for code review
const codeReviewAgent = {
  description: "Reviews code for quality, security, and best practices",
  capabilities: [
    "Code quality analysis",
    "Security vulnerability detection", 
    "Performance optimization suggestions",
    "Best practices compliance"
  ]
};

// Example usage
await reviewCode('path/to/file.ts', {
  focus: ['security', 'performance'],
  strict: true
});
```

#### 2. Documentation Agent
```typescript
// Usage for documentation generation
const docsAgent = {
  description: "Generates and maintains technical documentation",
  capabilities: [
    "API documentation generation",
    "Code documentation",
    "User guide creation",
    "Changelog generation"
  ]
};
```

#### 3. Testing Agent
```typescript
// Usage for automated test generation
const testingAgent = {
  description: "Creates comprehensive test suites",
  capabilities: [
    "Unit test generation",
    "Integration test creation",
    "E2E test scenarios",
    "Test data generation"
  ]
};
```

### Agent Configuration
```typescript
// config/agents.ts
export const agentConfig = {
  codeReviewer: {
    strict: true,
    frameworks: ['laravel', 'react', 'typescript'],
    rules: 'strict',
    output: 'detailed'
  },
  documenter: {
    format: 'markdown',
    includeExamples: true,
    targetAudience: 'developers'
  }
};
```

## 📊 Dashboard Widget Development

### Widget Architecture
```typescript
interface DashboardWidget {
  id: string;
  name: string;
  component: React.ComponentType<WidgetProps>;
  defaultSize: { w: number; h: number };
  minSize: { w: number; h: number };
  maxSize: { w: number; h: number };
  category: 'time' | 'financial' | 'project' | 'custom';
  permissions: string[];
}
```

### Creating Custom Widgets

#### 1. Widget Component
```typescript
// widgets/CustomTimerWidget.tsx
import React from 'react';
import { useTimer } from '@/hooks/useTimer';

interface CustomTimerWidgetProps {
  settings: WidgetSettings;
  onSettingsChange: (settings: WidgetSettings) => void;
}

export const CustomTimerWidget: React.FC<CustomTimerWidgetProps> = ({
  settings,
  onSettingsChange
}) => {
  const { isRunning, elapsedTime, startTimer, stopTimer } = useTimer();
  
  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-2">Timer</h3>
      <div className="text-2xl font-mono">
        {formatTime(elapsedTime)}
      </div>
      <div className="mt-4 space-x-2">
        <button
          onClick={startTimer}
          disabled={isRunning}
          className="px-4 py-2 bg-green-500 text-white rounded"
        >
          Start
        </button>
        <button
          onClick={stopTimer}
          disabled={!isRunning}
          className="px-4 py-2 bg-red-500 text-white rounded"
        >
          Stop
        </button>
      </div>
    </div>
  );
};
```

#### 2. Widget Registration
```typescript
// widgets/index.ts
export const availableWidgets: DashboardWidget[] = [
  {
    id: 'custom-timer',
    name: 'Timer Widget',
    component: CustomTimerWidget,
    defaultSize: { w: 4, h: 3 },
    minSize: { w: 2, h: 2 },
    maxSize: { w: 6, h: 4 },
    category: 'time',
    permissions: ['timer.view']
  }
];
```

#### 3. Widget Settings
```typescript
// widgets/WidgetSettings.tsx
export const WidgetSettings: React.FC<{
  widget: DashboardWidget;
  settings: WidgetSettings;
  onChange: (settings: WidgetSettings) => void;
}> = ({ widget, settings, onChange }) => {
  return (
    <div className="p-4">
      <h3 className="text-lg font-semibold mb-4">{widget.name} Settings</h3>
      
      {widget.id === 'custom-timer' && (
        <TimerWidgetSettings
          settings={settings}
          onChange={onChange}
        />
      )}
    </div>
  );
};
```

### Widget Categories

#### Time Tracking Widgets
- **Active Timer**: Display currently running timer
- **Today's Time**: Show total time tracked today
- **Weekly Summary**: Weekly time tracking overview
- **Project Time**: Time spent per project

#### Financial Widgets
- **Unpaid Invoices**: List of overdue invoices
- **Monthly Revenue**: Revenue chart for current month
- **Expense Summary**: Recent expenses and categories
- **Profit Margin**: Project profitability metrics

#### Project Management Widgets
- **Active Projects**: List of active projects
- **Project Progress**: Progress bars for key projects
- **Team Activity**: Recent team activities
- **Upcoming Deadlines**: Approaching project deadlines

## 📧 Notification System Guide

### Notification Architecture
```typescript
interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  actions?: NotificationAction[];
  timestamp: Date;
  read: boolean;
  userId: string;
  category: 'system' | 'invoice' | 'project' | 'timer';
}
```

### Notification Channels

#### 1. In-App Notifications
```typescript
// Real-time in-app notifications
const { data: notifications } = useQuery({
  queryKey: ['notifications'],
  queryFn: fetchNotifications,
  refetchInterval: 30000, // Poll every 30 seconds
});

// Mark as read
const markAsRead = (notificationId: string) => {
  return api.patch(`/notifications/${notificationId}/read`);
};
```

#### 2. Email Notifications
```php
// Email notification service
class NotificationService
{
    public function sendInvoiceReminder(Invoice $invoice): void
    {
        $recipient = $invoice->client->contact_email;
        
        Mail::to($recipient)->send(new InvoiceReminder($invoice));
        
        // Log notification
        ActivityLog::create([
            'type' => 'notification_sent',
            'description' => "Invoice reminder sent for {$invoice->number}",
            'user_id' => auth()->id(),
        ]);
    }
}
```

#### 3. Push Notifications (PWA)
```typescript
// Service worker for push notifications
self.addEventListener('push', (event) => {
  const options = {
    body: event.data?.text(),
    icon: '/pwa-icon.png',
    badge: '/badge.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    }
  };
  
  event.waitUntil(
    self.registration.showNotification('TimeIsMoney2', options)
  );
});
```

### Notification Types

#### Invoice Notifications
- **Invoice Created**: New invoice generated
- **Payment Received**: Payment recorded
- **Overdue Reminder**: Invoice overdue notification
- **Payment Failed**: Payment processing error

#### Project Notifications
- **Project Assigned**: User assigned to project
- **Deadline Approaching**: Project deadline near
- **Budget Alert**: Project budget threshold reached
- **Project Completed**: Project marked as complete

#### Time Tracking Notifications
- **Timer Running**: Reminder of active timer
- **Time Entry Approved**: Time entry approved by manager
- **Missing Time**: Reminder to log time for today

### Notification Preferences
```typescript
// User notification preferences
interface NotificationPreferences {
  email: {
    invoices: boolean;
    projects: boolean;
    timer: boolean;
    system: boolean;
  };
  push: {
    invoices: boolean;
    projects: boolean;
    timer: boolean;
    system: boolean;
  };
  inApp: {
    invoices: boolean;
    projects: boolean;
    timer: boolean;
    system: boolean;
  };
}
```

## 🔧 Development Tools & Utilities

### Code Generation Tools

#### 1. Model Generator
```bash
# Generate new Eloquent model
php artisan make:model Invoice --migration --factory --controller

# With relationships
php artisan make:model InvoiceItem --migration --factory
```

#### 2. Component Generator
```bash
# Generate React component with TypeScript
npm run generate:component TimerWidget

# Generate page with routing
npm run generate:page Dashboard
```

#### 3. API Endpoint Generator
```bash
# Generate API resource
php artisan make:resource InvoiceResource

# Generate API controller
php artisan make:controller Api/InvoiceController --api
```

### Testing Utilities

#### 1. Test Data Factory
```php
// Database factory for testing
class InvoiceFactory extends Factory
{
    public function definition(): array
    {
        return [
            'number' => $this->faker->unique()->numerify('INV-####'),
            'client_id' => Client::factory(),
            'total' => $this->faker->randomFloat(2, 100, 5000),
            'status' => $this->faker->randomElement(['draft', 'sent', 'paid']),
            'date' => $this->faker->dateTimeBetween('-1 year', 'now'),
            'due_date' => $this->faker->dateTimeBetween('now', '+3 months'),
        ];
    }
}
```

#### 2. Component Testing Helper
```typescript
// Test helper for React components
export const renderWithProviders = (
  ui: React.ReactElement,
  options: RenderOptions = {}
) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );

  return render(ui, { wrapper: Wrapper, ...options });
};
```

### Performance Monitoring

#### 1. Frontend Performance
```typescript
// Performance monitoring hook
export const usePerformanceMonitor = (componentName: string) => {
  useEffect(() => {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      if (import.meta.env.DEV) {
        console.log(`${componentName} render time: ${renderTime.toFixed(2)}ms`);
      }
      
      // Send to monitoring service in production
      if (renderTime > 100) {
        analytics.track('slow_render', {
          component: componentName,
          renderTime,
        });
      }
    };
  });
};
```

#### 2. Backend Performance
```php
// Middleware for API performance monitoring
class PerformanceMonitoring
{
    public function handle($request, Closure $next)
    {
        $startTime = microtime(true);
        
        $response = $next($request);
        
        $endTime = microtime(true);
        $duration = ($endTime - $startTime) * 1000; // Convert to milliseconds
        
        if ($duration > 1000) { // Log slow requests
            Log::warning('Slow API request', [
                'url' => $request->fullUrl(),
                'method' => $request->method(),
                'duration' => $duration,
                'user_id' => auth()->id(),
            ]);
        }
        
        $response->header('X-Response-Time', $duration . 'ms');
        
        return $response;
    }
}
```

## 🔄 Migration & Upgrade Guide

### Database Migrations

#### 1. Creating Migrations
```bash
# Create new migration
php artisan make:migration add_french_compliance_fields_to_invoices_table

# Migration structure
class AddFrenchComplianceFieldsToInvoicesTable extends Migration
{
    public function up(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->string('siret')->nullable();
            $table->text('legal_footer')->nullable();
            $table->string('facturx_path')->nullable();
        });
    }
    
    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropColumn(['siret', 'legal_footer', 'facturx_path']);
        });
    }
}
```

#### 2. Data Migration
```php
// Migrate existing data to new structure
class MigrateInvoiceData extends Migration
{
    public function up(): void
    {
        Invoice::chunk(100, function ($invoices) {
            foreach ($invoices as $invoice) {
                $invoice->legal_footer = $this->generateLegalFooter($invoice);
                $invoice->save();
            }
        });
    }
}
```

### Frontend Migration

#### 1. Component Migration
```typescript
// Migrate class component to functional component
// Before (Class Component)
class Timer extends React.Component {
  state = { isRunning: false, seconds: 0 };
  
  startTimer = () => {
    this.setState({ isRunning: true });
  };
  
  render() {
    return <div>{this.state.seconds}s</div>;
  }
}

// After (Functional Component)
export const Timer: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  
  const startTimer = useCallback(() => {
    setIsRunning(true);
  }, []);
  
  return <div>{seconds}s</div>;
};
```

## 📚 API Documentation

### RESTful API Standards

#### 1. Response Format
```typescript
// Standard API response
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: Record<string, string[]>;
  meta?: {
    pagination?: {
      current_page: number;
      last_page: number;
      per_page: number;
      total: number;
    };
    timestamp: string;
  };
}
```

#### 2. Error Handling
```php
// Standardized error responses
class ApiExceptionHandler
{
    public function render($request, Throwable $exception)
    {
        if ($exception instanceof ValidationException) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $exception->errors(),
            ], 422);
        }
        
        if ($exception instanceof ModelNotFoundException) {
            return response()->json([
                'success' => false,
                'message' => 'Resource not found',
            ], 404);
        }
        
        return response()->json([
            'success' => false,
            'message' => 'Internal server error',
        ], 500);
    }
}
```

### API Documentation Generation

#### 1. OpenAPI Specification
```yaml
# openapi.yaml
openapi: 3.0.0
info:
  title: TimeIsMoney2 API
  version: 2.0.0
  description: Time tracking and invoicing API

paths:
  /api/invoices:
    get:
      summary: List invoices
      parameters:
        - name: page
          in: query
          schema:
            type: integer
            default: 1
        - name: per_page
          in: query
          schema:
            type: integer
            default: 15
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/InvoiceCollection'
```

#### 2. Interactive Documentation
```php
// API documentation route
Route::get('/api/docs', function () {
    return view('api.docs', [
        'openapi' => file_get_contents(base_path('openapi.yaml')),
    ]);
});
```

---

**Note**: This guide provides technical reference information for developers working on TimeIsMoney2. For user-facing documentation, refer to the Quick Start Guide.