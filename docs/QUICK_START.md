# TimeIsMoney2 - Quick Start Guide

**Version:** 2.0  
**Last Updated:** 2025-11-09

## 🚀 Quick Installation

### Prerequisites
- PHP 8.1+
- Node.js 18+
- Composer
- MySQL or PostgreSQL

### Installation Steps

1. **Clone Repository**
   ```bash
   git clone <repository-url>
   cd timeismoney2
   ```

2. **Install Dependencies**
   ```bash
   composer install
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   php artisan key:generate
   ```

4. **Database Setup**
   ```bash
   php artisan migrate
   php artisan db:seed
   ```

5. **Build Assets**
   ```bash
   npm run build
   ```

6. **Start Application**
   ```bash
   php artisan serve
   ```

## ⚙️ Essential Configuration

### Environment Variables
```env
APP_NAME="TimeIsMoney2"
APP_ENV=local
APP_KEY=
APP_DEBUG=true
APP_URL=http://localhost:8000

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=timeismoney2
DB_USERNAME=root
DB_PASSWORD=

MAIL_MAILER=smtp
MAIL_HOST=mailpit
MAIL_PORT=1025
MAIL_USERNAME=null
MAIL_PASSWORD=null
MAIL_ENCRYPTION=null
MAIL_FROM_ADDRESS="hello@example.com"
MAIL_FROM_NAME="${APP_NAME}"
```

### Key Services Configuration

#### Stripe Integration
1. Set Stripe keys in `.env`:
   ```env
   STRIPE_KEY=pk_test_...
   STRIPE_SECRET=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

2. Run webhook setup:
   ```bash
   php artisan cashier:webhook
   ```

#### Email Configuration
- Configure SMTP settings in `.env`
- Test email: `php artisan tinker` → `Mail::raw('Test', fn($mail) => $mail->to('test@example.com'))->send();`

#### French Compliance (if applicable)
- Enable French compliance features in config
- Configure legal footer settings
- Set up Chorus Pro integration if needed

## 🔧 Development Setup

### Development Server
```bash
# Backend
php artisan serve

# Frontend (Vite)
npm run dev

# Queue Worker
php artisan queue:work
```

### Testing
```bash
# Run tests
php artisan test

# Run specific test
php artisan test --filter UserTest
```

### Code Quality
```bash
# Linting
npm run lint

# Type checking
npm run type-check

# Format code
npm run format
```

## 📚 Key Features Overview

### Core Functionality
- **Time Tracking**: Start/stop timers with project association
- **Project Management**: Create projects, assign team members
- **Invoicing**: Generate invoices from time entries
- **Expense Tracking**: Log and categorize business expenses
- **Client Management**: Manage client information and contacts
- **Multi-tenant**: Support for multiple organizations

### Advanced Features
- **French Compliance**: FacturX, legal footers, Chorus Pro integration
- **Advance Invoices**: Create deposit invoices (acomptes)
- **Offline Support**: PWA with offline synchronization
- **Multi-language**: English, French, Spanish support
- **Dashboard Widgets**: Customizable dashboard components

## 🚨 Common Issues & Solutions

### Installation Issues
- **Permission errors**: Run `chmod -R 755 storage bootstrap/cache`
- **Database connection**: Verify DB credentials and that MySQL/PostgreSQL is running
- **Node modules**: Clear with `rm -rf node_modules package-lock.json && npm install`

### Development Issues
- **Asset compilation**: Run `npm run build` if changes not reflected
- **Queue jobs**: Ensure worker is running for background jobs
- **Cache issues**: Clear with `php artisan cache:clear` and `php artisan config:clear`

### Production Deployment
- Set `APP_ENV=production` and `APP_DEBUG=false`
- Run `php artisan config:cache` and `php artisan route:cache`
- Configure proper web server (Nginx/Apache) for Laravel
- Set up SSL certificate

## 📖 Additional Documentation

- **Developer Guide**: See `DEVELOPER_GUIDE.md` for detailed development information
- **French Compliance**: See `FRENCH_COMPLIANCE.md` for French invoicing requirements
- **API Documentation**: Access via `/api/docs` when running

## 🆘 Getting Help

1. Check this guide first
2. Review the developer guide
3. Check existing issues in the repository
4. Create a new issue with detailed information

---

**Next Steps**: After installation, explore the dashboard, create your first project, and start tracking time!