# RouteWise Requirements Document

**Project**: RouteWise (formerly PlannerTours)
**Version**: 2.0 - SaaS Transformation
**Date**: November 24, 2025
**Status**: Planning Phase

---

## Introduction

This document outlines the requirements for transforming PlannerTours into RouteWise, a multi-tenant SaaS platform for transportation quotation, fleet management, and operations workflow. The system will provide comprehensive client management, quotation generation, itinerary scheduling, invoicing, and financial tracking for transportation service providers.

### Strategic Vision

**From**: Single-tenant JSON-based quotation calculator
**To**: Multi-tenant SaaS platform with complete business workflow
**Target Market**: Transportation companies in Honduras and Central America
**Timeline**: 14-18 weeks
**Year 1 Goals**: 33 customers, 120 users, $84,960 ARR

---

## Glossary

### Core System Terms
- **RouteWise**: The multi-tenant SaaS platform for transportation management
- **Tenant**: An organization (transportation company) using the platform
- **Multi-tenancy**: Architecture supporting multiple isolated organizations in one system
- **Workspace**: A tenant's isolated environment with their data

### User Roles
- **Admin**: Full system access, can manage users and settings
- **Sales**: Can create quotations, manage clients, view reports
- **Operations**: Can manage itineraries, drivers, vehicles, expenses
- **Finance**: Can manage invoices, payments, financial reports
- **Viewer**: Read-only access to data

### Business Entities
- **Cliente**: Customer/client who requests transportation services
- **Cotización**: Quotation/quote for a transportation service
- **Itinerario**: Scheduled trip/itinerary with assigned driver and vehicle
- **Factura**: Invoice for completed services
- **Anticipo de Gastos**: Expense advance for drivers
- **Conductor**: Driver who operates vehicles
- **Vehículo**: Vehicle in the fleet

### Technical Components
- **SvelteKit**: Frontend framework for building the UI
- **Convex**: Backend database and serverless functions
- **WorkOS**: Authentication and organization management service
- **Flowbite**: UI component library for Svelte
- **Puppeteer**: PDF generation engine

---

## Requirements

### Requirement 1: Multi-Tenant Architecture

**User Story:** As a platform operator, I want to support multiple transportation companies on one platform, so that each company's data is completely isolated and secure.

#### Acceptance Criteria

1. WHEN a new company signs up, THE RouteWise_System SHALL create an isolated tenant workspace
2. THE RouteWise_System SHALL ensure all database queries are automatically scoped to the current tenant
3. THE RouteWise_System SHALL prevent users from accessing data belonging to other tenants
4. WHEN a user switches organizations, THE RouteWise_System SHALL update the active tenant context
5. THE RouteWise_System SHALL support tenant-specific branding (logo, company name)

---

### Requirement 2: Authentication & User Management

**User Story:** As a company administrator, I want to manage user accounts and permissions, so that I can control who has access to our transportation data.

#### Acceptance Criteria

1. THE RouteWise_System SHALL support email/password authentication via WorkOS
2. THE RouteWise_System SHALL support OAuth authentication (Google, Microsoft)
3. WHEN a user signs up, THE RouteWise_System SHALL create both a tenant and admin user account
4. THE RouteWise_System SHALL support five role types: Admin, Sales, Operations, Finance, Viewer
5. THE RouteWise_System SHALL allow admins to invite team members via email
6. THE RouteWise_System SHALL enforce role-based access control (RBAC) on all features
7. THE RouteWise_System SHALL support user profile management (name, avatar, email)

---

### Requirement 3: Client Management (CRM)

**User Story:** As a sales representative, I want to manage client information and relationships, so that I can track customers and their pricing preferences.

#### Acceptance Criteria

