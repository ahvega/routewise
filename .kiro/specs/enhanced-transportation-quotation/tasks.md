# RouteWise Implementation Plan

**Project**: RouteWise (formerly PlannerTours)
**Version**: 2.0 - SaaS Transformation
**Timeline**: 14-18 weeks
**Status**: Planning Phase

---

## Overview

This document outlines the phased implementation plan for transforming PlannerTours into RouteWise, a multi-tenant SaaS platform. The plan follows the development roadmap with 10 distinct phases over 18 weeks.

### Technology Stack

- **Frontend**: SvelteKit 2.x + TypeScript 5.x
- **Styling**: Tailwind CSS 4 + Flowbite-svelte
- **Backend**: Convex (reactive database + serverless)
- **Auth**: WorkOS AuthKit
- **Deployment**: Vercel (frontend) + Convex Cloud (backend)
- **PDF**: Puppeteer
- **Email**: Resend
- **Maps**: Google Maps JavaScript API
- **Monitoring**: Sentry

### Key Milestones

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| Phase 0 | Weeks 1-2 | Team trained, project initialized |
| Phase 1 | Weeks 2-4 | Auth & multi-tenancy working |
| Phase 2 | Week 5 | Business logic ported |
| Phase 3 | Week 6 | Client management complete |
| Phase 4 | Weeks 7-8 | Quotation system complete |
| Phase 5 | Week 9 | PDF & email working |
| Phase 6 | Week 10 | Driver management complete |
| Phase 7 | Weeks 11-12 | Itinerary system complete |
| Phase 8 | Weeks 13-14 | Invoice system complete |
| Phase 9 | Week 15 | Expense advances complete |
| Phase 10 | Weeks 16-18 | Dashboard, reports, launch prep |

---

## Phase 0: Learning & Project Setup (Weeks 1-2)

### Week 1: Team Training

- [ ] 1.1 Complete Svelte Tutorial
  - Each team member completes official Svelte tutorial
  - Understand reactivity (`$:`, `bind:`, stores)
  - Practice component composition
  - Compare with React patterns
  - _Requirements: All (foundation)_

- [ ] 1.2 Complete SvelteKit Tutorial
  - Learn file-based routing (`+page.svelte`, `+layout.svelte`)
  - Understand SSR vs client-side rendering
  - Learn form actions and progressive enhancement
  - Master load functions (`+page.ts`, `+page.server.ts`)
  - _Requirements: All (foundation)_

- [ ] 1.3 Complete Convex Tutorial
  - Learn schema definition
  - Understand mutations and queries
  - Practice real-time subscriptions
  - Master TypeScript integration
  - _Requirements: All (foundation)_

### Week 2: Project Initialization

- [ ] 2.1 Create accounts and configure services
  - Create Convex account (convex.dev)
  - Create WorkOS account (workos.com)
  - Create Vercel account (vercel.com)
  - Create Resend account (resend.com)
  - Create Sentry account (sentry.io)
  - Verify Google Maps API key
  - _Requirements: All (infrastructure)_

- [ ] 2.2 Initialize SvelteKit project
  - Create new SvelteKit project with TypeScript
  - Install Tailwind CSS 4 with @tailwindcss/vite
  - Install Flowbite-svelte and Flowbite-svelte-icons
  - Install Convex and initialize
  - Install WorkOS, Resend, Puppeteer, Google Maps loader
  - Configure vite.config.ts for Tailwind CSS 4
  - _Requirements: 19 (UI/UX)_

- [ ] 2.3 Configure dark mode as default
  - Set up app.html with `class="dark"` on html element
  - Create theme store (src/lib/stores/theme.ts)
  - Implement ThemeToggle component with sun/moon icons
  - Configure Tailwind for dark mode (`darkMode: 'class'`)
  - Test theme persistence to localStorage
  - _Requirements: 19.1, 19.2_

- [ ] 2.4 Set up project structure
  - Create directory structure (routes, lib, components, stores)
  - Set up environment variables (.env.local)
  - Configure Convex deployment
  - Set up CI/CD with Vercel
  - Configure Sentry error tracking
  - _Requirements: All (foundation)_

