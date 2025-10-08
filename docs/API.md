# API Documentation

## Overview

SalesQualify provides a comprehensive REST API built on Supabase, offering real-time capabilities, authentication, and full CRUD operations for all CRM entities.

## Base URL

```
https://your-project.supabase.co/rest/v1/
```

## Authentication

All API requests require authentication using Supabase's JWT tokens.

### Headers

```http
Authorization: Bearer <your-jwt-token>
apikey: <your-anon-key>
Content-Type: application/json
```

## Authentication Endpoints

### Sign Up

```http
POST /auth/v1/signup
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "options": {
    "data": {
      "full_name": "John Doe",
      "role": "rep"
    }
  }
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "user_metadata": {
      "full_name": "John Doe",
      "role": "rep"
    }
  },
  "session": {
    "access_token": "jwt-token",
    "refresh_token": "refresh-token"
  }
}
```

### Sign In

```http
POST /auth/v1/token?grant_type=password
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

### Sign Out

```http
POST /auth/v1/logout
```

## CRM API Endpoints

### Companies

#### Get All Companies

```http
GET /companies?select=*
```

**Query Parameters:**
- `select` - Fields to return (default: *)
- `order` - Sort order (e.g., `created_at.desc`)
- `limit` - Number of records to return
- `offset` - Number of records to skip

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Acme Corp",
    "industry": "Technology",
    "website": "https://acme.com",
    "phone": "+1-555-0123",
    "email": "contact@acme.com",
    "address": "123 Tech St",
    "city": "San Francisco",
    "state": "CA",
    "country": "USA",
    "postal_code": "94105",
    "description": "Leading technology company",
    "annual_revenue": 5000000,
    "employee_count": 250,
    "status": "active",
    "assigned_to": "user-uuid",
    "created_by": "user-uuid",
    "created_at": "2024-01-01T00:00:00Z"
  }
]
```

#### Create Company

```http
POST /companies
```

**Request Body:**
```json
{
  "name": "Acme Corp",
  "industry": "Technology",
  "website": "https://acme.com",
  "phone": "+1-555-0123",
  "email": "contact@acme.com",
  "address": "123 Tech St",
  "city": "San Francisco",
  "state": "CA",
  "country": "USA",
  "postal_code": "94105",
  "description": "Leading technology company",
  "annual_revenue": 5000000,
  "employee_count": 250,
  "assigned_to": "user-uuid"
}
```

#### Update Company

```http
PATCH /companies?id=eq.{company-id}
```

**Request Body:**
```json
{
  "name": "Updated Company Name",
  "industry": "Updated Industry"
}
```

#### Delete Company

```http
DELETE /companies?id=eq.{company-id}
```

### Contacts

#### Get All Contacts

```http
GET /contacts?select=*,companies(*)
```

#### Create Contact

```http
POST /contacts
```

**Request Body:**
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john.doe@acme.com",
  "phone": "+1-555-0123",
  "mobile": "+1-555-0124",
  "job_title": "CEO",
  "department": "Executive",
  "address": "123 Tech St",
  "city": "San Francisco",
  "state": "CA",
  "country": "USA",
  "postal_code": "94105",
  "notes": "Key decision maker",
  "lead_source": "Website",
  "company_id": "company-uuid",
  "assigned_to": "user-uuid"
}
```

### Deals

#### Get All Deals

```http
GET /deals?select=*,companies(*),contacts(*)
```

#### Create Deal

```http
POST /deals
```

**Request Body:**
```json
{
  "name": "Software License Deal",
  "value": 50000,
  "currency": "USD",
  "stage": "prospecting",
  "probability": 25,
  "close_date": "2024-02-15",
  "description": "Software licensing deal",
  "notes": "High priority client",
  "source": "Website",
  "company_id": "company-uuid",
  "contact_id": "contact-uuid",
  "assigned_to": "user-uuid"
}
```

### Activities

#### Get All Activities

```http
GET /activities?select=*,companies(*),contacts(*),deals(*)
```

#### Create Activity

```http
POST /activities
```

**Request Body:**
```json
{
  "type": "call",
  "subject": "Follow up with Acme Corp",
  "description": "Discuss software requirements",
  "due_date": "2024-01-15T10:00:00Z",
  "priority": "high",
  "outcome": "Client interested",
  "company_id": "company-uuid",
  "contact_id": "contact-uuid",
  "deal_id": "deal-uuid",
  "assigned_to": "user-uuid"
}
```

## Messaging API

### Get Messages

```http
GET /messages?select=*,sender:profiles!messages_sender_id_fkey(*),recipient:profiles!messages_recipient_id_fkey(*)
```

**Query Parameters:**
- `sender_id=eq.{user-id}` - Messages sent by user
- `recipient_id=eq.{user-id}` - Messages received by user
- `is_draft=eq.true` - Draft messages

### Send Message

```http
POST /messages
```

**Request Body:**
```json
{
  "recipient_id": "user-uuid",
  "body": "Hello, how are you?",
  "is_draft": false,
  "reply_to": "message-uuid"
}
```

### Mark Message as Read

```http
PATCH /messages?id=eq.{message-id}
```

**Request Body:**
```json
{
  "read_at": "2024-01-01T12:00:00Z"
}
```

## Real-time Subscriptions

### Subscribe to Table Changes

```javascript
const subscription = supabase
  .channel('table-changes')
  .on('postgres_changes', {
    event: '*', // INSERT, UPDATE, DELETE
    schema: 'public',
    table: 'companies'
  }, (payload) => {
    console.log('Change received!', payload)
  })
  .subscribe()
