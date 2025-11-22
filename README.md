<div align="center">

# 🚀 Launch-Ready Inventory Management System

*A modern, full-stack inventory management solution built for the Odoo Hackathon*

[![Next.js](https://img.shields.io/badge/Next.js-15.0-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.0-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![SQLite](https://img.shields.io/badge/SQLite-3.0-003B57?style=for-the-badge&logo=sqlite)](https://sqlite.org/)

*Created by **Decoder** for the Odoo Hackathon*

[Live Demo](#) • [Documentation](#) • [Report Bug](https://github.com/your-repo/issues) • [Request Feature](https://github.com/your-repo/issues)

</div>

---

## 📋 Table of Contents

- [✨ Overview](#-overview)
- [🎯 Features](#-features)
- [🛠️ Tech Stack](#️-tech-stack)
- [🚀 Getting Started](#-getting-started)
- [📁 Project Structure](#-project-structure)
- [🔧 Configuration](#-configuration)
- [📊 Database Schema](#-database-schema)
- [🎨 UI/UX](#-uiux)
- [🔐 Authentication](#-authentication)
- [📈 API Endpoints](#-api-endpoints)
- [🤝 Contributing](#-contributing)
- [📝 License](#-license)
- [👥 Team](#-team)

---

## ✨ Overview

Launch-Ready is a comprehensive inventory management system designed to streamline warehouse operations, track stock levels, and provide real-time insights into inventory movements. Built with modern web technologies, it offers a responsive, intuitive interface for managing products, warehouses, and transactions.

This project was developed by **Decoder** as part of the Odoo Hackathon, demonstrating our commitment to creating innovative solutions for business efficiency.

---

## 🎯 Features

### 🏭 Multi-Warehouse Management
- Create and manage multiple warehouse locations
- Track inventory across different facilities
- Transfer stock between warehouses

### 📦 Product Management
- Comprehensive product catalog with categories
- SKU-based product identification
- Stock level monitoring with reorder alerts
- **Unsplash Integration**: Automatic product imagery fetching
- Grid and table view options

### 📊 Inventory Operations
- **Receipts**: Track incoming stock deliveries
- **Deliveries**: Manage outgoing shipments
- **Transfers**: Internal stock movements
- **Adjustments**: Stock corrections with audit trails

### 📈 Analytics & Reporting
- Real-time dashboard with key metrics
- Stock status indicators (In Stock, Low Stock, Out of Stock)
- Transaction history and audit logs
- Advanced filtering and search capabilities

### 🔐 Security & Authentication
- Secure user authentication with Better Auth
- Role-based access control
- Session management

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: [Next.js 15](https://nextjs.org/) with App Router
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **State Management**: React Hooks
- **Notifications**: [Sonner](https://sonner.emilkowal.ski/)

### Backend
- **Runtime**: Next.js API Routes
- **Database**: [SQLite](https://sqlite.org/) with [Drizzle ORM](https://orm.drizzle.team/)
- **Authentication**: [Better Auth](https://better-auth.com/)
- **Validation**: Built-in TypeScript validation

### External Integrations
- **Unsplash API**: For automatic product imagery
- **Database Migrations**: Drizzle Kit

### Development Tools
- **Package Manager**: npm/bun
- **Linting**: ESLint
- **Code Formatting**: Prettier
- **Type Checking**: TypeScript

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ or Bun
- npm, yarn, pnpm, or bun

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/launch-ready-functionality.git
   cd launch-ready-functionality
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   bun install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```

   Configure the following variables in `.env`:
   ```env
   # Database
   TURSO_CONNECTION_URL=your_database_url
   TURSO_AUTH_TOKEN=your_auth_token

   # Authentication
   BETTER_AUTH_SECRET=your_secret_key

   # External APIs
   NEXT_PUBLIC_UNSPLASH_ACCESS_KEY=your_unsplash_key
   ```

4. **Run database migrations**
   ```bash
   npm run db:push
   # or
   bun run db:push
   ```

5. **Start the development server**
   ```bash
   npm run dev
   # or
   bun run dev
   ```

6. **Open your browser**

   Navigate to [http://localhost:3000](http://localhost:3000) to see the application.

---

## 📁 Project Structure

```
launch-ready-functionality/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   ├── (dashboard)/
│   │   │   ├── products/
│   │   │   ├── receipts/
│   │   │   ├── deliveries/
│   │   │   ├── transfers/
│   │   │   ├── adjustments/
│   │   │   ├── history/
│   │   │   └── dashboard/
│   │   ├── api/
│   │   │   ├── products/
│   │   │   ├── receipts/
│   │   │   ├── deliveries/
│   │   │   ├── transfers/
│   │   │   ├── adjustments/
│   │   │   ├── categories/
│   │   │   └── warehouses/
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── ui/          # shadcn/ui components
│   │   └── app-sidebar.tsx
│   ├── db/
│   │   ├── schema.ts    # Database schema
│   │   └── index.ts     # Database connection
│   ├── lib/
│   │   ├── auth.ts      # Authentication setup
│   │   └── utils.ts     # Utility functions
│   └── hooks/
├── drizzle/             # Database migrations
├── public/              # Static assets
├── .env                 # Environment variables
├── tailwind.config.ts
├── next.config.ts
└── package.json
```

---

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `TURSO_CONNECTION_URL` | Database connection URL | Yes |
| `TURSO_AUTH_TOKEN` | Database authentication token | Yes |
| `BETTER_AUTH_SECRET` | Authentication secret key | Yes |
| `NEXT_PUBLIC_UNSPLASH_ACCESS_KEY` | Unsplash API access key | No |

### Database Setup

The application uses SQLite with Drizzle ORM. Run migrations with:

```bash
npm run db:push
```

---

## 📊 Database Schema

### Core Tables

- **users**: User authentication and profiles
- **warehouses**: Warehouse/facility management
- **categories**: Product categorization
- **products**: Product catalog with inventory tracking
- **product_stock**: Warehouse-specific stock levels
- **receipts**: Incoming stock transactions
- **receipt_items**: Receipt line items
- **deliveries**: Outgoing stock transactions
- **delivery_items**: Delivery line items
- **transfers**: Internal stock movements
- **transfer_items**: Transfer line items
- **adjustments**: Stock corrections
- **stock_ledger**: Complete audit trail

---

## 🎨 UI/UX

- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Dark/Light Mode**: Automatic theme switching
- **Accessible Components**: Built with shadcn/ui for accessibility
- **Loading States**: Skeleton screens and loading indicators
- **Toast Notifications**: User feedback with Sonner
- **Intuitive Navigation**: Sidebar navigation with clear hierarchy

---

## 🔐 Authentication

The application uses Better Auth for secure authentication with:
- Email/password authentication
- Session management
- Secure API routes
- User profile management

---

## 📈 API Endpoints

### Products
- `GET /api/products` - List products with filtering
- `POST /api/products` - Create new product
- `PUT /api/products/[id]` - Update product
- `DELETE /api/products/[id]` - Delete product

### Categories
- `GET /api/categories` - List categories
- `POST /api/categories` - Create category

### Warehouses
- `GET /api/warehouses` - List warehouses
- `POST /api/warehouses` - Create warehouse

### Transactions
- `GET /api/receipts` - List receipts
- `POST /api/receipts` - Create receipt
- `GET /api/deliveries` - List deliveries
- `POST /api/deliveries` - Create delivery
- `GET /api/transfers` - List transfers
- `POST /api/transfers` - Create transfer

---

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Use TypeScript for all new code
- Follow the existing code style
- Write meaningful commit messages
- Test your changes thoroughly
- Update documentation as needed

---

## 📝 License


---

## 👥 Team

**Decoder** - Odoo Hackathon Participants

*Built with ❤️ for the Odoo Hackathon*

---

<div align="center">

**Made with ❤️ by Decoder for the Odoo Hackathon**

⭐ Star this repo if you found it helpful!

[Back to top](#-launch-ready-inventory-management-system)

</div>
