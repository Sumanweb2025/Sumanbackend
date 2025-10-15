# Iyappaa Website Backend - Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Architecture & Flow](#architecture--flow)
4. [Folder Structure](#folder-structure)
5. [Database Schema](#database-schema)
6. [API Endpoints](#api-endpoints)
7. [Controllers Logic](#controllers-logic)
8. [Middleware & Security](#middleware--security)
9. [Services](#services)
10. [Environment Setup](#environment-setup)
11. [Installation & Development](#installation--development)

---

## Project Overview

**Iyappaa Website Backend** is a Node.js/Express REST API for a multi-brand ecommerce platform featuring JWT authentication, dual payment gateways (Stripe & COD), automated emails, PDF generation, and AI recommendations.

### Key Features
1. RESTful API with 16 route modules  
2. JWT + Google OAuth authentication  
3. Stripe payment integration + COD  
4. Automated email system (order confirmations, invoices)  
5. Dynamic PDF generation (PDFKit)  
6. Guest checkout support  
7. Admin dashboard with analytics  
8. AI-powered product recommendations  
9. Base64 image storage in MongoDB  
10. Scheduled cleanup jobs (node-cron)  

---

## Technology Stack

| Category | Technologies |
|----------|-------------|
| **Runtime** | Node.js 18+ |
| **Framework** | Express.js 5.1.0 |
| **Database** | MongoDB (Mongoose 8.16.3) |
| **Authentication** | JWT 9.0.2, bcrypt 6.0.0, google-auth-library 10.2.1 |
| **Payments** | Stripe 18.4.0 |
| **Email** | Nodemailer 7.0.5 |
| **PDF** | PDFKit 0.17.1 |
| **File Upload** | Multer 2.0.2 |
| **Security** | express-rate-limit 8.1.0, express-validator 7.2.1 |
| **Utilities** | cors, dotenv, crypto, qrcode 1.5.4, uuid 13.0.0 |
| **Scheduling** | node-cron 4.2.1 |
| **Dev Tools** | nodemon 3.1.10 |

---

## Architecture & Flow

### Design Pattern
**MVC + Services Architecture**

```
Request → Express Middleware → Router → Auth Middleware → Controller → Model → Service → Response
```

### Application Flow
```
index.js (Entry Point)
├── DB Connection (MongoDB)
├── Middleware Setup (CORS, Body Parser, Rate Limiting)
├── Static File Serving (/images/Products)
├── Main Router (aggregates all sub-routers)
├── Scheduled Jobs (Guest data cleanup - Daily 2 AM)
└── Server Start (PORT 8000)
```

### MongoDB Collections (16 Total)
users, products, orders, payments, carts, wishlists, reviews, coupons, subscriptions, contacts, testimonials, offers, recommendations, userbehaviors, refunds, datas

---

## Folder Structure

```
Sumanbackend/
├── index.js                    # Entry point 
├── package.json                # Dependencies
├── .env                        # Environment variables
│
├── DB_Connection/
│   └── db_connection.js        # MongoDB connection
│
├── Controllers/                
│   ├── auth.controller.js      # Auth & user 
│   ├── payment.controller.js   # Payments 
│   ├── order.controller.js     # Orders 
│   ├── admin.controller.js     # Admin 
│   ├── cart.controller.js      # Cart 
│   ├── wishlist.controller.js  # Wishlist 
│   ├── Product.controller.js   # Products 
│   ├── Review.controller.js    # Reviews 
│   ├── recommendation.controller.js  # AI 
│   ├── contact.controller.js   # Contact 
│   ├── subscription.controller.js  # Newsletter 
│   ├── offer.controller.js     # Offers
│   ├── testimonial.controller.js  # Testimonials
│   └── data.controller.js      # Static data
│
├── Models/                     
│   ├── user.model.js           
│   ├── order.model.js          
│   ├── payment.model.js        
│   ├── product.model.js
│   ├── cart.model.js
│   ├── wishlist.model.js
│   ├── Review.model.js
│   ├── coupon.model.js
│   ├── subscription.model.js
│   ├── contact.model.js
│   ├── testimonial.model.js
│   ├── offer.model.js
│   ├── recommendation.model.js
│   ├── userBehavior.model.js
│   ├── refund.model.js
│   └── data.model.js
│
├── Routers/                    
│   ├── router.js               # Main router
│   ├── auth.router.js
│   ├── product.router.js
│   ├── cart.router.js
│   ├── wishlist.router.js
│   ├── order.router.js
│   ├── payment.router.js
│   ├── Review.router.js
│   ├── admin.router.js
│   ├── contact.router.js
│   ├── subscription.router.js
│   ├── offer.router.js
│   ├── testimonial.router.js
│   ├── recommendation.router.js
│   ├── data.router.js
│   └── download-invoice.router.js
│
├── Middleware/
│   ├── auth.middleware.js      # JWT auth 
│   ├── admin.middleware.js     # Admin check
│   ├── multer.congif.js        # File upload
│
├── Services/
│   ├── mailer.js               # Email service 
│   ├── pdfGenerator.js         # PDF generation 
│   ├── invoice.js              # Invoice logic
│   ├── recommendationEngine.js # AI recommendations
│   └── AdminNotification.service.js
│
├── Utils/
│   └── guestMigration.js       # Guest→User migration
│
├── Scripts/                    # Utility scripts
├── Data/                       # JSON data files
│   ├── website_data.json       
│   └── website_data_1.json     
│
├── Iyappaa/Product1/           # Product images 
├── public/                     # Public assets
└── uploads/                    # User uploads
```

---

## Database Schema

### Complete Schema Overview
The backend uses **16 MongoDB collections** with Mongoose ODM:

1. **User** - User accounts (auth, profiles, addresses)
2. **Product** - Product catalog (items, pricing, inventory)
3. **Order** - Customer orders (items, addresses, status)
4. **Payment** - Payment records (transactions, PDFs, logs)
5. **Cart** - Shopping carts (user + guest carts)
6. **Wishlist** - Saved products (user + guest wishlists)
7. **Review** - Product reviews and ratings
8. **Coupon** - Discount coupons
9. **Offer** - Special offers and promotions
10. **Subscription** - Newsletter subscribers
11. **Contact** - Contact form submissions
12. **Testimonial** - Customer testimonials
13. **Recommendation** - AI-powered product recommendations
14. **UserBehavior** - User activity tracking
15. **Refund** - Refund requests and processing
16. **Data** - Static configuration data

### Key Schema Features

#### User Schema Highlights
- Dual authentication (local + Google OAuth)
- Base64 image storage in MongoDB (max 16MB)
- Phone number with country code support
- Password reset with OTP
- Email verification
- Profile image management with fallbacks

#### Order Schema Highlights
- Guest order support (sessionId)
- Auto-generated order numbers (ORD{timestamp}{random})
- Cancellation system (48-hour window)
- Refund tracking
- Multiple payment methods (card, COD)
- Applied coupon tracking

#### Payment Schema Highlights
- PDF storage in MongoDB (Buffer)
- Payment logs for audit trail
- Email delivery status tracking
- Stripe payment integration
- Auto-generated payment IDs

#### Cart & Wishlist Schema Highlights
- Guest session support
- Auto-expiration for guest data (7 days)
- TTL indexes for automatic cleanup
- Total amount auto-calculation

---


## API Endpoints

### Auth (`/api/auth`)
```
POST   /signup                 - Register
POST   /login                  - Login
POST   /google-login           - Google OAuth
GET    /profile                - Get profile (Auth)
PUT    /profile                - Update profile (Auth)
PUT    /profile/image          - Upload image (Auth)
DELETE /profile/image          - Delete image (Auth)
POST   /forgot-password        - Request OTP
POST   /verify-otp             - Verify OTP
POST   /reset-password         - Reset password
```

### Products (`/api/products`)
```
GET    /                       - All products (pagination, filters)
GET    /:id                    - Single product
GET    /category/:category     - By category
GET    /brand/:brand           - By brand
POST   /                       - Create (Admin)
PUT    /:id                    - Update (Admin)
DELETE /:id                    - Delete (Admin)
```

### Cart (`/api/cart`)
```
GET    /                       - Get cart (Auth/Guest)
POST   /                       - Add to cart
PUT    /:productId             - Update quantity
DELETE /:productId             - Remove item
DELETE /                       - Clear cart
```

### Wishlist (`/api/wishlist`)
```
GET    /                       - Get wishlist (Auth/Guest)
POST   /                       - Add to wishlist
DELETE /:productId             - Remove from wishlist
```

### Orders (`/api/orders`)
```
GET    /                       - User orders (Auth)
GET    /:orderId               - Order details
POST   /                       - Create order
PUT    /:orderId/cancel        - Cancel order (Auth)
GET    /:orderId/track         - Track order
```

### Payments (`/api/payments`)
```
POST   /create-intent          - Stripe payment intent (Auth/Guest)
POST   /stripe-webhook         - Stripe webhook
POST   /cod                    - Cash on delivery (Auth/Guest)
POST   /refund/:orderId        - Process refund (Admin)
```

### Reviews (`/api/reviews`)
```
GET    /product/:productId     - Product reviews
POST   /                       - Add review (Auth)
PUT    /:reviewId              - Update review (Auth)
DELETE /:reviewId              - Delete review (Auth)
```

### Admin (`/api/admin`)
```
GET    /users                  - All users
GET    /orders                 - All orders
PUT    /orders/:id/status      - Update order status
GET    /analytics              - Analytics data
POST   /products               - Add product
PUT    /products/:id           - Update product
DELETE /products/:id           - Delete product
```

### Recommendations (`/api/recommendations`)
```
GET    /:userId                - Get recommendations
POST   /track                  - Track user behavior
```

### Invoices (`/api/invoices`)
```
GET    /:paymentId/order-confirmation  - Download PDF
GET    /:paymentId/invoice             - Download PDF
GET    /:paymentId/bill                - Download PDF
```

### Contact & Subscription
```
POST   /api/contact            - Submit contact form
POST   /api/subscription/subscribe   - Subscribe
POST   /api/subscription/unsubscribe - Unsubscribe
```

---

## Middleware & Security

### 1. Auth Middleware (109 lines)
```javascript
authMiddleware()
// - Extracts JWT from Authorization header
// - Verifies token with JWT_SECRET
// - Checks user exists & is active
// - Sets req.user
// - Returns 401 if invalid

optionalAuthMiddleware()
// - Allows both authenticated users & guests
// - Checks Authorization header OR X-Session-ID header
// - Sets req.user.isGuest = true/false
```

### 2. Admin Middleware
```javascript
// Checks req.user.role === 'admin'
// Returns 403 if not admin
```

### 3. Multer Config
```javascript
// Memory storage (no disk write)
// Allowed types: JPEG, PNG, GIF, WebP
// Max file size: 5MB
// Used for profile image uploads
```

### Security Features
- **JWT Authentication**: Signed tokens with expiration
- **Bcrypt Hashing**: 12 salt rounds for passwords
- **Rate Limiting**: 
  - Signup: 5 per IP per 15 min
  - OTP: 3 per IP per 5 min
  - IP blocking: 10 attempts per 15 min
  - Phone blocking: 5 attempts per 30 min
- **Input Validation**: express-validator
- **CORS**: Configured for frontend origin
- **Environment Variables**: Sensitive data in .env

---

## Services

### 1. Email Service 
**Features**: 
- Order confirmation emails
- Invoice emails
- Bill emails
- Admin notifications
- Newsletter emails
- Password reset OTP emails

**Integration**: Nodemailer with SMTP (Gmail/SendGrid/etc.)

**Templates**: HTML email templates with inline CSS

### 2. PDF Generator Service 
**Features**:
- Order Confirmation PDF
- Invoice PDF
- Bill PDF
- QR Code generation (order tracking)
- Company logo, order details, itemized list
- Order summary with tax/shipping breakdown

**Storage**: PDFs stored as Buffer in MongoDB 

**Library**: PDFKit for dynamic PDF creation

### 3. Recommendation Engine
**Algorithm**:
- Collaborative filtering
- Content-based recommendations
- User behavior tracking
- Purchase history analysis
- View/cart/purchase weighting

### 4. Admin Notification Service
**Triggers**: New order, cancellation, refund request

**Channels**: Email notifications to admin

### 5. Invoice Service
**Logic**: Business rules for invoice generation

---

## Environment Setup

---

### Setup Instructions

#### 1. Gmail App Password
- Enable 2FA on Google Account
- Generate App Password: Security → App passwords
- Use generated password as EMAIL_PASSWORD

#### 2. Twilio SMS
- Sign up at https://www.twilio.com
- Get Account SID, Auth Token from console
- Buy phone number

#### 3. Stripe Integration
- Create account at https://stripe.com
- Get API keys from Developers → API keys
- Setup webhook for `/api/payments/stripe-webhook`

#### 4. MongoDB Atlas
- Create cluster at https://www.mongodb.com/cloud/atlas
- Create database user
- Whitelist IP or use 0.0.0.0/0 for all IPs
- Copy connection string

---

## Installation & Development

### Prerequisites
- Node.js 18+
- MongoDB installed locally OR MongoDB Atlas account
- Stripe account (for payments)
- Gmail account (for emails)

### Installation Steps

```bash
# 1. Navigate to backend folder
cd Sumanbackend

# 2. Install dependencies
npm install

# 3. Create .env file
cp .env.example .env
# Edit .env with your configuration

# 4. Start MongoDB (if local)
mongod

# 5. Start development server
npm run dev
# OR for production
npm start
```

### Development Server
```bash
# With nodemon (auto-restart on file changes)
npm run dev

# Without nodemon
npm start

# Server runs on: http://localhost:8000
```

### Testing Endpoints
```bash
# Test base endpoint
curl http://localhost:8000/

# Expected response
"Welcome to Suman!"
```

### Scheduled Jobs
```javascript
// Guest data cleanup
// Runs daily at 2:00 AM
// Deletes expired guest carts/wishlists (30+ days old)
cron.schedule('0 2 * * *', cleanupExpiredGuestData);
```

---

## Deployment to Hostinger(Check deployment document)

### Production Build Steps
```bash
# 1. Install production dependencies only
npm install --production

# 2. Set NODE_ENV
export NODE_ENV=production

# 3. Start server
npm start
```

### Deployment Platforms
- **Heroku**: `git push heroku main`
- **AWS EC2**: PM2 + Nginx reverse proxy
- **DigitalOcean**: Droplet with PM2
- **Railway**: Connect GitHub repo
- **Render**: Web service deployment

### PM2 Process Manager
```bash
# Install PM2
npm install -g pm2

# Start app
pm2 start index.js --name suman-backend

# Monitor
pm2 monit

# Logs
pm2 logs

# Restart
pm2 restart suman-backend
```

### Nginx Reverse Proxy
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Environment Variables in Production
- Set all .env variables in platform's environment config
- Never commit .env to Git
- Use secure, random strings for JWT_SECRET
- Use production Stripe keys
- Configure email service (SendGrid recommended for production)

### Database Backup
```bash
# MongoDB dump
mongodump --uri="mongodb+srv://..." --out=backup/

# Restore
mongorestore --uri="mongodb+srv://..." backup/
```

---

## Additional Resources

### API Testing
- **Postman Collection**: Create collection with all endpoints
- **Thunder Client**: VS Code extension

### Documentation Tools
- **Swagger**: Generate API documentation
- **Postman**: Share API collection

### Monitoring
- **Morgan**: HTTP request logger
- **Winston**: Advanced logging
- **Sentry**: Error tracking

---
