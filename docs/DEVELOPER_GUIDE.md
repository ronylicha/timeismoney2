# TimeIsMoney2 - Developer Guide

**Version:** 2.0  
**Last Updated:** 2025-11-09

## 🏗️ Architecture Overview

### Tech Stack
- **Backend**: Laravel 10 (PHP 8.1+)
- **Frontend**: React 18 + TypeScript + Vite
- **Database**: MySQL/PostgreSQL
- **State Management**: React Query + Context API
- **UI**: Tailwind CSS + Headless UI
- **Authentication**: Laravel Sanctum
- **Payments**: Stripe Cashier

### Project Structure
```
├── app/                    # Laravel backend
│   ├── Http/Controllers/   # API controllers
│   ├── Models/            # Eloquent models
│   ├── Services/          # Business logic services
│   └── Mail/              # Email templates
├── resources/js/          # React frontend
│   ├── components/       # Reusable components
│   ├── pages/           # Route pages (lazy loaded)
│   ├── hooks/           # Custom React hooks
│   ├── contexts/        # React contexts
│   └── services/        # API services
├── database/            # Migrations and seeders
└── routes/             # API and web routes
```

## 🔧 Development Environment

### Required Tools
- PHP 8.1+ with extensions
- Node.js 18+
- Composer
- Git
- VS Code (recommended)

### VS Code Extensions (Recommended)
- PHP Intelephense
- TypeScript Importer
- ES7+ React/Redux/React-Native snippets
- Tailwind CSS IntelliSense
- GitLens

### Development Commands
```bash
# Backend development
php artisan serve --port=8000
php artisan tinker
php artisan queue:work
php artisan schedule:work

# Frontend development
npm run dev          # Development server
npm run build        # Production build
npm run preview      # Preview production build
npm run lint         # ESLint
npm run type-check   # TypeScript checking
```

## 📝 Code Standards

### PHP/Laravel Standards
- Follow PSR-12 coding standards
- Use Eloquent relationships properly
- Implement proper error handling
- Use Laravel's built-in features (validation, authorization, etc.)

### React/TypeScript Standards
- Use strict TypeScript mode
- Follow React hooks rules strictly
- Implement proper error boundaries
- Use React Query for server state
- Memoize expensive operations

### File Naming Conventions
- **PHP**: PascalCase for classes, snake_case for methods/variables
- **React**: PascalCase for components, camelCase for functions/variables
- **Files**: kebab-case for file names

## 🔄 Development Workflow

### 1. Feature Development
```bash
# Create feature branch
git checkout -b feature/new-feature

# Make changes
# ... (development work)

# Run tests
php artisan test
npm run test

# Commit changes
git add .
git commit -m "feat: add new feature description"

# Push and create PR
git push origin feature/new-feature
```

### 2. Code Review Process
- All code must pass automated checks
- Require at least one review for PRs
- Ensure test coverage is maintained
- Update documentation if needed

### 3. Testing Strategy
- **Unit Tests**: Model and service logic
- **Feature Tests**: API endpoints
- **Component Tests**: React components
- **E2E Tests**: Critical user flows

## 🎯 Key Development Patterns

### Backend Patterns

#### Repository Pattern
```php
class UserRepository
{
    public function findById(int $id): ?User
    {
        return User::find($id);
    }
    
    public function create(array $data): User
    {
        return User::create($data);
    }
}
```

#### Service Pattern
```php
class InvoiceService
{
    public function createInvoice(array $data): Invoice
    {
        DB::beginTransaction();
        try {
            $invoice = Invoice::create($data);
            // Additional logic
            DB::commit();
            return $invoice;
        } catch (Exception $e) {
            DB::rollback();
            throw $e;
        }
    }
}
```

#### API Resource Pattern
```php
class InvoiceResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'total' => $this->total,
            'client' => new ClientResource($this->client),
            'items' => InvoiceItemResource::collection($this->items),
        ];
    }
}
```

### Frontend Patterns

#### Custom Hook Pattern
```typescript
export const useTimer = () => {
    const [isRunning, setIsRunning] = useState(false);
    const { data: timer } = useQuery({
        queryKey: ['timer'],
        queryFn: fetchTimer,
    });
    
    const startTimer = useCallback(async () => {
        await api.post('/timer/start');
        setIsRunning(true);
    }, []);
    
    return { isRunning, timer, startTimer };
};
```

#### Component Pattern
```typescript
interface TimerProps {
    projectId: number;
    onTimeUpdate?: (seconds: number) => void;
}

export const Timer: React.FC<TimerProps> = React.memo(({ 
    projectId, 
    onTimeUpdate 
}) => {
    const { isRunning, startTimer, stopTimer } = useTimer();
    
    return (
        <div className="timer-component">
            {/* Timer UI */}
        </div>
    );
});
```