**Phase 0 Deliverables**:
- ✅ Team trained on Svelte, SvelteKit, Convex
- ✅ Project initialized and deployed to Vercel
- ✅ Dark mode working with theme toggle
- ✅ CI/CD pipeline operational

---

## Phase 1: Foundation (Weeks 2-4)

### Week 2 (continued): Convex Schema

- [ ] 3.1 Define complete Convex schema
  - Create schema.ts with all tables (tenants, users, vehicles, clients, etc.)
  - Define indexes for common queries
  - Set up tenant isolation patterns
  - Document schema relationships
  - Deploy schema to Convex
  - _Requirements: 1 (multi-tenancy), 2-21 (all entities)_

### Week 3: Authentication with WorkOS

- [ ] 3.2 Implement WorkOS authentication
  - Set up WorkOS AuthKit integration
  - Create auth routes (login, signup, callback)
  - Implement sign-up flow (creates tenant + user)
  - Implement sign-in flow
  - Implement sign-out
  - Create auth middleware/guards (hooks.server.ts)
  - Implement session management
  - _Requirements: 2 (authentication)_

### Week 4: User & Tenant Management

- [ ] 3.3 Build user and tenant management
  - Create tenant on signup
  - Build user profile page
  - Build user settings page
  - Implement team member invitation
  - Create role management (admin, sales, operations, finance, viewer)
  - Build user list for admins
  - Create tenant settings page
  - _Requirements: 2 (user management), 1 (multi-tenancy)_

**Phase 1 Deliverables**:
- ✅ Database schema deployed to Convex
- ✅ Authentication working (sign-up, sign-in, sign-out)
- ✅ Tenant created on signup
- ✅ User roles defined and enforced
- ✅ Admin can invite team members

---

## Phase 2: Data Migration & Business Logic (Week 5)

- [ ] 4.1 Port cost calculation service
  - Copy CostCalculationService.ts to src/lib/services/
  - Remove React dependencies
  - Adapt for Svelte (pure TypeScript)
  - Test calculations match existing app
  - _Requirements: 7 (cost calculation)_

- [ ] 4.2 Port route calculation service
  - Copy RouteCalculatorService.ts to src/lib/services/
  - Adapt Google Maps integration for Svelte
  - Test route calculations
  - _Requirements: 6 (quotation generation)_

- [ ] 4.3 Port utility functions
  - Copy unitConversion.ts (direct copy)
  - Copy formatting.ts (direct copy)
  - Copy validation.ts (direct copy)
  - Test all utility functions
  - _Requirements: 7, 8 (calculations and parameters)_

- [ ] 4.4 Migrate vehicle and parameter data
  - Create Convex mutation for seeding vehicles
  - Create Convex mutation for seeding parameters
  - Migrate data from JSON files to Convex
  - Verify data integrity
  - _Requirements: 4 (vehicle management), 8 (parameters)_

**Phase 2 Deliverables**:
- ✅ All business logic ported and tested
- ✅ Sample vehicles in database
- ✅ Sample parameters in database
- ✅ Calculations produce same results as original app

---

## Phase 3: Client Management (Week 6)

- [ ] 5.1 Build client CRUD screens
  - Create client list page (/clients)
  - Create client detail page (/clients/[id])
  - Create new client page (/clients/new)
  - Create edit client page (/clients/[id]/edit)
  - _Requirements: 3 (client management)_

- [ ] 5.2 Implement client features
  - Client search with autocomplete
  - Filter by type (individual/company)
  - Filter by pricing level
  - Client contact info management
  - Tax ID (RTN) validation
  - Notes and activity history
  - Pagination for client list
  - _Requirements: 3.6, 3.7, 3.8_

- [ ] 5.3 Create client components
  - ClientList component
  - ClientCard component
  - ClientForm component
  - ClientSearch component
  - _Requirements: 3 (client management)_

**Phase 3 Deliverables**:
- ✅ Complete client management system
- ✅ Client data properly isolated by tenant
- ✅ Client search and filtering working

