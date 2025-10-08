# Deployment Guide

## Overview

This guide covers deploying SalesQualify to various platforms and environments, from development to production.

## Prerequisites

- Node.js 18+ installed
- Git repository access
- Supabase project configured
- Environment variables ready

## Environment Setup

### Required Environment Variables

Create a `.env.production` file with the following variables:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-production-anon-key

# API Keys
VITE_OPENROUTER_API_KEY=your-openrouter-key
VITE_GOOGLE_SHEETS_API_KEY=your-google-sheets-key

# Application Settings
VITE_APP_NAME=SalesQualify
VITE_APP_VERSION=1.0.0
VITE_APP_ENV=production
```

### Supabase Production Setup

1. **Create Production Project**
   ```bash
   # Create new Supabase project
   npx supabase projects create salesqualify-prod
   ```

2. **Configure Database**
   ```bash
   # Link to production project
   npx supabase link --project-ref your-project-ref
   
   # Run migrations
   npx supabase db push
   ```

3. **Set up Row Level Security**
   ```sql
   -- Enable RLS on all tables
   ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
   ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
   ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
   ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
   ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
   ```

4. **Configure Authentication**
   - Set up email templates
   - Configure OAuth providers (if needed)
   - Set password policies

## Deployment Platforms

### Vercel (Recommended)

Vercel provides excellent support for React applications with automatic deployments.

#### Setup

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   vercel --prod
   ```

#### Configuration

Create `vercel.json`:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "env": {
    "VITE_SUPABASE_URL": "@supabase-url",
    "VITE_SUPABASE_ANON_KEY": "@supabase-anon-key",
    "VITE_OPENROUTER_API_KEY": "@openrouter-key"
  },
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ]
}
```

#### Environment Variables in Vercel

1. Go to your project dashboard
2. Navigate to Settings > Environment Variables
3. Add all required variables
4. Set them for Production, Preview, and Development

### Netlify

#### Setup

1. **Build Configuration**
   Create `netlify.toml`:

   ```toml
   [build]
     command = "npm run build"
     publish = "dist"

   [build.environment]
     NODE_VERSION = "18"

   [[redirects]]
     from = "/*"
     to = "/index.html"
     status = 200

   [[headers]]
     for = "/*"
     [headers.values]
       X-Frame-Options = "DENY"
       X-XSS-Protection = "1; mode=block"
       X-Content-Type-Options = "nosniff"
   ```

2. **Deploy**
   ```bash
   # Build the project
   npm run build
   
   # Deploy to Netlify
   npx netlify deploy --prod --dir=dist
   ```

### AWS S3 + CloudFront

#### Setup

1. **Create S3 Bucket**
   ```bash
   aws s3 mb s3://salesqualify-prod
   ```

2. **Configure Bucket**
   ```bash
   # Enable static website hosting
   aws s3 website s3://salesqualify-prod --index-document index.html --error-document index.html
   
   # Set bucket policy for public read
   aws s3api put-bucket-policy --bucket salesqualify-prod --policy file://bucket-policy.json
   ```

3. **Build and Deploy**
   ```bash
   npm run build
   aws s3 sync dist/ s3://salesqualify-prod --delete
   ```

4. **CloudFront Distribution**
   - Create CloudFront distribution
   - Set S3 bucket as origin
   - Configure custom error pages for SPA routing

### Docker Deployment

#### Dockerfile

```dockerfile
# Multi-stage build
FROM node:18-alpine as builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built application
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
```

#### nginx.conf

```nginx
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    server {
        listen 80;
        server_name localhost;
        root /usr/share/nginx/html;
        index index.html;

        # Gzip compression
        gzip on;
        gzip_vary on;
        gzip_min_length 1024;
        gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header Referrer-Policy "no-referrer-when-downgrade" always;
        add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

        # Handle client-side routing
        location / {
            try_files $uri $uri/ /index.html;
        }

        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}
```

#### Build and Run

```bash
# Build Docker image
docker build -t salesqualify .

# Run container
docker run -p 80:80 -e VITE_SUPABASE_URL=your-url -e VITE_SUPABASE_ANON_KEY=your-key salesqualify
```

### Kubernetes Deployment

#### deployment.yaml

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: salesqualify
spec:
  replicas: 3
  selector:
    matchLabels:
      app: salesqualify
  template:
    metadata:
      labels:
        app: salesqualify
    spec:
      containers:
      - name: salesqualify
        image: salesqualify:latest
        ports:
        - containerPort: 80
        env:
        - name: VITE_SUPABASE_URL
          valueFrom:
            secretKeyRef:
              name: salesqualify-secrets
              key: supabase-url
        - name: VITE_SUPABASE_ANON_KEY
          valueFrom:
            secretKeyRef:
              name: salesqualify-secrets
              key: supabase-anon-key
---
apiVersion: v1
kind: Service
metadata:
  name: salesqualify-service
spec:
  selector:
    app: salesqualify
  ports:
  - port: 80
    targetPort: 80
  type: LoadBalancer
```

## Database Migration

### Production Migration

```bash
# Run migrations
npx supabase db push --db-url "postgresql://user:password@host:port/database"

# Or using Supabase CLI
npx supabase db push --project-ref your-project-ref
```

### Migration Scripts

Create migration scripts for production:

