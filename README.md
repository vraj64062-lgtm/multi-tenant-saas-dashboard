# Multi-Tenant SaaS Analytics Dashboard

A fully-featured, production-ready full-stack Multi-Tenant Software-as-a-Service (SaaS) analytics dashboard designed with React, Node.js with Express, Tailwind CSS, and Prisma ORM.

## 🚀 Key Architecture Highlights

1. **Strict Multi-Tenancy Isolation**:
   - An `Organization` is the tenant. Every user belongs to exactly one Organization.
   - All analytics logs, workspace configurations, and invites are scoped to an `organizationId`.
   - Security is enforced cryptographically at the database query level (by matching `req.user.organizationId` parsed from the server-verified JWT token), ensuring that no tenant can ever see or alter another tenant's metrics.

2. **Secure JWT Authentication**:
   - Signups create a brand new `Organization` and make the signing-up user an `"ADMIN"`.
   - JWT logins produce a short-lived Access Token (15 mins, in memory) and a long-lived Refresh Token (7 days, set in a secure `httpOnly` cookie).
   - Silent refresh token rotation is built-in, seamlessly refreshing sessions on page loads or access token expirations.

3. **Role-Based Security Middleware (RBAC)**:
   - Two default roles: `"ADMIN"` and `"MEMBER"`.
   - Access to member additions, member removal, and Stripe billing setups is restricted exclusively to `"ADMIN"` users on both the Express backend routing layer and the React user interface.

4. **Dynamic Analytics Charts**:
   - Clean summary metrics (Active Users, Page Views, Signups, and Revenue).
   - Dynamic charts powered by Recharts (Line Chart for revenue trends and Bar Chart for active user engagement).
   - Live traffic simulator buttons allowing administrators or members to inject mock activity logs instantly.

5. **Stripe Billing Integration**:
   - Starts real Stripe Checkout sessions (test mode) linked to the tenant's `organizationId`.
   - Dedicated webhook endpoint to securely process `checkout.session.completed` and `customer.subscription.deleted` to instantly upgrade or downgrade organizations.
   - Features built-in Sandbox Simulation controls to mock Stripe upgrades/downgrades on-the-fly for quick local preview environments.

---

## 📂 Folder Structure

The project has been organized according to strict clean-code boundaries:

```
├── prisma/
│   └── schema.prisma      # Prisma Relational Schema (configured with SQLite for preview)
├── src/
│   ├── api/
│   │   └── client.ts      # Custom Fetch client with auto-JWT token refresh handling
│   ├── components/
│   │   └── Navbar.tsx     # Unified header navigation & session tags
│   ├── context/
│   │   └── AuthContext.tsx # Centralized global React Auth state manager
│   ├── controllers/
│   │   ├── admin.ts       # Workspace member, invite, and user control handlers
│   │   ├── analytics.ts   # Scoped tenant-isolated database query handlers
│   │   ├── auth.ts        # Password hashing, token generations, login & signup handlers
│   │   └── stripe.ts      # Stripe session creations, webhooks, and sandbox controllers
│   ├── hooks/
│   │   # React custom hooks
│   ├── middleware/
│   │   └── auth.ts        # Express JWT validator & role-based middleware
│   ├── pages/
│   │   ├── AdminPanel.tsx # Administrative cockpit (invites, deletions, billing, simulations)
│   │   ├── Dashboard.tsx  # Charts & stats dashboard with simulator buttons
│   │   ├── Login.tsx      # Sign-in form
│   │   └── Signup.tsx     # Org creator & Join invitation form
│   ├── routes/
│   │   ├── admin.ts       # Admin panel backend routing maps
│   │   ├── analytics.ts   # Analytics logs backend routing maps
│   │   ├── auth.ts        # Session authentication backend routing maps
│   │   └── stripe.ts      # Stripe checkout and webhook backend routing maps
│   ├── App.tsx            # Unified layout router & coordinate client gates
│   ├── index.css          # Tailwind CSS style declarations
│   └── main.tsx           # React entrypoint
├── server.ts              # Custom full-stack Express server
├── package.json           # App script configurations & node packages
└── tsconfig.json          # TypeScript configurations
```

---

## 🛠️ Local Installation & Running Guide

### 1. Prerequisites
Ensure you have the following installed on your machine:
- [Node.js](https://nodejs.org) (v18+ recommended)
- [npm](https://www.npmjs.com)

### 2. Clone and Install Dependencies
Navigate to the root directory of the project in your terminal and run:
```bash
npm install
```

### 3. Database Initialization
This project uses SQLite out-of-the-box for portability within development environments. To create your database file and generate the Prisma Client, run:
```bash
npx prisma db push
```

### 4. Configuration Environment (.env)
Create a `.env` file at the root of your project by copying `.env.example`:
```bash
cp .env.example .env
```
Fill in the secrets:
```env
# Secret key to sign JWT tokens
JWT_SECRET="YOUR_RANDOM_JWT_SECRET_KEY"

# Self-referential URL where your local server runs
APP_URL="http://localhost:3000"

# Stripe Test Keys (Optional, required for real Stripe billing checkout)
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PRICE_ID="price_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
```

### 5. Running the Application
To launch the full-stack development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser. 

### 6. Production Compilations
To compile both the React frontend and bundle the custom server for production deployment:
```bash
npm run build
```
Launch the compiled standalone production server:
```bash
npm start
```
This serves compiled high-performance client assets directly from `dist/` and runs the production Express API.