1. THE RouteWise_System SHALL support two client types: Individual and Company
2. THE RouteWise_System SHALL store client contact information (name, email, phone, address)
3. THE RouteWise_System SHALL support three pricing levels: Standard, Preferred, VIP
4. THE RouteWise_System SHALL allow custom discount percentages per client
5. THE RouteWise_System SHALL track client payment terms and credit limits
6. THE RouteWise_System SHALL provide client search with autocomplete
7. THE RouteWise_System SHALL support client status management (Active, Inactive)
8. THE RouteWise_System SHALL store client tax ID (RTN) for invoicing

---

### Requirement 4: Vehicle Fleet Management

**User Story:** As a fleet manager, I want to manage vehicle information and availability, so that I can assign appropriate vehicles to trips.

#### Acceptance Criteria

1. THE RouteWise_System SHALL store comprehensive vehicle specifications (make, model, year, capacity)
2. THE RouteWise_System SHALL track vehicle fuel efficiency and operational costs
3. THE RouteWise_System SHALL support multiple fuel efficiency units (mpg, mpl, kpl, kpg)
4. THE RouteWise_System SHALL track vehicle ownership type (Owned, Rented)
5. THE RouteWise_System SHALL support vehicle status management (Active, Maintenance, Inactive)
6. THE RouteWise_System SHALL filter vehicles by passenger capacity
7. THE RouteWise_System SHALL track vehicle license plate and registration information

---

### Requirement 5: Driver Management

**User Story:** As an operations manager, I want to manage driver information and licenses, so that I can ensure compliance and assign qualified drivers to trips.

#### Acceptance Criteria

1. THE RouteWise_System SHALL store driver personal information (name, contact details)
2. THE RouteWise_System SHALL track driver license information (number, expiry, category)
3. THE RouteWise_System SHALL alert when driver licenses are expiring within 30 days
4. THE RouteWise_System SHALL store emergency contact information for drivers
5. THE RouteWise_System SHALL support driver status management (Active, On Leave, Inactive)
6. THE RouteWise_System SHALL track driver hire date and employment history
7. THE RouteWise_System SHALL support driver document uploads (license scans, certifications)

---

### Requirement 6: Quotation Generation & Management

**User Story:** As a sales representative, I want to create and manage quotations with accurate cost calculations, so that I can provide professional quotes to clients.

#### Acceptance Criteria