```bash
#!/bin/bash
# migrate.sh

echo "Starting database migration..."

# Backup current database
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Run migrations
npx supabase db push

echo "Migration completed successfully!"
```

## SSL/HTTPS Configuration

### Let's Encrypt (Nginx)

```bash
# Install certbot
sudo apt-get install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d yourdomain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Cloudflare SSL

1. Add domain to Cloudflare
2. Update nameservers
3. Enable SSL/TLS encryption
4. Configure security settings

## Monitoring and Logging

### Application Monitoring

#### Sentry Integration

```typescript
// src/main.tsx
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "your-sentry-dsn",
  environment: process.env.NODE_ENV,
});
```

#### Analytics

```typescript
// Google Analytics
import { gtag } from 'ga-gtag';

gtag('config', 'GA_MEASUREMENT_ID', {
  page_title: 'SalesQualify',
  page_location: window.location.href,
});
```

### Logging

#### Structured Logging

```typescript
// src/lib/logger.ts
export const logger = {
  info: (message: string, data?: any) => {
    console.log(JSON.stringify({
      level: 'info',
      message,
      data,
      timestamp: new Date().toISOString()
    }));
  },
  error: (message: string, error?: Error) => {
    console.error(JSON.stringify({
      level: 'error',
      message,
      error: error?.stack,
      timestamp: new Date().toISOString()
    }));
  }
};
```

## Performance Optimization

### Build Optimization

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
          utils: ['date-fns', 'lodash']
        }
      }
    }
  }
});
```

### CDN Configuration

```typescript
// Use CDN for static assets
const CDN_URL = 'https://cdn.salesqualify.com';

export const getAssetUrl = (path: string) => {
  return `${CDN_URL}/${path}`;
};
```

## Security Configuration

### Content Security Policy

```html
<!-- index.html -->
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  connect-src 'self' https://*.supabase.co;
  font-src 'self' data:;
">
```

### Environment Security

```bash
# Secure environment variables
export VITE_SUPABASE_URL="https://your-project.supabase.co"
export VITE_SUPABASE_ANON_KEY="your-anon-key"

# Never commit sensitive data
echo ".env.local" >> .gitignore
echo ".env.production" >> .gitignore
```

## Backup and Recovery

### Database Backup

```bash
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="backup_${DATE}.sql"

# Create backup
pg_dump $DATABASE_URL > $BACKUP_FILE

# Upload to S3
aws s3 cp $BACKUP_FILE s3://salesqualify-backups/

# Cleanup local file
rm $BACKUP_FILE

echo "Backup completed: $BACKUP_FILE"
```

### Application Backup

```bash
#!/bin/bash
# app-backup.sh

# Backup application files
tar -czf app-backup-$(date +%Y%m%d).tar.gz dist/

# Upload to S3
aws s3 cp app-backup-$(date +%Y%m%d).tar.gz s3://salesqualify-backups/app/
```

## Health Checks

### Application Health Check

```typescript
// src/api/health.ts
export const healthCheck = async () => {
  try {
    // Check database connection
    const { data, error } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);

    if (error) throw error;

    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected'
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    };
  }
};
```

### Load Balancer Health Check

```nginx
# nginx.conf
location /health {
    access_log off;
    return 200 "healthy\n";
    add_header Content-Type text/plain;
}
```

## Rollback Strategy

### Database Rollback

```bash
#!/bin/bash
# rollback.sh

BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: ./rollback.sh <backup-file>"
    exit 1
fi

# Restore from backup
psql $DATABASE_URL < $BACKUP_FILE

echo "Database rolled back to: $BACKUP_FILE"
```

### Application Rollback

```bash
#!/bin/bash
# app-rollback.sh

VERSION=$1

if [ -z "$VERSION" ]; then
    echo "Usage: ./app-rollback.sh <version>"
    exit 1
fi

# Deploy previous version
vercel --prod --confirm --token $VERCEL_TOKEN

echo "Application rolled back to version: $VERSION"
```

## Troubleshooting

### Common Issues

1. **Build Failures**
   ```bash
   # Clear cache and reinstall
   rm -rf node_modules package-lock.json
   npm install
   npm run build
   ```

2. **Environment Variables**
   ```bash
   # Check environment variables
   echo $VITE_SUPABASE_URL
   echo $VITE_SUPABASE_ANON_KEY
   ```

3. **Database Connection**
   ```bash
   # Test database connection
   npx supabase db ping
   ```

4. **SSL Issues**
   ```bash
   # Check SSL certificate
   openssl s_client -connect yourdomain.com:443
   ```

### Log Analysis

```bash
# View application logs
docker logs salesqualify-container

# View nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

## Maintenance

### Regular Tasks

1. **Update Dependencies**
   ```bash
   npm update
   npm audit fix
   ```

2. **Database Maintenance**
   ```sql
   -- Analyze tables
   ANALYZE companies;
   ANALYZE contacts;
   ANALYZE deals;
   ANALYZE activities;
   ```

3. **Backup Verification**
   ```bash
   # Test backup restoration
   psql $DATABASE_URL < test-backup.sql
   ```

4. **Security Updates**
   ```bash
   # Update system packages
   sudo apt update && sudo apt upgrade
   ```

## Support

For deployment issues:

- Check the [troubleshooting section](#troubleshooting)
- Review application logs
- Contact support: support@salesqualify.com
- Create an issue on GitHub
