# RouteWise

[![SvelteKit](https://img.shields.io/badge/SvelteKit-2.x-FF3E00?style=flat-square&logo=svelte&logoColor=white)](https://kit.svelte.dev/)
[![Svelte](https://img.shields.io/badge/Svelte-5.x-FF3E00?style=flat-square&logo=svelte&logoColor=white)](https://svelte.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4.x-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Convex](https://img.shields.io/badge/Convex-Backend-8B5CF6?style=flat-square)](https://convex.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

> A modern transportation quotation SaaS platform for tour companies and fleet operators in Honduras.

![RouteWise Dashboard](https://img.shields.io/badge/Status-In%20Development-yellow?style=flat-square)

## Overview

RouteWise is a comprehensive fleet management and quotation system designed specifically for transportation companies in Honduras. It streamlines the process of calculating trip costs, generating professional quotations, and managing your fleet of vehicles and drivers.

### Key Features

- **Route Calculation** - Integration with Google Maps API for accurate distance and time calculations
- **Multi-tier Pricing** - Configurable markup options (10-30%) for flexible pricing strategies
- **Currency Support** - Dual currency display (HNL/USD) with real-time exchange rates
- **Cost Management** - Automated calculation of fuel, tolls, meals, and driver expenses
- **Multi-tenant Architecture** - Secure isolation for multiple organizations
- **Dark Mode** - Full dark mode support for comfortable viewing
- **Internationalization** - Support for Spanish and English with browser language detection
- **Responsive Design** - Mobile-first design that works on any device

## Tech Stack

| Category | Technology |
|----------|------------|
| **Framework** | SvelteKit 2.x with Svelte 5 (runes syntax) |
| **Styling** | TailwindCSS 4 with @tailwindcss/vite plugin |
| **UI Components** | Flowbite-svelte |
| **Backend/Database** | Convex (reactive document DB) |
| **Authentication** | WorkOS AuthKit |
| **Maps** | Google Maps JavaScript API |
| **Deployment** | Vercel (frontend) + Convex Cloud (backend) |
| **Language** | TypeScript 5.x |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18.x or higher
- [npm](https://www.npmjs.com/) 9.x or higher
- Google Maps API key
- Convex account
- WorkOS account (for authentication)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/ahvega/routewise.git
   cd routewise
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your credentials:
   ```env
   # Required
   PUBLIC_CONVEX_URL=https://your-project.convex.cloud
   PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key

   # WorkOS Authentication
   WORKOS_API_KEY=sk_live_...
   WORKOS_CLIENT_ID=client_...
   WORKOS_REDIRECT_URI=http://localhost:5173/auth/callback
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Start Convex (in a separate terminal)**
   ```bash
   npx convex dev
   ```

6. **Open your browser**

   Navigate to [http://localhost:5173](http://localhost:5173)

## Project Structure

```
routewise/
├── src/
│   ├── lib/
│   │   ├── components/     # Svelte components
│   │   │   ├── layout/     # Layout components (Navbar, etc.)
│   │   │   └── ui/         # Reusable UI components
│   │   ├── auth/           # WorkOS authentication
│   │   ├── i18n/           # Internationalization (es.json, en.json)
│   │   ├── services/       # Business logic services
│   │   ├── stores/         # Svelte stores
│   │   ├── types/          # TypeScript definitions
│   │   └── utils/          # Utility functions
│   ├── routes/             # SvelteKit file-based routing
│   │   ├── +page.svelte    # Dashboard
│   │   ├── quotations/     # Quotation management
│   │   ├── clients/        # Client management
│   │   ├── vehicles/       # Vehicle fleet
│   │   ├── drivers/        # Driver management
│   │   └── settings/       # System settings
│   ├── app.css             # Global styles
│   ├── app.html            # HTML template
│   └── app.d.ts            # Type definitions
├── convex/
│   └── schema.ts           # Convex database schema
├── static/                 # Static assets
└── package.json
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run check` | TypeScript and Svelte checks |
| `npm run lint` | Run ESLint |
| `npx convex dev` | Start Convex development server |

## Features in Detail

### Quotation System

- Create detailed transportation quotations
- Automatic route calculation with deadhead (repositioning) costs
- Multiple pricing tiers with configurable margins
- Client discounts and payment terms
- Status workflow: Draft → Sent → Approved/Rejected

### Fleet Management

- Vehicle inventory with capacity, fuel efficiency, and costs
- Base location tracking for deadhead calculations
- Ownership tracking (owned vs. rented)
- Maintenance status tracking

### Driver Management

- Driver roster with license tracking
- License expiry alerts
- Emergency contact information
- Daily rate configuration

### Client Management

- Individual and company clients
- Pricing levels (Standard, Preferred, VIP)
- Credit limits and payment terms
- Client-specific discounts

### System Parameters

- Configurable fuel prices
- Driver meal and lodging allowances
- Toll costs for common routes
- Exchange rate management

## Internationalization

RouteWise supports multiple languages with browser-based detection:

- **Spanish (es)** - Primary language
- **English (en)** - Secondary language

Users can manually switch languages using the flag dropdown in the navigation bar.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Commit Convention

This project follows [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Author

**Adalberto H. Vega**

- GitHub: [@ahvega](https://github.com/ahvega)

## Acknowledgments

- [SvelteKit](https://kit.svelte.dev/) - The web framework
- [Flowbite](https://flowbite.com/) - UI component library
- [Convex](https://convex.dev/) - Backend platform
- [TailwindCSS](https://tailwindcss.com/) - CSS framework
- [WorkOS](https://workos.com/) - Authentication provider

---

<p align="center">
  Made with ❤️ in Honduras
</p>