```

### Subscribe to Specific Events

```javascript
// Only listen for inserts
const subscription = supabase
  .channel('new-companies')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'companies'
  }, (payload) => {
    console.log('New company added:', payload.new)
  })
  .subscribe()
```

## Error Handling

### Error Response Format

```json
{
  "code": "error-code",
  "message": "Human readable error message",
  "details": "Additional error details",
  "hint": "Helpful hint for resolving the error"
}
```

### Common Error Codes

- `PGRST116` - Row Level Security policy violation
- `23505` - Unique constraint violation
- `23503` - Foreign key constraint violation
- `42501` - Insufficient privilege

### Example Error Response

```json
{
  "code": "PGRST116",
  "message": "The result contains 0 rows",
  "details": null,
  "hint": null
}
```

## Rate Limiting

- **Anonymous requests**: 100 requests per hour
- **Authenticated requests**: 1000 requests per hour
- **Real-time connections**: 10 concurrent connections per user

## Pagination

### Using Limit and Offset

```http
GET /companies?limit=10&offset=20
```

### Using Cursor-based Pagination

```http
GET /companies?created_at=gt.2024-01-01T00:00:00Z&limit=10
```

## Filtering

### Basic Filters

```http
GET /companies?industry=eq.Technology
GET /companies?annual_revenue=gt.1000000
GET /companies?name=ilike.*acme*
```

### Complex Filters

```http
GET /companies?and=(industry.eq.Technology,annual_revenue.gt.1000000)
GET /companies?or=(industry.eq.Technology,industry.eq.Finance)
```

### Available Operators

- `eq` - Equal
- `neq` - Not equal
- `gt` - Greater than
- `gte` - Greater than or equal
- `lt` - Less than
- `lte` - Less than or equal
- `like` - Pattern matching (case-sensitive)
- `ilike` - Pattern matching (case-insensitive)
- `in` - Value in array
- `is` - IS NULL/IS NOT NULL

## Sorting

```http
GET /companies?order=created_at.desc
GET /companies?order=name.asc,created_at.desc
```

## Field Selection

```http
GET /companies?select=id,name,industry
GET /companies?select=*,contacts(*)
```

## Bulk Operations

### Bulk Insert

```http
POST /companies
```

**Request Body:**
```json
[
  {
    "name": "Company 1",
    "industry": "Technology"
  },
  {
    "name": "Company 2",
    "industry": "Finance"
  }
]
```

### Bulk Update

```http
PATCH /companies?id=in.(id1,id2,id3)
```

**Request Body:**
```json
{
  "status": "inactive"
}
```

## Webhooks

### Configure Webhook

```http
POST /rest/v1/webhooks
```

**Request Body:**
```json
{
  "url": "https://your-app.com/webhook",
  "events": ["INSERT", "UPDATE", "DELETE"],
  "table": "companies"
}
```

### Webhook Payload

```json
{
  "type": "INSERT",
  "table": "companies",
  "record": {
    "id": "uuid",
    "name": "New Company"
  },
  "old_record": null
}
```

## SDK Examples

### JavaScript/TypeScript

```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://your-project.supabase.co',
  'your-anon-key'
)

// Get companies
const { data: companies, error } = await supabase
  .from('companies')
  .select('*')
  .order('created_at', { ascending: false })

// Create company
const { data, error } = await supabase
  .from('companies')
  .insert({
    name: 'New Company',
    industry: 'Technology'
  })

// Subscribe to changes
const subscription = supabase
  .channel('companies')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'companies'
  }, (payload) => {
    console.log('Change:', payload)
  })
  .subscribe()
```

### Python

```python
from supabase import create_client, Client

url = "https://your-project.supabase.co"
key = "your-anon-key"
supabase: Client = create_client(url, key)

# Get companies
companies = supabase.table('companies').select('*').execute()

# Create company
company = supabase.table('companies').insert({
    'name': 'New Company',
    'industry': 'Technology'
}).execute()
```

## Testing

### Test Endpoints

```bash
# Test authentication
curl -X POST 'https://your-project.supabase.co/auth/v1/signup' \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@example.com","password":"password123"}'

# Test API endpoint
curl -X GET 'https://your-project.supabase.co/rest/v1/companies' \
  -H 'Authorization: Bearer your-jwt-token' \
  -H 'apikey: your-anon-key'
```

## Best Practices

1. **Use proper authentication** - Always include JWT tokens
2. **Implement error handling** - Handle all possible error responses
3. **Use real-time subscriptions** - For live data updates
4. **Optimize queries** - Use select to limit returned fields
5. **Handle rate limits** - Implement exponential backoff
6. **Use transactions** - For complex operations
7. **Validate input** - Always validate data before sending
8. **Use pagination** - For large datasets
9. **Cache responses** - When appropriate
10. **Monitor usage** - Track API usage and performance
