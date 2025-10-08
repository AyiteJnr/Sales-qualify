# Development Guide

## Overview

This guide covers the development workflow, coding standards, and best practices for contributing to SalesQualify.

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- Git
- VS Code (recommended)
- Supabase CLI

### Development Setup

1. **Clone and Install**
   ```bash
   git clone https://github.com/AyiteJnr/Sales-qualify.git
   cd Sales-qualify
   npm install
   ```

2. **Environment Setup**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your values
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```

4. **Start Supabase (Optional)**
   ```bash
   npx supabase start
   ```

## Project Structure

```
src/
├── components/           # Reusable UI components
│   ├── ui/              # Base UI components (Shadcn)
│   ├── AudioRecorder.tsx # Call recording component
│   ├── CRMDashboard.tsx  # CRM interface
│   ├── CRMForms.tsx     # CRM form components
│   ├── MessagingSystem.tsx # Team messaging
│   └── ...
├── pages/               # Page components
│   ├── LandingPage.tsx  # Marketing landing page
│   ├── AdminDashboard.tsx # Admin interface
│   ├── SalesDashboard.tsx # Sales rep interface
│   ├── Auth.tsx         # Authentication page
│   └── ...
├── hooks/               # Custom React hooks
│   ├── useAuth.tsx      # Authentication hook
│   └── ...
├── lib/                 # Utility functions and services
│   ├── utils.ts         # General utilities
│   ├── crm-service.ts   # CRM API service
│   └── ...
├── integrations/        # External service integrations
│   └── supabase/
│       ├── client.ts    # Supabase client
│       └── types.ts     # TypeScript types
└── types/               # TypeScript type definitions
```

## Coding Standards

### TypeScript

- Use strict TypeScript configuration
- Define interfaces for all data structures
- Use type assertions sparingly
- Prefer type guards over type assertions

```typescript
// Good
interface User {
  id: string;
  name: string;
  email: string;
}

const user: User = {
  id: '1',
  name: 'John Doe',
  email: 'john@example.com'
};

// Bad
const user: any = {
  id: '1',
  name: 'John Doe',
  email: 'john@example.com'
};
```

### React Components

- Use functional components with hooks
- Follow the single responsibility principle
- Use proper prop types and interfaces
- Implement error boundaries

```typescript
// Good
interface ButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  disabled = false
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`btn btn-${variant}`}
    >
      {children}
    </button>
  );
};
```

### State Management

- Use React hooks for local state
- Use TanStack Query for server state
- Use Context for global state
- Avoid prop drilling

```typescript
// Good - Using React Query
const { data: companies, isLoading, error } = useQuery({
  queryKey: ['companies'],
  queryFn: () => getCompanies(userId, role)
});

// Good - Using Context
const { user, profile } = useAuth();
```

### Error Handling

- Use try-catch blocks for async operations
- Provide user-friendly error messages
- Log errors for debugging
- Use error boundaries for component errors

```typescript
// Good
const handleSubmit = async (data: FormData) => {
  try {
    setLoading(true);
    await createCompany(data);
    toast({ title: 'Success', description: 'Company created successfully' });
  } catch (error) {
    console.error('Error creating company:', error);
    toast({
      title: 'Error',
      description: 'Failed to create company',
      variant: 'destructive'
    });
  } finally {
    setLoading(false);
  }
};
```

## Development Workflow

### Git Workflow

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/new-feature
   ```

2. **Make Changes**
   - Write code following standards
   - Add tests if applicable
   - Update documentation

3. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

4. **Push and Create PR**
   ```bash
   git push origin feature/new-feature
   # Create pull request on GitHub
   ```

### Commit Message Convention

Use conventional commits:

```
type(scope): description

feat: add new feature
fix: fix bug
docs: update documentation
style: formatting changes
refactor: code refactoring
test: add tests
chore: maintenance tasks
```

Examples:
- `feat(crm): add bulk import functionality`
- `fix(auth): resolve login redirect issue`
- `docs(api): update endpoint documentation`

### Code Review Process

1. **Self Review**
   - Check code quality
   - Run tests
   - Test functionality