## 🔌 API Development

### RESTful API Standards
- Use proper HTTP methods (GET, POST, PUT, DELETE)
- Implement consistent response format
- Use API resources for data transformation
- Implement proper error handling

### Response Format
```json
{
    "success": true,
    "data": {
        "id": 1,
        "name": "Example"
    },
    "message": "Operation successful",
    "meta": {
        "timestamp": "2025-11-09T10:00:00Z"
    }
}
```

### Error Handling
```php
try {
    // API logic
} catch (ValidationException $e) {
    return response()->json([
        'success' => false,
        'message' => 'Validation failed',
        'errors' => $e->errors(),
    ], 422);
} catch (Exception $e) {
    return response()->json([
        'success' => false,
        'message' => 'Internal server error',
    ], 500);
}
```

## 🗄️ Database Development

### Migration Best Practices
- Use descriptive migration names
- Include proper indexes for performance
- Use foreign key constraints
- Write rollback methods

### Model Relationships
```php
class Invoice extends Model
{
    protected $fillable = ['client_id', 'total', 'status'];
    
    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }
    
    public function items(): HasMany
    {
        return $this->hasMany(InvoiceItem::class);
    }
}
```

### Query Optimization
- Use eager loading to prevent N+1 queries
- Implement proper database indexes
- Use query caching for expensive operations
- Monitor slow queries

## 🎨 Frontend Development

### Component Architecture
- **Atomic Design**: Atoms → Molecules → Organisms → Templates → Pages
- **Container/Presentational**: Separate logic from presentation
- **Composition over Inheritance**: Prefer composition patterns

### State Management
```typescript
// Global state with Context
const AppContext = createContext<AppContextType>();

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    
    const value = useMemo(() => ({
        user,
        setUser,
        isAuthenticated: !!user,
    }), [user]);
    
    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
};
```

### Performance Optimization
- Use React.memo for expensive components
- Implement code splitting with lazy loading
- Optimize bundle size with manual chunks
- Use React Query for efficient data fetching

## 🔒 Security Best Practices

### Backend Security
- Validate all input data
- Use Laravel's authorization features
- Implement rate limiting
- Sanitize all user input
- Use HTTPS in production

### Frontend Security
- Sanitize user-generated content
- Implement proper authentication checks
- Use secure storage for sensitive data
- Validate data on both client and server

### Authentication & Authorization
```php
// Policy example
class InvoicePolicy
{
    public function update(User $user, Invoice $invoice): bool
    {
        return $user->tenant_id === $invoice->tenant_id;
    }
}

// Controller usage
$this->authorize('update', $invoice);
```

## 🧪 Testing Guidelines

### Backend Testing
```php
class InvoiceTest extends TestCase
{
    public function test_can_create_invoice(): void
    {
        $user = User::factory()->create();
        $client = Client::factory()->create();
        
        $response = $this->actingAs($user)
            ->post('/api/invoices', [
                'client_id' => $client->id,
                'total' => 1000,
            ]);
            
        $response->assertStatus(201)
            ->assertJsonFragment(['total' => 1000]);
    }
}
```

### Frontend Testing
```typescript
import { renderHook, act } from '@testing-library/react-hooks';
import { useTimer } from './useTimer';

describe('useTimer', () => {
    it('should start timer correctly', async () => {
        const { result } = renderHook(() => useTimer());
        
        await act(async () => {
            await result.current.startTimer();
        });
        
        expect(result.current.isRunning).toBe(true);
    });
});
```

## 🚀 Deployment

### Production Setup
1. **Environment Configuration**
   - Set `APP_ENV=production`
   - Configure production database
   - Set up proper caching

2. **Asset Optimization**
   - Run `npm run build`
   - Enable asset versioning
   - Configure CDN if needed

3. **Server Configuration**
   - Configure web server (Nginx/Apache)
   - Set up SSL certificates
   - Configure cron jobs

### Monitoring & Logging
- Use Laravel's logging system
- Monitor application performance
- Set up error tracking (Sentry, etc.)
- Implement health checks

## 📚 Additional Resources

### Documentation
- [Laravel Documentation](https://laravel.com/docs)
- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS](https://tailwindcss.com/docs)

### Tools & Extensions
- Laravel Telescope for debugging
- Laravel Horizon for queue monitoring
- React DevTools for frontend debugging
- Database query monitoring tools

---

**Remember**: Always follow the coding standards, write tests for new features, and keep documentation updated!