1. THE RouteWise_System SHALL provide a multi-step quotation wizard
2. THE RouteWise_System SHALL integrate Google Maps API for route calculation
3. THE RouteWise_System SHALL calculate comprehensive costs (fuel, driver expenses, vehicle costs, tolls)
4. THE RouteWise_System SHALL display multiple pricing options (10%, 15%, 20%, 25%, 30% markup)
5. THE RouteWise_System SHALL recommend 15% markup as standard
6. THE RouteWise_System SHALL auto-generate unique quotation numbers (COT-YYYY-####)
7. THE RouteWise_System SHALL support quotation status workflow (Draft, Sent, Approved, Rejected, Expired)
8. THE RouteWise_System SHALL allow editing of draft quotations
9. THE RouteWise_System SHALL support quotation duplication
10. THE RouteWise_System SHALL track quotation validity dates
11. THE RouteWise_System SHALL support both client-visible and internal notes

---

### Requirement 7: Cost Calculation Engine

**User Story:** As a business owner, I want accurate cost calculations based on current parameters, so that my quotations are profitable and competitive.

#### Acceptance Criteria

1. THE RouteWise_System SHALL calculate fuel costs based on distance, vehicle efficiency, and fuel price
2. THE RouteWise_System SHALL calculate refueling costs for trips exceeding vehicle range
3. THE RouteWise_System SHALL calculate driver meal expenses (3 meals per day)
4. THE RouteWise_System SHALL calculate driver lodging costs for multi-day trips
5. THE RouteWise_System SHALL calculate optional driver incentive costs
6. THE RouteWise_System SHALL calculate vehicle operational costs (per km and per day)
7. THE RouteWise_System SHALL calculate toll costs based on route
8. THE RouteWise_System SHALL support currency conversion (HNL ↔ USD)
9. THE RouteWise_System SHALL use tenant-specific parameters for all calculations

---

### Requirement 8: System Parameters Management

**User Story:** As an administrator, I want to manage system parameters annually, so that cost calculations reflect current market prices.

#### Acceptance Criteria

1. THE RouteWise_System SHALL support yearly parameter sets
2. THE RouteWise_System SHALL store fuel prices per year
3. THE RouteWise_System SHALL store meal costs per day per year
4. THE RouteWise_System SHALL store hotel costs per night per year
5. THE RouteWise_System SHALL store driver incentive rates per year
6. THE RouteWise_System SHALL store exchange rates (USD/HNL) per year
7. THE RouteWise_System SHALL allow custom exchange rate override
8. THE RouteWise_System SHALL track parameter change history with timestamps
9. THE RouteWise_System SHALL support only one active parameter set per year

---

### Requirement 9: PDF Generation & Document Management

**User Story:** As a sales representative, I want to generate professional PDF quotations, so that I can send polished documents to clients.

#### Acceptance Criteria

1. THE RouteWise_System SHALL generate professional PDF quotations with company branding
2. THE RouteWise_System SHALL include company logo in PDF documents
3. THE RouteWise_System SHALL display client information in PDFs
4. THE RouteWise_System SHALL show trip details and route information in PDFs
5. THE RouteWise_System SHALL display final pricing (hiding internal cost breakdown)
6. THE RouteWise_System SHALL include terms and conditions in PDFs
7. THE RouteWise_System SHALL store generated PDFs in cloud storage
8. THE RouteWise_System SHALL support PDF preview before sending
9. THE RouteWise_System SHALL support PDF download

---

### Requirement 10: Email Integration

**User Story:** As a sales representative, I want to email quotations directly to clients, so that I can streamline the sales process.

#### Acceptance Criteria

1. THE RouteWise_System SHALL send quotation emails with PDF attachments
2. THE RouteWise_System SHALL use professional email templates
3. THE RouteWise_System SHALL support custom email messages
4. THE RouteWise_System SHALL track when quotations were sent
5. THE RouteWise_System SHALL send quotation reminder emails
6. THE RouteWise_System SHALL send invoice emails with PDF attachments
7. THE RouteWise_System SHALL support email delivery status tracking

---

### Requirement 11: Itinerary Management & Scheduling

**User Story:** As an operations manager, I want to convert approved quotations into scheduled itineraries, so that I can plan and execute trips efficiently.

#### Acceptance Criteria

1. THE RouteWise_System SHALL convert approved quotations into itineraries
2. THE RouteWise_System SHALL allow driver assignment to itineraries
3. THE RouteWise_System SHALL allow vehicle assignment to itineraries
4. THE RouteWise_System SHALL support pickup/dropoff location and time specification
5. THE RouteWise_System SHALL generate Google Maps route links for drivers
6. THE RouteWise_System SHALL auto-generate unique itinerary numbers (ITI-YYYY-####)
7. THE RouteWise_System SHALL support itinerary status workflow (Scheduled, In Progress, Completed, Cancelled)
8. THE RouteWise_System SHALL provide calendar view of itineraries
9. THE RouteWise_System SHALL show driver schedule view
10. THE RouteWise_System SHALL show vehicle availability calendar
11. THE RouteWise_System SHALL prevent double-booking of drivers and vehicles

---

### Requirement 12: Invoice Generation & Management

**User Story:** As a finance manager, I want to generate invoices from completed itineraries, so that I can bill clients accurately and track payments.

#### Acceptance Criteria

1. THE RouteWise_System SHALL generate invoices from completed itineraries
2. THE RouteWise_System SHALL auto-generate unique invoice numbers (INV-YYYY-####)
3. THE RouteWise_System SHALL calculate ISV tax (15%) automatically
4. THE RouteWise_System SHALL support invoice due dates based on client payment terms
5. THE RouteWise_System SHALL generate professional PDF invoices
6. THE RouteWise_System SHALL support invoice status workflow (Draft, Sent, Paid, Overdue, Cancelled)
7. THE RouteWise_System SHALL track payment status (Unpaid, Partial, Paid)
8. THE RouteWise_System SHALL support additional charges and discounts
9. THE RouteWise_System SHALL display client tax ID (RTN) on invoices

---

### Requirement 13: Payment Tracking

**User Story:** As a finance manager, I want to record and track payments, so that I can manage accounts receivable effectively.

#### Acceptance Criteria

1. THE RouteWise_System SHALL support payment recording with date and amount
2. THE RouteWise_System SHALL support multiple payment methods (Cash, Transfer, Check, Card)
3. THE RouteWise_System SHALL support partial payments
4. THE RouteWise_System SHALL calculate remaining balance automatically
5. THE RouteWise_System SHALL track payment reference numbers
6. THE RouteWise_System SHALL show payment history per invoice
7. THE RouteWise_System SHALL automatically mark invoices as paid when fully paid
8. THE RouteWise_System SHALL flag overdue invoices

---

### Requirement 14: Expense Advance Management

**User Story:** As an operations manager, I want to manage driver expense advances, so that drivers have funds for trip expenses and I can track accountability.

#### Acceptance Criteria

1. THE RouteWise_System SHALL calculate suggested advance amounts from itinerary costs
2. THE RouteWise_System SHALL auto-generate unique advance numbers (ADV-YYYY-####)
3. THE RouteWise_System SHALL support advance request workflow (Pending, Approved, Paid, Settled)
4. THE RouteWise_System SHALL require approval before payment
5. THE RouteWise_System SHALL support receipt upload for expense settlement
6. THE RouteWise_System SHALL calculate refund or additional payment amounts
7. THE RouteWise_System SHALL track actual expenses vs advanced amount
8. THE RouteWise_System SHALL support settlement notes and documentation

---

### Requirement 15: Dashboard & Analytics

**User Story:** As a business owner, I want to see key performance indicators and business metrics, so that I can make informed decisions.

#### Acceptance Criteria

1. THE RouteWise_System SHALL display total quotations for current month
2. THE RouteWise_System SHALL calculate quotation conversion rate (approved/sent)
3. THE RouteWise_System SHALL display total revenue (invoiced) for current month
4. THE RouteWise_System SHALL show outstanding receivables amount
5. THE RouteWise_System SHALL display upcoming itineraries count
6. THE RouteWise_System SHALL show recent activity feed
7. THE RouteWise_System SHALL display alerts (license expiry, overdue invoices)
8. THE RouteWise_System SHALL provide quick action buttons (new quotation, new client)

---

### Requirement 16: Sales Reports

**User Story:** As a sales manager, I want to analyze sales performance, so that I can optimize our sales process.

#### Acceptance Criteria

1. THE RouteWise_System SHALL display quotation pipeline by status
2. THE RouteWise_System SHALL show conversion funnel visualization
3. THE RouteWise_System SHALL report revenue by client
4. THE RouteWise_System SHALL report revenue by vehicle type
5. THE RouteWise_System SHALL support date range filtering for reports
6. THE RouteWise_System SHALL support data export to CSV

---

### Requirement 17: Financial Reports

**User Story:** As a finance manager, I want to analyze financial performance, so that I can manage cash flow and profitability.

#### Acceptance Criteria

1. THE RouteWise_System SHALL display revenue summary by month
2. THE RouteWise_System SHALL show accounts receivable aging report
3. THE RouteWise_System SHALL display monthly revenue comparisons
4. THE RouteWise_System SHALL show payment collection metrics
5. THE RouteWise_System SHALL support profit margin analysis
6. THE RouteWise_System SHALL export financial data to CSV

---

### Requirement 18: Operational Reports

**User Story:** As an operations manager, I want to analyze fleet utilization, so that I can optimize resource allocation.

#### Acceptance Criteria

1. THE RouteWise_System SHALL display driver utilization metrics
2. THE RouteWise_System SHALL show vehicle utilization metrics
3. THE RouteWise_System SHALL analyze route frequency and patterns
4. THE RouteWise_System SHALL track average trip duration
5. THE RouteWise_System SHALL display fleet efficiency metrics

---

### Requirement 19: User Interface & Experience

**User Story:** As a user, I want a modern, intuitive interface with dark mode, so that I can work efficiently and comfortably.

#### Acceptance Criteria

1. THE RouteWise_System SHALL default to dark mode theme
2. THE RouteWise_System SHALL provide theme toggle (dark/light mode)
3. THE RouteWise_System SHALL use Flowbite-svelte component library
4. THE RouteWise_System SHALL be fully responsive (mobile, tablet, desktop)
5. THE RouteWise_System SHALL provide consistent navigation across all screens
6. THE RouteWise_System SHALL display loading states for async operations
7. THE RouteWise_System SHALL show clear error messages
8. THE RouteWise_System SHALL support keyboard navigation
9. THE RouteWise_System SHALL achieve >90 Lighthouse performance score
10. THE RouteWise_System SHALL load pages in <3 seconds

---

### Requirement 20: Data Security & Privacy

**User Story:** As a business owner, I want my data to be secure and private, so that I can trust the platform with sensitive business information.

#### Acceptance Criteria

1. THE RouteWise_System SHALL encrypt all data in transit (HTTPS)
2. THE RouteWise_System SHALL encrypt sensitive data at rest
3. THE RouteWise_System SHALL implement row-level security for tenant isolation
4. THE RouteWise_System SHALL log all data access and modifications
5. THE RouteWise_System SHALL support data export for tenant
6. THE RouteWise_System SHALL comply with data privacy regulations
7. THE RouteWise_System SHALL implement secure session management
8. THE RouteWise_System SHALL support two-factor authentication (future)

---

### Requirement 21: Audit Trail

**User Story:** As an administrator, I want to track all system changes, so that I can maintain accountability and troubleshoot issues.

#### Acceptance Criteria

1. THE RouteWise_System SHALL log all create, update, delete operations
2. THE RouteWise_System SHALL record user who performed each action
3. THE RouteWise_System SHALL store timestamps for all actions
4. THE RouteWise_System SHALL capture before/after values for updates
5. THE RouteWise_System SHALL record IP addresses for actions
6. THE RouteWise_System SHALL provide audit log search and filtering
7. THE RouteWise_System SHALL retain audit logs for minimum 1 year

---

## Implementation Status

### ✅ Phase 0: Current State (Completed)
- Modern dark-themed UI with Tailwind CSS v4
- Google Maps integration for route calculation
- Cost calculation algorithms
- Parameter management
- Vehicle management
- Responsive design
- Form validation

### 🔄 Phase 1: SaaS Transformation (In Planning)
- Multi-tenant architecture with Convex
- Authentication with WorkOS
- Client management (CRM)
- Persistent quotations with workflow
- Driver management
- Itinerary scheduling
- Invoice generation
- Expense advance tracking
- Dashboard and analytics
- PDF generation with Puppeteer
- Email integration with Resend

### 📋 Success Criteria

**Technical Metrics:**
- 14-18 week implementation timeline
- >90 Lighthouse performance score
- <3 second page load times
- Zero critical security vulnerabilities
- 99.9% uptime

**Business Metrics (Year 1):**
- 33 paying customers
- 120 total users
- $84,960 annual recurring revenue
- <1% monthly churn rate
- >4.5 star user satisfaction

---

**Document Version**: 2.0
**Last Updated**: November 24, 2025
**Next Review**: Upon completion of Phase 1 planning