---

## Phase 4: Quotation System (Weeks 7-8)

### Week 7: Quotation Creation

- [ ] 6.1 Build quotation wizard
  - Create multi-step quotation wizard (/quotations/new)
  - Step 1: Select client (with quick-create)
  - Step 2: Enter route details (origin, destination, dates)
  - Step 3: Select vehicle (filtered by capacity)
  - Step 4: Configure options (fuel, meals, tolls, incentive)
  - Step 5: Review costs and select markup
  - Step 6: Preview and save
  - _Requirements: 6 (quotation generation)_

- [ ] 6.2 Integrate Google Maps
  - Create RouteMap component
  - Display route with markers
  - Show distance and duration
  - Real-time cost calculation
  - _Requirements: 6.2, 6.3_

- [ ] 6.3 Implement cost calculation UI
  - Create CostBreakdown component
  - Create PricingOptions component
  - Display multiple pricing levels
  - Auto-generate quotation number
  - _Requirements: 6.4, 6.5, 7 (cost calculation)_

### Week 8: Quotation Management

- [ ] 6.4 Build quotation list and detail
  - Create quotation list page (/quotations)
  - Create quotation detail page (/quotations/[id])
  - Implement status workflow (draft → sent → approved/rejected)
  - Add filters (status, client, date range)
  - _Requirements: 6.7, 6.8_

- [ ] 6.5 Add quotation actions
  - Duplicate quotation
  - Edit draft quotations
  - Quotation expiry handling
  - Internal notes vs client-visible notes
  - _Requirements: 6.9, 6.10, 6.11_

**Phase 4 Deliverables**:
- ✅ Complete quotation workflow
- ✅ All quotations persisted to database
- ✅ Status management working
- ✅ Google Maps integration working

---

## Phase 5: PDF Generation & Email (Week 9)

- [ ] 7.1 Implement PDF generation
  - Design PDF template for quotations
  - Implement Puppeteer PDF generation
  - Upload PDFs to Convex storage
  - Generate and preview PDF
  - Download PDF functionality
  - _Requirements: 9 (PDF generation)_

- [ ] 7.2 Integrate email delivery
  - Set up Resend email integration
  - Create email templates (quotation sent, reminder)
  - Send quotation email with PDF attachment
  - Track email delivery status
  - _Requirements: 10 (email integration)_

**Phase 5 Deliverables**:
- ✅ Professional PDF generation working
- ✅ Email delivery working
- ✅ PDFs stored in cloud storage

---

## Phase 6: Driver Management (Week 10)

- [ ] 8.1 Build driver CRUD screens
  - Create driver list page (/drivers)
  - Create driver detail page (/drivers/[id])
  - Create new driver page (/drivers/new)
  - Create edit driver page (/drivers/[id]/edit)
  - _Requirements: 5 (driver management)_

- [ ] 8.2 Implement driver features
  - License expiry tracking and alerts
  - Driver availability status
  - Emergency contact info
  - Driver documents upload
  - Driver schedule view
  - _Requirements: 5.3, 5.4, 5.5, 5.6, 5.7_

**Phase 6 Deliverables**:
- ✅ Complete driver management system
- ✅ License expiry alerts working

---

## Phase 7: Itinerary Management (Weeks 11-12)

### Week 11: Itinerary Creation

- [ ] 9.1 Build itinerary conversion
  - Create "Convert to Itinerary" workflow from quotation
  - Create itinerary detail page (/itineraries/[id])
  - Assign driver and vehicle
  - Set pickup/dropoff details
  - Generate Google Maps route link
  - _Requirements: 11 (itinerary management)_

- [ ] 9.2 Implement itinerary status
  - Status workflow (scheduled → in_progress → completed)
  - Track start and completion times
  - Handle cancellations
  - _Requirements: 11.7_

### Week 12: Itinerary Views

- [ ] 9.3 Build calendar and schedule views
  - Create itinerary list page (/itineraries)
  - Create calendar view (/itineraries/calendar)
  - Driver schedule view
  - Vehicle availability calendar
  - Prevent double-booking
  - _Requirements: 11.8, 11.9, 11.10, 11.11_

