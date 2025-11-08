# CLAUDE.md - TimeIsMoney2 Project Guidelines

**Version:** 1.0
**Last Updated:** 2025-11-08
**Project:** TimeIsMoney2 - Time tracking and invoicing SaaS

---

## 📋 Table of Contents

1. [React & TypeScript Best Practices](#react--typescript-best-practices)
2. [Hooks Rules & Patterns](#hooks-rules--patterns)
3. [Performance Optimization](#performance-optimization)
4. [State Management](#state-management)
5. [API Integration](#api-integration)
6. [Code Splitting & Bundle Size](#code-splitting--bundle-size)
7. [Error Handling](#error-handling)
8. [Security Guidelines](#security-guidelines)
9. [Testing Requirements](#testing-requirements)
10. [Code Quality Standards](#code-quality-standards)

---

## React & TypeScript Best Practices

### ✅ Required Rules

#### 1. Always Use Strict TypeScript
```typescript
// ❌ Bad - Using 'any' type
const handleError = (error: any) => {
    console.error(error);
};

// ✅ Good - Proper typing
interface ApiError {
    message: string;
    code?: string;
    response?: {
        status: number;
        data: unknown;
    };
}

const handleError = (error: ApiError) => {
    console.error(error);
};
```

**Rules:**
- Never use `any` type unless absolutely necessary
- Define proper interfaces for all data structures
- Use TypeScript strict mode (`strict: true`)
- Leverage type inference where possible

---

#### 2. Component Organization
```typescript
// ✅ Good component structure
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ExternalDependency } from 'external-lib';
import { InternalComponent } from '@/components';
import { useCustomHook } from '@/hooks';
import type { ComponentProps } from '@/types';

/**
 * ComponentName - Brief description
 * @param {ComponentProps} props - Component properties
 * @returns {JSX.Element}
 */
export const ComponentName: React.FC<ComponentProps> = ({ prop1, prop2 }) => {
    // 1. Hooks
    const [state, setState] = useState(initialValue);
    const customHook = useCustomHook();

    // 2. Refs
    const elementRef = useRef<HTMLDivElement>(null);

    // 3. Memoized values
    const memoizedValue = useMemo(() => expensiveCalculation(), [deps]);

    // 4. Callbacks
    const handleAction = useCallback(() => {
        // Handle action
    }, [deps]);

    // 5. Effects
    useEffect(() => {
        // Effect logic
        return () => {
            // Cleanup
        };
    }, [deps]);

    // 6. Render
    return (
        <div ref={elementRef}>
            {/* JSX */}
        </div>
    );
};

// 7. Export with React.memo for performance-critical components
export default React.memo(ComponentName);
```

---

## Hooks Rules & Patterns

### ✅ Rules of Hooks (CRITICAL)

#### 1. Always Include All Dependencies
```typescript
// ❌ BAD - Missing dependencies
useEffect(() => {
    checkAuth();
}, []); // Missing checkAuth dependency

// ✅ GOOD - All dependencies included
useEffect(() => {
    checkAuth();
}, [checkAuth]);
```

#### 2. Wrap Functions in useCallback
```typescript
// ❌ BAD - Function recreated on every render
const syncNow = async () => {
    // Sync logic
};

// ✅ GOOD - Stable function reference
const syncNow = useCallback(async () => {
    // Sync logic
}, [dependencies]);
```

#### 3. Never Use Direct DOM Manipulation
```typescript
// ❌ BAD - Direct DOM querying
const descriptionInput = document.querySelector('input[name="description"]');

// ✅ GOOD - Use refs
const descriptionRef = useRef<HTMLInputElement>(null);

// In JSX:
<input ref={descriptionRef} name="description" />
```

#### 4. Clean Up Effects Properly
```typescript
// ❌ BAD - No cleanup
useEffect(() => {
    const interval = setInterval(() => {
        doSomething();
    }, 1000);
}, []);

// ✅ GOOD - Proper cleanup
useEffect(() => {
    const interval = setInterval(() => {
        doSomething();
    }, 1000);

    return () => {
        clearInterval(interval);
    };
}, [doSomething]);
```

---

## Performance Optimization

### ✅ Code Splitting

#### 1. Lazy Load All Non-Critical Pages
```typescript
// ❌ BAD - Eager loading everything
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import Reports from './pages/Reports';

// ✅ GOOD - Lazy loading
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Settings = lazy(() => import('./pages/Settings'));
const Reports = lazy(() => import('./pages/Reports'));
```

#### 2. Always Wrap Lazy Routes in Suspense
```typescript
// ✅ GOOD - Suspense with loading fallback
const LoadingFallback = () => (
    <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        <p>Loading...</p>
    </div>
);

<Suspense fallback={<LoadingFallback />}>
    <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
    </Routes>
</Suspense>
```

---

### ✅ React Query Optimization

#### 1. Avoid Aggressive Polling
```typescript
// ❌ BAD - Polling every second
const { data } = useQuery({
    queryKey: ['timer'],
    queryFn: fetchTimer,
    refetchInterval: 1000, // Every second! Too aggressive
});

// ✅ GOOD - Smart polling + local state
const { data } = useQuery({
    queryKey: ['timer'],
    queryFn: fetchTimer,
    refetchInterval: (data) => data ? 30000 : false, // 30s if running
});

// Use local state for UI updates
const [elapsedTime, setElapsedTime] = useState(0);
useEffect(() => {
    if (!data) return;
    const interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
}, [data]);
```

#### 2. Configure Sensible Defaults
```typescript
// ✅ GOOD - Global React Query config
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 5,      // 5 minutes
            cacheTime: 1000 * 60 * 10,     // 10 minutes
            retry: 3,
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        },
    },
});
```

---

### ✅ Memoization

#### 1. Memoize Expensive Calculations
```typescript
// ❌ BAD - Recalculated on every render
const filteredData = items.filter(item => item.active)
                          .map(item => transform(item))
                          .sort((a, b) => a.value - b.value);

// ✅ GOOD - Memoized
const filteredData = useMemo(() => {
    return items.filter(item => item.active)
                .map(item => transform(item))
                .sort((a, b) => a.value - b.value);
}, [items]);
```

#### 2. Memoize Static Arrays/Objects
```typescript
// ❌ BAD - Recreated on every render
const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
    { name: 'Settings', href: '/settings', icon: CogIcon },
];

// ✅ GOOD - Memoized
const navigation = useMemo(() => [
    { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
    { name: 'Settings', href: '/settings', icon: CogIcon },
], []);
```

#### 3. Memoize Components
```typescript
// ✅ GOOD - Memoized component
export default React.memo(UserForm, (prevProps, nextProps) => {
    return (
        prevProps.user?.id === nextProps.user?.id &&
        prevProps.isLoading === nextProps.isLoading
    );
});
```

---

## State Management

### ✅ Context Best Practices

#### 1. Stable Context Values
```typescript
// ❌ BAD - New object on every render
<AuthContext.Provider value={{
    user,
    login,
    logout
}}>

// ✅ GOOD - Memoized value
const value: AuthContextValue = useMemo(() => ({
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    updateUser,
    checkAuth,
}), [user, isLoading, login, register, logout, updateUser, checkAuth]);

<AuthContext.Provider value={value}>
```

#### 2. Separate Concerns
```typescript
// ✅ GOOD - Split contexts by concern
- AuthContext: Authentication state
- ThemeContext: UI theme
- LanguageContext: i18n
- OfflineContext: Offline sync
```

---

## API Integration

### ✅ Axios Best Practices

#### 1. Global Error Handling
```typescript
// ✅ GOOD - Global 401 handler with race condition prevention
let isRedirecting = false;

axios.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            const currentPath = window.location.pathname;
            const authPaths = ['/login', '/register', '/forgot-password', '/2fa'];
            const isLoginRequest = error.config?.url?.includes('/login');

            if (!authPaths.includes(currentPath) && !isLoginRequest && !isRedirecting) {
                const hasToken = localStorage.getItem('auth_token');

                if (hasToken) {
                    isRedirecting = true;
                    localStorage.removeItem('auth_token');
                    localStorage.removeItem('user');
                    window.location.href = '/login';
                }
            }
        }
        return Promise.reject(error);
    }
);
```

#### 2. Always Handle Errors
```typescript
// ❌ BAD - No error handling
axios.patch('/api/endpoint', data)
    .then((response) => {
        // Handle success
    });

// ✅ GOOD - Proper error handling
axios.patch('/api/endpoint', data)
    .then((response) => {
        toast.success('Updated successfully');
    })
    .catch((error) => {
        console.error('API Error:', error);
        toast.error(error.response?.data?.message || 'An error occurred');
    });
```

#### 3. Use Abort Controllers for Long Queries
```typescript
// ✅ GOOD - Cancellable queries
queryFn: async ({ signal }) => {
    const response = await axios.get('/api/data', {
        signal, // Pass abort signal
    });
    return response.data;
}
```

---

## Code Splitting & Bundle Size

### ✅ Vite Configuration

```typescript
// vite.config.ts
export default defineConfig({
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    'react-vendor': ['react', 'react-dom', 'react-router-dom'],
                    'ui-vendor': ['@headlessui/react', '@heroicons/react', 'lucide-react'],
                    'chart-vendor': ['chart.js', 'recharts', 'react-chartjs-2'],
                    'query-vendor': ['@tanstack/react-query', 'axios'],
                    'form-vendor': ['react-hook-form', 'zod', '@hookform/resolvers'],
                    'i18n-vendor': ['i18next', 'react-i18next'],
                    'util-vendor': ['date-fns', 'react-toastify', 'lodash.debounce'],
                    'dnd-vendor': ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities']
                }
            }
        },
        chunkSizeWarningLimit: 600,
    },
});
```

### ✅ Bundle Size Targets

| Bundle | Max Size (gzipped) |
|--------|-------------------|
| Main bundle | < 100 kB |
| Vendor chunks | < 200 kB each |
| Page chunks | < 50 kB each |

---

## Error Handling

### ✅ Error Boundaries

```typescript
// ✅ GOOD - Error Boundary component
class ErrorBoundary extends React.Component<
    { children: React.ReactNode },
    { hasError: boolean }
> {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.error('Error caught by boundary:', error, errorInfo);
        // Log to error reporting service
    }

    render() {
        if (this.state.hasError) {
            return <ErrorFallback />;
        }
        return this.props.children;
    }
}

// Wrap critical sections
<ErrorBoundary>
    <CriticalComponent />
</ErrorBoundary>
```

---

## Security Guidelines

### ✅ XSS Prevention

```typescript
// ❌ BAD - Potential XSS
<p>{user.description}</p>

// ✅ GOOD - Sanitized output
import DOMPurify from 'dompurify';

<p>{DOMPurify.sanitize(user.description)}</p>
```

### ✅ Input Validation

```typescript
// ✅ GOOD - Validate Stripe keys format
const validateStripeKey = (key: string, type: 'publishable' | 'secret'): boolean => {
    const publishableRegex = /^pk_(test|live)_[a-zA-Z0-9]{24,}$/;
    const secretRegex = /^sk_(test|live)_[a-zA-Z0-9]{24,}$/;

    if (type === 'publishable') {
        return publishableRegex.test(key);
    }
    return secretRegex.test(key);
};
```

### ✅ Authentication

```typescript
// ✅ GOOD - Bearer token authentication
axios.interceptors.request.use((config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});
```

---

## Testing Requirements

### ✅ Test Coverage

**Required test coverage:**
- Unit tests: 80% minimum
- Integration tests: Critical user flows
- E2E tests: Happy paths for core features

### ✅ Testing Hooks

```typescript
// ✅ GOOD - Test custom hooks
import { renderHook, act } from '@testing-library/react-hooks';
import { useTimer } from './useTimer';

describe('useTimer', () => {
    it('should start timer correctly', async () => {
        const { result } = renderHook(() => useTimer());

        await act(async () => {
            await result.current.startTimer({ project_id: 1 });
        });

        expect(result.current.isRunning).toBe(true);
    });

    it('should clean up on unmount', () => {
        const { result, unmount } = renderHook(() => useTimer());

        unmount();

        // Verify cleanup happened
    });
});
```

---

## Code Quality Standards

### ✅ Console Logs

```typescript
// ❌ BAD - Console logs in production
console.log('User data:', userData);

// ✅ GOOD - Development-only logs
if (import.meta.env.DEV) {
    console.log('User data:', userData);
}
```

### ✅ Component Size

**Maximum component sizes:**
- Small components: < 200 lines
- Medium components: 200-500 lines
- Large components: 500-700 lines (should be refactored)
- Never: > 700 lines

**Refactoring triggers:**
- Component exceeds 500 lines
- More than 5 useState calls
- More than 10 useEffect calls
- Difficult to understand at a glance

### ✅ File Organization

```
src/
├── components/
│   ├── Common/          # Reusable UI components
│   ├── Features/        # Feature-specific components
│   └── Layout/          # Layout components
├── pages/               # Route pages (lazy loaded)
├── hooks/               # Custom hooks
├── contexts/            # React contexts
├── utils/               # Utility functions
├── types/               # TypeScript types
└── i18n/                # Internationalization
```

### ✅ Naming Conventions

```typescript
// Components: PascalCase
export const UserProfile = () => { };

// Hooks: camelCase with 'use' prefix
export const useAuth = () => { };

// Utils: camelCase
export const formatDate = () => { };

// Constants: SCREAMING_SNAKE_CASE
export const API_BASE_URL = 'https://api.example.com';

// Types/Interfaces: PascalCase
export interface UserData { }
```

---

## Accessibility

### ✅ ARIA Labels

```typescript
// ❌ BAD - Missing accessibility
<button className="p-2">
    <BellIcon className="h-6 w-6" />
</button>

// ✅ GOOD - Proper ARIA labels
<button
    className="p-2"
    aria-label="Notifications"
>
    <BellIcon className="h-6 w-6" aria-hidden="true" />
</button>
```

### ✅ Keyboard Navigation

```typescript
// ✅ GOOD - Keyboard accessible
<div
    role="button"
    tabIndex={0}
    onClick={handleClick}
    onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            handleClick();
        }
    }}
>
    Click me
</div>
```

---

## i18n Best Practices

### ✅ Always Use Translation Keys

```typescript
// ❌ BAD - Hardcoded strings
<h1>Welcome back, {user?.name}!</h1>

// ✅ GOOD - Translation keys
import { useTranslation } from 'react-i18next';

const { t } = useTranslation();

<h1>{t('dashboard.welcome', { name: user?.name })}</h1>
```

---

## Git Workflow

### ✅ Commit Messages

```
feat: Add user authentication with 2FA support
fix: Resolve memory leak in useTimer hook
refactor: Extract invoice form into separate components
perf: Implement code splitting for admin pages
docs: Update API documentation
test: Add unit tests for useProjects hook
```

### ✅ Branch Naming

```
feature/user-authentication
fix/timer-memory-leak
refactor/invoice-components
perf/code-splitting
```

---

## Pre-Commit Checklist

Before committing code, ensure:

- [ ] No TypeScript errors (`npm run build`)
- [ ] All tests passing (`npm run test`)
- [ ] No console.log in production code
- [ ] All components < 700 lines
- [ ] Proper error handling on all API calls
- [ ] No `any` types (unless documented why)
- [ ] Dependencies correct in all useEffect/useCallback/useMemo
- [ ] Proper cleanup in all useEffect hooks
- [ ] Code split where appropriate
- [ ] Accessibility labels added
- [ ] i18n keys used instead of hardcoded strings

---

## Performance Benchmarks

### ✅ Target Metrics

| Metric | Target |
|--------|--------|
| First Contentful Paint | < 1.5s |
| Time to Interactive | < 3.5s |
| Lighthouse Performance | > 90 |
| Bundle size (main) | < 100 kB gzipped |
| React Query cache hit rate | > 80% |

---

## Tools & Linting

### ✅ Required Tools

```json
{
  "devDependencies": {
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "eslint": "^8.0.0",
    "eslint-plugin-react": "^7.33.0",
    "eslint-plugin-react-hooks": "^4.6.0"
  }
}
```

### ✅ ESLint Configuration

```json
{
  "extends": [
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "plugin:@typescript-eslint/recommended"
  ],
  "plugins": ["react", "react-hooks", "@typescript-eslint"],
  "rules": {
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn",
    "@typescript-eslint/no-explicit-any": "warn",
    "no-console": ["warn", { "allow": ["warn", "error"] }]
  }
}
```

---

## Documentation Requirements

### ✅ JSDoc for Complex Functions

```typescript
/**
 * Synchronizes offline data with the server
 * @async
 * @returns {Promise<void>}
 * @throws {Error} If sync fails after retries
 *
 * @example
 * await syncNow();
 */
const syncNow = useCallback(async () => {
    // Implementation
}, [dependencies]);
```

---

## Common Pitfalls to Avoid

### 🚫 Anti-Patterns

1. **Missing cleanup in useEffect**
   - Always return cleanup function
   - Clear intervals, timeouts, subscriptions

2. **Stale closures**
   - Include all dependencies in arrays
   - Use refs for values that shouldn't trigger re-renders

3. **Prop drilling**
   - Use Context for deeply nested state
   - Consider composition over prop drilling

4. **Unnecessary re-renders**
   - Memoize expensive calculations
   - Use React.memo for pure components
   - Avoid inline object/array creation

5. **Ignoring TypeScript errors**
   - Never use `@ts-ignore` without comment
   - Fix root cause instead of suppressing

---

## Resources

- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React Query Docs](https://tanstack.com/query/latest)
- [Vite Documentation](https://vitejs.dev)
- [Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

---

## Enforcement

This document is enforced through:
1. Code reviews
2. Automated linting (ESLint)
3. Pre-commit hooks
4. CI/CD pipeline checks
5. Regular audits

---

**Last reviewed:** 2025-11-08
**Next review:** 2025-12-08
**Maintainer:** Development Team