2. **Peer Review**
   - Request review from team members
   - Address feedback
   - Make necessary changes

3. **Merge**
   - Squash commits if needed
   - Delete feature branch
   - Update documentation

## Testing

### Unit Testing

```typescript
// __tests__/Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../Button';

describe('Button', () => {
  it('renders correctly', () => {
    render(<Button onClick={() => {}}>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### Integration Testing

```typescript
// __tests__/CRMDashboard.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CRMDashboard } from '../CRMDashboard';

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

describe('CRMDashboard', () => {
  it('loads and displays companies', async () => {
    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <CRMDashboard userId="test-user" role="admin" />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Companies')).toBeInTheDocument();
    });
  });
});
```

### E2E Testing

```typescript
// e2e/crm.spec.ts
import { test, expect } from '@playwright/test';

test('should create a new company', async ({ page }) => {
  await page.goto('/crm');
  
  await page.click('[data-testid="add-company"]');
  await page.fill('[data-testid="company-name"]', 'Test Company');
  await page.fill('[data-testid="company-industry"]', 'Technology');
  await page.click('[data-testid="create-company"]');
  
  await expect(page.locator('[data-testid="company-list"]')).toContainText('Test Company');
});
```

## Database Development

### Local Development

```bash
# Start Supabase locally
npx supabase start

# Create migration
npx supabase migration new add_new_table

# Apply migrations
npx supabase db push

# Generate types
npx supabase gen types typescript --local > src/integrations/supabase/types.ts
```

### Migration Best Practices

1. **Always backup before migration**
2. **Test migrations on staging first**
3. **Use descriptive migration names**
4. **Include rollback scripts**
5. **Review migrations in PR**

```sql
-- migrations/20240101000000_add_company_status.sql
-- Add status column to companies table

ALTER TABLE companies ADD COLUMN status TEXT DEFAULT 'active';

-- Add index for performance
CREATE INDEX idx_companies_status ON companies(status);

-- Add constraint
ALTER TABLE companies ADD CONSTRAINT check_status 
  CHECK (status IN ('active', 'inactive', 'pending'));
```

## API Development

### Service Layer Pattern

```typescript
// lib/crm-service.ts
export class CRMService {
  private supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_ANON_KEY!
  );

  async getCompanies(userId: string, role: string): Promise<Company[]> {
    try {
      const { data, error } = await this.supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching companies:', error);
      throw new Error('Failed to fetch companies');
    }
  }

  async createCompany(company: CreateCompanyData, userId: string): Promise<Company> {
    try {
      const { data, error } = await this.supabase
        .from('companies')
        .insert({
          ...company,
          created_by: userId,
          assigned_to: userId
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating company:', error);
      throw new Error('Failed to create company');
    }
  }
}
```

### Error Handling

```typescript
// lib/error-handler.ts
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const handleApiError = (error: unknown): AppError => {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Error) {
    return new AppError(error.message, 'UNKNOWN_ERROR');
  }

  return new AppError('An unexpected error occurred', 'UNKNOWN_ERROR');
};
```

## Performance Optimization

### Code Splitting

```typescript
// Lazy load components
const CRMDashboard = lazy(() => import('./pages/CRMDashboard'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));

// Use Suspense
<Suspense fallback={<LoadingSpinner />}>
  <CRMDashboard />
</Suspense>
```

### Memoization

```typescript
// Memoize expensive calculations
const expensiveValue = useMemo(() => {
  return calculateExpensiveValue(data);
}, [data]);

// Memoize callbacks
const handleClick = useCallback(() => {
  doSomething();
}, [dependency]);
```

### Virtual Scrolling

```typescript
// For large lists
import { FixedSizeList as List } from 'react-window';

const VirtualizedList = ({ items }: { items: any[] }) => (
  <List
    height={600}
    itemCount={items.length}
    itemSize={50}
    itemData={items}
  >
    {({ index, style, data }) => (
      <div style={style}>
        {data[index].name}
      </div>
    )}
  </List>
);
```

## Security Best Practices

### Input Validation

```typescript
// Validate user input
import { z } from 'zod';

const companySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  industry: z.string().optional(),
  email: z.string().email('Invalid email').optional(),
});

export const validateCompany = (data: unknown) => {
  return companySchema.parse(data);
};
```

### XSS Prevention

```typescript
// Sanitize user input
import DOMPurify from 'dompurify';

const sanitizeHtml = (html: string) => {
  return DOMPurify.sanitize(html);
};
```

### CSRF Protection

```typescript
// Use CSRF tokens
const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');

const apiCall = async (data: any) => {
  const response = await fetch('/api/endpoint', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken || '',
    },
    body: JSON.stringify(data),
  });
};
```

## Debugging

### Development Tools

1. **React Developer Tools**
2. **Redux DevTools** (if using Redux)
3. **Supabase Dashboard**
4. **Browser DevTools**

### Logging

```typescript
// lib/logger.ts
export const logger = {
  debug: (message: string, data?: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEBUG] ${message}`, data);
    }
  },
  info: (message: string, data?: any) => {
    console.info(`[INFO] ${message}`, data);
  },
  warn: (message: string, data?: any) => {
    console.warn(`[WARN] ${message}`, data);
  },
  error: (message: string, error?: Error) => {
    console.error(`[ERROR] ${message}`, error);
  },
};
```

### Error Tracking

```typescript
// lib/error-tracking.ts
import * as Sentry from '@sentry/react';

export const trackError = (error: Error, context?: any) => {
  Sentry.captureException(error, {
    tags: {
      component: context?.component,
    },
    extra: context,
  });
};
```

## Documentation

### Code Documentation

```typescript
/**
 * Creates a new company in the CRM system
 * @param companyData - The company information to create
 * @param userId - The ID of the user creating the company
 * @returns Promise that resolves to the created company
 * @throws {AppError} When company creation fails
 * @example
 * ```typescript
 * const company = await createCompany({
 *   name: 'Acme Corp',
 *   industry: 'Technology'
 * }, 'user-123');
 * ```
 */
export const createCompany = async (
  companyData: CreateCompanyData,
  userId: string
): Promise<Company> => {
  // Implementation
};
```

### README Updates

- Update README.md for new features
- Document API changes
- Update installation instructions
- Add troubleshooting sections

## Deployment

### Pre-deployment Checklist

- [ ] All tests pass
- [ ] Code is reviewed and approved
- [ ] Documentation is updated
- [ ] Environment variables are configured
- [ ] Database migrations are ready
- [ ] Performance is acceptable
- [ ] Security review is complete

### Staging Deployment

```bash
# Deploy to staging
npm run build:staging
vercel --target staging
```

### Production Deployment

```bash
# Deploy to production
npm run build:production
vercel --prod
```

## Troubleshooting

### Common Issues

1. **Build Failures**
   ```bash
   # Clear cache
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Type Errors**
   ```bash
   # Check TypeScript
   npm run type-check
   ```

3. **Database Issues**
   ```bash
   # Reset local database
   npx supabase db reset
   ```

4. **Environment Variables**
   ```bash
   # Check environment
   echo $VITE_SUPABASE_URL
   ```

### Getting Help

- Check existing issues on GitHub
- Ask questions in team chat
- Review documentation
- Contact maintainers

## Contributing

### Before Contributing

1. Read the contributing guidelines
2. Check existing issues and PRs
3. Discuss major changes in issues
4. Follow the coding standards

### Pull Request Process

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Update documentation
6. Submit a pull request

### Code Review

- Be respectful and constructive
- Focus on code quality and functionality
- Test the changes locally
- Provide clear feedback

## Resources

### Documentation
- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)

### Tools
- [VS Code](https://code.visualstudio.com/)
- [React Developer Tools](https://react.dev/learn/react-developer-tools)
- [Supabase CLI](https://supabase.com/docs/guides/cli)

### Learning
- [React Patterns](https://reactpatterns.com/)
- [TypeScript Best Practices](https://typescript-eslint.io/rules/)
- [Database Design](https://www.postgresql.org/docs/)