- [ ] 9.4 Add itinerary features
  - Itinerary notifications
  - Itinerary report/summary
  - Route link generation
  - _Requirements: 11.5, 11.6_

**Phase 7 Deliverables**:
- ✅ Quote → Itinerary conversion working
- ✅ Driver/vehicle assignment
- ✅ Calendar views
- ✅ Google Maps route links

---

## Phase 8: Invoice System (Weeks 13-14)

### Week 13: Invoice Generation

- [ ] 10.1 Build invoice creation
  - Create "Generate Invoice" workflow from itinerary
  - Create invoice list page (/invoices)
  - Create invoice detail page (/invoices/[id])
  - Design invoice PDF template
  - Auto-generate invoice number (INV-YYYY-####)
  - _Requirements: 12 (invoice generation)_

- [ ] 10.2 Implement invoice features
  - Auto-calculate ISV (15% tax)
  - Invoice PDF generation
  - Invoice status management
  - Additional charges and discounts
  - _Requirements: 12.3, 12.6, 12.8_

### Week 14: Payment Tracking

- [ ] 10.3 Build payment recording
  - Create payment recording interface
  - Build payment history view
  - Support multiple payment methods
  - Support partial payments
  - _Requirements: 13 (payment tracking)_

- [ ] 10.4 Implement financial reports
  - Payment status tracking (unpaid → paid → overdue)
  - Overdue invoice flagging
  - Receivables aging report
  - Revenue reports
  - _Requirements: 13.7, 13.8, 17 (financial reports)_

**Phase 8 Deliverables**:
- ✅ Automated invoice generation
- ✅ Complete payment tracking
- ✅ Financial reports

---

## Phase 9: Expense Advances (Week 15)

- [ ] 11.1 Build expense advance system
  - Create expense advance list (/expenses)
  - Create advance request from itinerary
  - Calculate suggested advance from costs
  - Auto-generate advance number (ADV-YYYY-####)
  - _Requirements: 14 (expense advances)_

- [ ] 11.2 Implement approval workflow
  - Request/approval workflow
  - Mark as paid
  - Receipt upload
  - _Requirements: 14.3, 14.4, 14.5_

- [ ] 11.3 Build settlement process
  - Settlement screen (actual vs advanced)
  - Refund/additional payment calculation
  - Expense reports
  - _Requirements: 14.6, 14.7, 14.8_

**Phase 9 Deliverables**:
- ✅ Complete expense advance lifecycle
- ✅ Receipt management
- ✅ Settlement workflow

---

## Phase 10: Dashboard & Analytics (Weeks 16-18)

### Week 16: Dashboard

- [ ] 12.1 Build main dashboard
  - Create dashboard page (/)
  - Display KPIs (quotations, conversion rate, revenue, receivables)
  - Show upcoming itineraries
  - Quick actions (new quotation, new client)
  - Recent activity feed
  - Alerts (license expiry, overdue invoices)
  - _Requirements: 15 (dashboard & analytics)_

### Week 17: Reports

- [ ] 12.2 Build sales reports
  - Pipeline (quotations by status)
  - Conversion funnel
  - Revenue by client
  - Revenue by vehicle
  - _Requirements: 16 (sales reports)_

- [ ] 12.3 Build financial reports
  - Revenue summary
  - Receivables aging
  - Monthly comparisons
  - _Requirements: 17 (financial reports)_

- [ ] 12.4 Build operational reports
  - Driver utilization
  - Vehicle utilization
  - Route analysis
  - _Requirements: 18 (operational reports)_

### Week 18: Polish & Launch Prep

- [ ] 12.5 Implement data export
  - CSV export for all reports
  - Data export for tenant
  - _Requirements: 16.6, 17.6, 20.5_

- [ ] 12.6 Performance optimization
  - Optimize bundle size
  - Implement lazy loading
  - Add loading states
  - Optimize database queries
  - _Requirements: 19.9, 19.10_

- [ ] 12.7 Final polish
  - Error handling improvements
  - Mobile responsiveness check
  - Browser testing (Chrome, Firefox, Safari, Edge)
  - Security review
  - _Requirements: 19.4, 19.7, 20_

- [ ] 12.8 Documentation and launch prep
  - User documentation
  - Admin documentation
  - Terms of service
  - Privacy policy
  - Support email configuration
  - _Requirements: 20.6_

**Phase 10 Deliverables**:
- ✅ Comprehensive dashboard
- ✅ All reports functional
- ✅ Production-ready application
- ✅ Documentation complete

---

## Launch Checklist

### Pre-Launch
- [ ] All features tested end-to-end
- [ ] Mobile responsive on all screens
- [ ] Error tracking configured (Sentry)
- [ ] Terms of service published
- [ ] Privacy policy published
- [ ] SSL certificate configured
- [ ] Domain configured (routewise.app)
- [ ] Email deliverability tested
- [ ] Backup strategy implemented
- [ ] Support email configured

### Launch Day
- [ ] Deploy to production
- [ ] Monitor error logs
- [ ] Test critical flows (quotation, invoice, payment)
- [ ] Announce launch
- [ ] Onboard first customers

### Post-Launch (Week 19+)
- [ ] Monitor usage patterns
- [ ] Gather customer feedback
- [ ] Fix bugs and issues
- [ ] Plan next features (Phase 2 roadmap)

---

## Risk Mitigation

### Technical Risks

| Risk | Mitigation | Status |
|------|------------|--------|
| Svelte learning curve | 2 weeks dedicated training | Planned |
| Convex document model limitations | Design schema carefully upfront | Planned |
| PDF generation complexity | Use Puppeteer with tested templates | Planned |
| Google Maps API costs | Implement aggressive caching | Planned |
| WorkOS integration issues | Follow official documentation | Planned |

### Business Risks

| Risk | Mitigation | Status |
|------|------------|--------|
| Longer timeline than expected | 4-week buffer built into estimate | Planned |
| Honduras hiring difficulty | Plan for remote training | Planned |
| Competition | Focus on local market, Spanish language | Planned |

---

## Success Metrics

### Development Phase
- [ ] On-time delivery (within 18 weeks)
- [ ] All 50+ screens built
- [ ] Zero critical bugs at launch
- [ ] <3s page load times
- [ ] >90 Lighthouse score

### Post-Launch (Year 1)
- [ ] 33 paying customers
- [ ] 120 total users
- [ ] $7,080 MRR by Month 12
- [ ] <1% monthly churn rate
- [ ] >4.5 star user satisfaction

---

## Code Reuse from Existing App

### What Can Be Reused (30-40%)
- ✅ Business logic algorithms (cost calculation, route calculation)
- ✅ Utility functions (unit conversion, formatting, validation)
- ✅ Type definitions (with modifications for Convex)
- ✅ Design system (Tailwind CSS v4, dark mode theme)

### What Must Be Rebuilt (60-70%)
- ❌ All UI components (React → Svelte)
- ❌ Data layer (JSON/localStorage → Convex)
- ❌ Authentication (none → WorkOS)
- ❌ 50+ new CRUD screens for SaaS features
- ❌ PDF generation (new feature)
- ❌ Email integration (new feature)

---

## Resources

### Documentation
- [SvelteKit Docs](https://kit.svelte.dev/docs)
- [Convex Docs](https://docs.convex.dev/)
- [WorkOS Docs](https://workos.com/docs)
- [Flowbite-svelte](https://flowbite-svelte.com/)
- [Tailwind CSS 4](https://tailwindcss.com/docs/v4-beta)

### Tutorials
- [Svelte Tutorial](https://learn.svelte.dev/)
- [SvelteKit + Convex Tutorial](https://docs.convex.dev/quickstart/sveltekit)
- [WorkOS AuthKit Guide](https://workos.com/docs/user-management)

---

**Document Version**: 2.0
**Last Updated**: November 24, 2025
**Next Review**: Upon completion of Phase 0
