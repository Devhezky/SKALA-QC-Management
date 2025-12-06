# 📋 PRD: PERFEX CRM INTEGRATION DENGAN QC MANAGEMENT SYSTEM

**Prepared for:** Narapati Studio Interior
**Project:** Perfex CRM Integration - QC Management System
**Date:** December 2, 2025
**Status:** PLANNING & DEVELOPMENT ROADMAP

---

## 🎯 EXECUTIVE SUMMARY

### Visi
Mengintegrasikan **Perfex CRM** (Project & Client Management) dengan **QC Management System** (Next.js 15 + TypeScript + Tailwind CSS) untuk menciptakan ecosystem manajemen proyek yang seamless, dengan sinkronisasi data real-time antara kedua platform.

### Tujuan Utama
1. **Unified Authentication** - Staff login di Perfex CRM bisa digunakan untuk QC app
2. **Automatic Project Syncing** - Tarik data project dari Perfex ke QC app
3. **Role-Based Access Control** - Respek role/permission dari Perfex di QC app
4. **Bi-Directional Data Update** - QC results kembali update ke Perfex
5. **Client Data Integration** - Sinkronisasi informasi klien

### Benefit untuk Bisnis
- ✅ **Efisiensi Operasional** - Data terpusat, menghindari duplikasi
- ✅ **Real-Time Visibility** - Dashboard QC terupdate dengan project status Perfex
- ✅ **Single Sign-On** - One login untuk kedua platform
- ✅ **Workflow Automation** - Proses QC terintegrasi dengan project lifecycle
- ✅ **Data Accuracy** - Satu sumber kebenaran untuk project dan QC data

---

## 📊 REQUIREMENT SPECIFICATIONS

### A. FUNCTIONAL REQUIREMENTS (FR)

#### FR-1: AUTHENTICATION & LOGIN INTEGRATION

**Objective:** Implement unified authentication system

**Requirements:**
- FR-1.1: Staff dapat login di QC app menggunakan credentials Perfex CRM
- FR-1.2: Sistem validasi credentials terhadap Perfex API
- FR-1.3: Menyimpan authentication token di secure session/HTTP-only cookies
- FR-1.4: Implementasi logout yang membersihkan session
- FR-1.5: Refresh token mechanism untuk session validity
- FR-1.6: Role-based redirect setelah login (Admin vs QC Staff)

**API Endpoints Required:**
```
POST /api/auth/login
  Input: { email, password }
  Output: { token, user, role, projects }

POST /api/auth/logout
  Action: Clear session, revoke token

POST /api/auth/refresh
  Action: Renew authentication token

GET /api/auth/me
  Output: Current user profile + role
```

**Success Criteria:**
- Staff dapat login dalam < 2 detik
- Session valid minimum 8 jam kerja
- Auto-logout setelah 30 menit inactivity
- Role dari Perfex correctly reflected di QC app

---

#### FR-2: PROJECT DATA SYNCHRONIZATION

**Objective:** Tarik dan tampilkan project list dari Perfex CRM

**Requirements:**
- FR-2.1: Fetch all projects dari Perfex API
- FR-2.2: Display project list dengan filtering (status, assigned to, client)
- FR-2.3: Show project details (name, client, budget, timeline, team members)
- FR-2.4: Real-time project status updates
- FR-2.5: Pagination untuk large project sets (50+ projects)
- FR-2.6: Search functionality untuk quick project lookup
- FR-2.7: Sort by: name, date created, status, client

**API Endpoints Required:**
```
GET /api/projects
  Query: { page, limit, status, client_id, assigned_to }
  Output: { projects: [], total, pages }

GET /api/projects/:id
  Output: { id, name, client, status, team, tasks, files }

GET /api/projects/search
  Query: { q }
  Output: { results: [] }
```

**Data Model:**
```typescript
interface Project {
  id: number;
  name: string;
  description: string;
  client_id: number;
  client_name: string;
  status: 'open' | 'in_progress' | 'completed' | 'on_hold';
  start_date: string; // YYYY-MM-DD
  end_date: string;
  budget: number;
  assigned_team: StaffMember[];
  tasks: Task[];
  created_at: string;
  updated_at: string;
}
```

**Success Criteria:**
- Load project list dalam < 3 detik
- Support minimum 200 active projects
- Data updated every 5 minutes (or on-demand refresh)
- Pagination works smoothly

---

#### FR-3: QC MANAGEMENT WORKFLOW

**Objective:** Manage QC checklist dan pass-percentage scoring

**Requirements:**
- FR-3.1: Create/edit QC checklist template per project phase
- FR-3.2: Record QC results dengan pass/fail status
- FR-3.3: Calculate pass percentage automatically
- FR-3.4: File upload untuk dokumentasi (photos, reports)
- FR-3.5: Add notes/comments per checklist item
- FR-3.6: Track QC history (who did, when, what result)
- FR-3.7: Digital signature per phase completion

**QC Checklist Structure:**
```typescript
interface QCChecklist {
  id: string;
  project_id: number;
  phase: 'design' | 'foundation' | 'construction' | 'finishing' | 'handover';
  items: QCItem[];
  created_at: string;
  updated_at: string;
  signed_by?: string;
  signed_at?: string;
}

interface QCItem {
  id: string;
  description: string;
  status: 'pass' | 'fail' | 'pending';
  notes: string;
  attachments: Attachment[];
  checked_by: string;
  checked_at: string;
}
```

**Success Criteria:**
- Form submission dalam < 1 detik
- File upload support up to 50MB
- Offline capability dengan sync saat online

---

#### FR-4: ROLE-BASED ACCESS CONTROL (RBAC)

**Objective:** Enforce Perfex roles dalam QC app

**Requirements:**
- FR-4.1: Tarik role list dari Perfex
- FR-4.2: Map Perfex roles ke QC permissions
- FR-4.3: Restrict features berdasarkan role
- FR-4.4: Admin hanya bisa access setup & user management
- FR-4.5: QC Staff hanya bisa create/edit QC checklist
- FR-4.6: Supervisor bisa view semua QC results
- FR-4.7: Audit log untuk permission violations

**Role Matrix:**
| Role | Login | View Project | Create QC | Edit QC | Sign-off | View Report | Admin |
|------|-------|--------------|-----------|---------|----------|-------------|-------|
| Admin | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| QC Supervisor | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| QC Staff | ✅ | ✅ | ✅ | Own Only | ❌ | Own Only | ❌ |
| Project Manager | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |

**Perfex Role Mapping:**
```typescript
const roleMapping = {
  'admin': ['qc_create', 'qc_edit', 'qc_sign', 'user_manage'],
  'qc_supervisor': ['qc_create', 'qc_edit', 'qc_sign', 'report_view'],
  'qc_staff': ['qc_create'],
  'project_manager': ['project_view', 'report_view'],
};
```

**Success Criteria:**
- Unauthorized access blocked dengan error message yang jelas
- Role sync update within 5 minutes
- Audit log complete dan tamper-proof

---

#### FR-5: CLIENT DATA INTEGRATION

**Objective:** Display client information dalam project context

**Requirements:**
- FR-5.1: Tarik client data dari Perfex API
- FR-5.2: Display di project detail page
- FR-5.3: Show contact information
- FR-5.4: Link ke project assignments
- FR-5.5: Update sync setiap 24 jam

**Client Data Model:**
```typescript
interface Client {
  id: number;
  company_name: string;
  contact_person: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  projects: Project[];
}
```

**Success Criteria:**
- Client info displayed correctly
- Contact data up-to-date
- No data leakage between clients

---

#### FR-6: DATA SYNCHRONIZATION BACK TO PERFEX

**Objective:** Update Perfex dengan QC results

**Requirements:**
- FR-6.1: Push QC checklist results ke Perfex
- FR-6.2: Update project status berdasarkan QC pass/fail
- FR-6.3: Attach QC documents ke project di Perfex
- FR-6.4: Create tasks di Perfex untuk QC failures
- FR-6.5: Record phase completion dengan sign-off

**Sync Flow:**
```
QC App Submit QC Result
         ↓
Validate & Save locally
         ↓
Push to Perfex API (PUT /api/projects/:id)
         ↓
Create follow-up task if fail (POST /api/tasks)
         ↓
Update project status (POST /api/projects/:id/status)
         ↓
Confirm sync status
```

**Success Criteria:**
- Data sync reliably
- Conflict resolution (if edited on both sides)
- Rollback capability if sync fails
- Audit trail lengkap

---

### B. NON-FUNCTIONAL REQUIREMENTS (NFR)

#### NFR-1: PERFORMANCE
- Page load time: < 3 detik
- API response time: < 1 detik (95th percentile)
- Database query time: < 500ms
- Support concurrent users: minimum 50
- Cache strategy: Redis untuk project list (5 min TTL)

#### NFR-2: SECURITY
- All API calls over HTTPS
- Input validation & sanitization
- Rate limiting: 100 requests/minute per user
- SQL injection prevention (Prisma ORM)
- XSS protection (sanitize user input)
- CSRF tokens untuk form submissions
- Secure password hashing (bcrypt)
- API token encryption
- Data encryption at rest untuk sensitive fields

#### NFR-3: SCALABILITY
- Horizontal scaling ready
- Database connection pooling
- API pagination (max 100 items/page)
- Async job processing untuk heavy operations
- CDN untuk static assets

#### NFR-4: RELIABILITY
- 99.5% uptime SLA
- Graceful error handling
- Retry logic untuk failed API calls
- Health check endpoint
- Monitoring & alerting setup

#### NFR-5: USABILITY
- Mobile-responsive design
- Intuitive UI matching Tailwind best practices
- Dark/Light mode support
- Keyboard navigation support
- WCAG 2.1 AA compliance

#### NFR-6: MAINTAINABILITY
- Clean code architecture (separation of concerns)
- Comprehensive documentation
- Unit test coverage: > 80%
- API documentation (OpenAPI/Swagger)
- Error logging & monitoring (Sentry)

---

## 🏗️ TECHNICAL ARCHITECTURE

### A. SYSTEM ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────┐
│                    CLIENT LAYER (Browser)                        │
│  Next.js 15 Frontend (React + TypeScript + Tailwind CSS)        │
│  - Pages: Login, Dashboard, Projects, QC Checklist, Reports    │
│  - Components: Reusable UI with shadcn/ui                       │
│  - State: Zustand for global state management                   │
└────────────────────────┬────────────────────────────────────────┘
                         │
                    HTTPS/REST API
                         │
┌────────────────────────▼────────────────────────────────────────┐
│               APPLICATION LAYER (Next.js Server)                │
│  - Route Handlers untuk API endpoints                           │
│  - Authentication & Authorization middleware                    │
│  - Business logic & validation                                  │
│  - Error handling & logging                                     │
└────────────────────────┬────────────────────────────────────────┘
                         │
          ┌──────────────┼──────────────┐
          │              │              │
          ▼              ▼              ▼
┌─────────────────┐  ┌────────────┐  ┌──────────────┐
│  Perfex CRM     │  │ PostgreSQL │  │ Redis Cache  │
│  REST API       │  │ Database   │  │ (Session,    │
│  (External)     │  │            │  │  Project     │
│                 │  │ Prisma ORM │  │  list)       │
└─────────────────┘  └────────────┘  └──────────────┘
```

### B. TECHNOLOGY STACK

**Frontend:**
- Next.js 15 (App Router)
- React 19+
- TypeScript
- Tailwind CSS
- shadcn/ui (UI Components)
- Zustand (State Management)
- React Query (Data Fetching)
- jsPDF + AutoTable (PDF Generation)
- Lucide React (Icons)
- React Hook Form (Forms)
- Zod (Validation)

**Backend:**
- Next.js Route Handlers
- TypeScript
- Node.js runtime
- Prisma ORM (Database abstraction)
- PostgreSQL (Primary Database)
- Redis (Caching & Sessions)

**External Services:**
- Perfex CRM API (Authentication & Data)
- SendGrid/Resend (Email)
- AWS S3 (File Storage) - Optional

**DevOps & Monitoring:**
- Docker (Containerization)
- GitHub Actions (CI/CD)
- Vercel (Hosting) - Recommended
- Sentry (Error Tracking)
- Datadog (APM & Monitoring)

### C. DATA FLOW DIAGRAM

**Login Flow:**
```
User visits QC App
         ↓
Routes to /login
         ↓
Submits credentials
         ↓
POST /api/auth/login
  ├─ Validate input (Zod)
  ├─ Call Perfex API: /api/staff (authenticate)
  ├─ If valid:
  │  ├─ Fetch user role & permissions
  │  ├─ Generate JWT token
  │  ├─ Store in HTTP-only cookie
  │  ├─ Return user + projects
  │  └─ Redirect to dashboard
  └─ If invalid: Return 401 error
```

**Project Fetch Flow:**
```
User clicks "Projects"
         ↓
GET /api/projects?page=1&limit=20
  ├─ Check authentication
  ├─ Check cache (Redis)
  ├─ If cached: Return cached data
  ├─ If not cached:
  │  ├─ Call Perfex API: /api/projects
  │  ├─ Transform & enrich data
  │  ├─ Cache for 5 minutes
  │  └─ Return to client
         ↓
Frontend renders project list
```

**QC Submit Flow:**
```
User completes QC checklist & clicks Submit
         ↓
Validate form data (Zod)
         ↓
POST /api/qc/create
  ├─ Save to local DB (Prisma)
  ├─ Push to Perfex: PUT /api/projects/:id
  ├─ If project failed QC:
  │  ├─ Create task in Perfex: POST /api/tasks
  │  └─ Notify team
  └─ Return success/error
         ↓
Show confirmation & redirect
```

---

## 📋 IMPLEMENTATION ROADMAP

### Phase 1: Foundation & Setup (Week 1-2)

**Sprint 1.1: Project Infrastructure**
- [ ] Setup Next.js 15 project dengan TypeScript
- [ ] Configure Tailwind CSS & shadcn/ui
- [ ] Setup PostgreSQL database (local + production)
- [ ] Configure Prisma ORM
- [ ] Setup environment variables management
- [ ] Initialize Git repository & branch strategy

**Tasks:**
- Create Next.js project dengan create-next-app
- Install all dependencies
- Create .env.local dengan Perfex API credentials
- Run initial migrations
- Setup linting & formatting (ESLint, Prettier)

**Deliverables:**
- Project structure ready
- Database schema created
- Initial commits pushed to GitHub

---

### Phase 2: Authentication (Week 2-3)

**Sprint 2.1: Perfex API Integration - Auth**
- [ ] Create API client wrapper untuk Perfex
- [ ] Implement login endpoint (POST /api/auth/login)
- [ ] Implement logout endpoint (POST /api/auth/logout)
- [ ] Setup JWT token generation & validation
- [ ] Implement session management (HTTP-only cookies)
- [ ] Create authentication middleware

**Code Deliverables:**
```
lib/
  ├── perfex-client.ts          // Perfex API wrapper
  ├── auth.ts                   // Auth logic
  ├── jwt.ts                    // JWT handling
  └── types.ts                  // Type definitions

app/api/auth/
  ├── login/route.ts            // POST /api/auth/login
  ├── logout/route.ts           // POST /api/auth/logout
  ├── refresh/route.ts          // POST /api/auth/refresh
  └── me/route.ts               // GET /api/auth/me

middleware.ts                   // Auth middleware
```

**Tests:**
- Unit tests untuk auth logic
- Integration tests untuk Perfex API calls
- Error handling scenarios

---

### Phase 3: Project Management (Week 3-4)

**Sprint 3.1: Project Data Sync**
- [ ] Create project endpoints (GET /api/projects)
- [ ] Implement project detail endpoint
- [ ] Add filtering & sorting
- [ ] Setup pagination
- [ ] Create search functionality
- [ ] Implement caching strategy (Redis)

**Sprint 3.2: Project UI Components**
- [ ] Create Project List page
- [ ] Create Project Detail page
- [ ] Add filters & search UI
- [ ] Add pagination component
- [ ] Responsive design untuk mobile

**Code Structure:**
```
app/dashboard/
  ├── projects/
  │  ├── page.tsx              // Project list
  │  ├── [id]/
  │  │  └── page.tsx           // Project detail
  │  └── components/
  │     ├── ProjectList.tsx
  │     ├── ProjectCard.tsx
  │     ├── ProjectFilters.tsx
  │     └── ProjectSearch.tsx

app/api/projects/
  ├── route.ts                 // GET /api/projects
  ├── [id]/
  │  └── route.ts             // GET /api/projects/:id
  └── search/route.ts         // GET /api/projects/search
```

---

### Phase 4: QC Checklist Management (Week 4-5)

**Sprint 4.1: QC Data Models & Database**
- [ ] Design QC checklist schema
- [ ] Create Prisma models for QC
- [ ] Setup migrations
- [ ] Create database indexes

**Sprint 4.2: QC Checklist Features**
- [ ] Create QC checklist form
- [ ] Implement pass/fail scoring
- [ ] Add file upload capability
- [ ] Add notes & comments
- [ ] Digital signature component
- [ ] QC history tracking

**Sprint 4.3: QC API Endpoints**
- [ ] POST /api/qc/create (create new QC)
- [ ] GET /api/qc/:id (fetch QC detail)
- [ ] PUT /api/qc/:id (update QC)
- [ ] DELETE /api/qc/:id (delete QC)
- [ ] GET /api/qc/project/:projectId (fetch QCs for project)

**Code Structure:**
```
app/dashboard/qc/
  ├── [projectId]/
  │  ├── page.tsx              // QC list for project
  │  ├── new/page.tsx          // Create new QC
  │  └── [qcId]/
  │     ├── page.tsx           // QC detail
  │     └── edit/page.tsx      // Edit QC

components/QC/
  ├── QCForm.tsx               // Main form
  ├── QCChecklist.tsx          // Checklist items
  ├── FileUpload.tsx           // File upload component
  ├── DigitalSignature.tsx     // Signature pad
  └── QCHistory.tsx            // QC history timeline

app/api/qc/
  ├── route.ts
  ├── [id]/route.ts
  ├── project/[projectId]/route.ts
  └── upload/route.ts          // File upload endpoint
```

---

### Phase 5: Role-Based Access Control (Week 5)

**Sprint 5.1: Role Management**
- [ ] Fetch roles dari Perfex
- [ ] Create role permission matrix
- [ ] Implement permission checking middleware
- [ ] Create role-based UI rendering

**Sprint 5.2: Authorization**
- [ ] Protect API routes dengan role check
- [ ] Hide/show features berdasarkan role
- [ ] Implement audit logging

**Code:**
```
lib/permissions.ts            // Permission logic
middleware.ts                 // Role checking middleware

hooks/
  ├── useAuth.ts              // Auth hook dengan role
  └── usePermission.ts        // Permission checking

components/RoleGate.tsx       // Conditional rendering
```

---

### Phase 6: Data Sync to Perfex (Week 6)

**Sprint 6.1: Bi-Directional Sync**
- [ ] Create endpoint untuk push QC ke Perfex
- [ ] Implement project status update
- [ ] Create task generator untuk failed QC
- [ ] Error handling & retry logic

**Sprint 6.2: Sync Monitoring**
- [ ] Create sync status dashboard
- [ ] Logging untuk all sync operations
- [ ] Conflict resolution mechanism

**Code:**
```
app/api/sync/
  ├── qc-to-perfex.ts         // Push QC to Perfex
  ├── status/route.ts         // Sync status check
  └── retry.ts                // Retry failed syncs

lib/sync-queue.ts             // Job queue for sync
```

---

### Phase 7: Testing & QA (Week 7)

**Sprint 7.1: Testing**
- [ ] Unit tests (80%+ coverage)
- [ ] Integration tests
- [ ] E2E tests (Playwright)
- [ ] Performance testing
- [ ] Security testing (OWASP top 10)

**Sprint 7.2: QA & Bug Fixes**
- [ ] UAT dengan internal team
- [ ] Performance optimization
- [ ] Security audit
- [ ] Documentation

---

### Phase 8: Deployment & Monitoring (Week 8)

**Sprint 8.1: Deployment Setup**
- [ ] Setup production database
- [ ] Configure environment variables
- [ ] Setup monitoring & alerting
- [ ] Configure backups
- [ ] Setup CI/CD pipeline

**Sprint 8.2: Go-Live**
- [ ] Deploy to production
- [ ] Smoke tests
- [ ] Monitor system performance
- [ ] Staff training
- [ ] Documentation

---

## 🔌 API INTEGRATION DETAILS

### Perfex CRM Authentication

**Step 1: Generate API Token**
```
Perfex Admin Panel → Setup → Modules → REST API Module
→ API Management → Create New Token
→ Configure scopes: staff, projects, clients, tasks
→ Copy token (example: abc123xyz789)
```

**Step 2: Store Token**
```env
# .env.local
PERFEX_API_BASE_URL=https://your-perfex-domain.com
PERFEX_API_TOKEN=abc123xyz789
PERFEX_API_SECRET=optional_secret_key
```

**Step 3: Request Format**

All Perfex API requests:
```
Authorization: Bearer YOUR_API_TOKEN
Content-Type: application/json
```

### Critical Endpoints Needed

**1. Staff Authentication**
```
POST https://your-perfex-domain.com/api/staff
Body: { email: string, password: string }
Response: { id, email, firstname, lastname, role, permissions }
```

**2. Project List**
```
GET https://your-perfex-domain.com/api/projects
Query: { page, limit }
Response: { projects: [], total, pages }
```

**3. Project Detail**
```
GET https://your-perfex-domain.com/api/projects/:id
Response: { id, name, client, status, team, tasks, etc. }
```

**4. Roles**
```
GET https://your-perfex-domain.com/api/roles
Response: { roles: [{ id, name, permissions }] }
```

**5. Clients**
```
GET https://your-perfex-domain.com/api/clients
Query: { page, limit }
Response: { clients: [], total }
```

**6. Update Project**
```
PUT https://your-perfex-domain.com/api/projects/:id
Body: { status, description, etc. }
Response: { success: true, project }
```

---

## 🛡️ SECURITY CONSIDERATIONS

### Authentication & Authorization
- ✅ Use HTTPS for all API calls
- ✅ Store API token in environment variables only
- ✅ HTTP-only cookies untuk session tokens
- ✅ CSRF protection untuk form submissions
- ✅ Rate limiting untuk API endpoints
- ✅ Input validation & sanitization (Zod)

### Data Protection
- ✅ Encrypt sensitive data at rest (passwords, tokens)
- ✅ Use SQL parameterized queries (Prisma)
- ✅ Implement Row-Level Security (RLS) jika possible
- ✅ Regular security audits
- ✅ Audit logging untuk sensitive operations

### API Security
- ✅ API keys rotation monthly
- ✅ Scoped API tokens (only needed permissions)
- ✅ API version management
- ✅ Deprecation notices untuk old endpoints
- ✅ WAF (Web Application Firewall) di production

### Infrastructure Security
- ✅ Database encryption (TLS)
- ✅ VPC isolation untuk databases
- ✅ Regular backups + encryption
- ✅ DDoS protection
- ✅ Monitoring & alerting untuk suspicious activities

---

## 📊 SUCCESS METRICS

### Performance Metrics
- Page load time: < 3 seconds ✓
- API response time: < 1 second ✓
- Database query time: < 500ms ✓
- Cache hit rate: > 80% ✓

### Business Metrics
- User adoption: > 80% staff using within 2 weeks
- Time saved: 30% reduction in QC data entry
- Error reduction: 50% fewer QC-related issues
- Data accuracy: 99.5% sync success rate

### Quality Metrics
- Test coverage: > 80%
- Bug escape rate: < 5 bugs per 1000 lines
- Performance: Lighthouse score > 90
- Accessibility: WCAG 2.1 AA compliance

### Operational Metrics
- System uptime: 99.5%
- Mean time to recover (MTTR): < 15 minutes
- Support ticket resolution: < 4 hours average

---

## 📚 DETAILED FILE STRUCTURE

```
narapati-qc-system/
├── .env.local                      # Environment variables
├── .env.example                    # Template
├── .gitignore
├── .eslintrc.json
├── .prettierrc
├── tsconfig.json
├── next.config.js
├── tailwind.config.ts
├── prisma/
│   ├── schema.prisma              # Database schema
│   └── migrations/                # DB migrations
│
├── src/
│   ├── app/
│   │   ├── layout.tsx             # Root layout
│   │   ├── page.tsx               # Home/landing
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── dashboard/
│   │   │   ├── page.tsx           # Dashboard main
│   │   │   ├── projects/
│   │   │   │   ├── page.tsx       # Project list
│   │   │   │   ├── [id]/
│   │   │   │   │   └── page.tsx   # Project detail
│   │   │   │   └── components/
│   │   │   ├── qc/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── [projectId]/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   ├── new/page.tsx
│   │   │   │   │   └── [qcId]/
│   │   │   │   └── components/
│   │   │   ├── reports/
│   │   │   └── settings/
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   ├── login/route.ts
│   │   │   │   ├── logout/route.ts
│   │   │   │   ├── refresh/route.ts
│   │   │   │   └── me/route.ts
│   │   │   ├── projects/
│   │   │   │   ├── route.ts
│   │   │   │   ├── [id]/route.ts
│   │   │   │   └── search/route.ts
│   │   │   ├── qc/
│   │   │   │   ├── route.ts
│   │   │   │   ├── [id]/route.ts
│   │   │   │   └── upload/route.ts
│   │   │   ├── roles/route.ts
│   │   │   ├── clients/route.ts
│   │   │   ├── sync/
│   │   │   │   ├── qc-to-perfex.ts
│   │   │   │   ├── status/route.ts
│   │   │   │   └── retry.ts
│   │   │   └── health/route.ts
│   │
│   ├── lib/
│   │   ├── perfex-client.ts       # Perfex API wrapper
│   │   ├── auth.ts                # Auth utilities
│   │   ├── jwt.ts                 # JWT handling
│   │   ├── db.ts                  # Prisma client
│   │   ├── validation.ts          # Zod schemas
│   │   ├── permissions.ts         # Permission logic
│   │   ├── sync-queue.ts          # Job queue
│   │   ├── logger.ts              # Logging
│   │   └── types.ts               # Type definitions
│   │
│   ├── middleware.ts              # Auth middleware
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── Footer.tsx
│   │   ├── auth/
│   │   │   ├── LoginForm.tsx
│   │   │   └── ProtectedRoute.tsx
│   │   ├── common/
│   │   │   ├── LoadingSpinner.tsx
│   │   │   ├── ErrorBoundary.tsx
│   │   │   └── NotFound.tsx
│   │   ├── projects/
│   │   │   ├── ProjectList.tsx
│   │   │   ├── ProjectCard.tsx
│   │   │   ├── ProjectDetail.tsx
│   │   │   ├── ProjectFilters.tsx
│   │   │   └── ProjectSearch.tsx
│   │   ├── qc/
│   │   │   ├── QCForm.tsx
│   │   │   ├── QCChecklist.tsx
│   │   │   ├── QCItem.tsx
│   │   │   ├── FileUpload.tsx
│   │   │   ├── DigitalSignature.tsx
│   │   │   ├── QCHistory.tsx
│   │   │   ├── QCReport.tsx
│   │   │   └── PassPercentage.tsx
│   │   └── RoleGate.tsx           # Role-based rendering
│   │
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── usePermission.ts
│   │   ├── usePerfexProjects.ts
│   │   ├── useQC.ts
│   │   └── useDebounce.ts
│   │
│   ├── store/
│   │   └── auth-store.ts          # Zustand store
│   │
│   ├── constants/
│   │   ├── roles.ts
│   │   ├── permissions.ts
│   │   └── messages.ts
│   │
│   └── utils/
│       ├── formatters.ts
│       ├── validators.ts
│       └── helpers.ts
│
├── public/
│   ├── images/
│   └── icons/
│
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── e2e/
│   └── setup.ts
│
├── docker/
│   ├── Dockerfile
│   └── docker-compose.yml
│
├── docs/
│   ├── API.md
│   ├── SETUP.md
│   ├── DEPLOYMENT.md
│   └── TROUBLESHOOTING.md
│
├── .github/
│   └── workflows/
│       ├── ci.yml                 # CI/CD pipeline
│       └── deploy.yml
│
├── package.json
├── package-lock.json
└── README.md
```

---

## 🚀 DEPLOYMENT STRATEGY

### Local Development
```bash
# Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Redis (optional, for caching)

# Setup
npm install
cp .env.example .env.local
npm run db:push          # Run migrations
npm run dev             # Start dev server
```

### Staging Environment
- Deploy to staging.narapati-qc.com
- Run full test suite
- Performance testing
- Security scanning

### Production Environment
- Recommended: Vercel (zero-config deployment)
- Alternative: AWS/GCP with Docker
- Auto-scaling enabled
- CDN configuration
- SSL/TLS certificates

**CI/CD Pipeline (GitHub Actions):**
```yaml
1. Push to main branch
2. Run tests & linting
3. Build Docker image
4. Push to container registry
5. Deploy to staging
6. Run smoke tests
7. Approve for production
8. Deploy to production
9. Monitor & verify
```

---

## 📝 DOCUMENTATION REQUIREMENTS

### For Developers
1. **API Documentation** - OpenAPI/Swagger spec
2. **Code Comments** - Inline documentation
3. **Architecture Diagram** - Visual system design
4. **Setup Guide** - Local development setup
5. **Git Workflow** - Branching strategy
6. **Testing Guide** - How to write tests

### For Users
1. **User Manual** - Step-by-step guides
2. **Video Tutorials** - Screen recordings
3. **FAQ** - Common questions & answers
4. **Troubleshooting** - Common issues & solutions
5. **Quick Reference** - Keyboard shortcuts, tips

### For Operations
1. **Deployment Guide** - Step-by-step deployment
2. **Monitoring Setup** - Alerts & dashboards
3. **Backup Procedures** - Data backup & restore
4. **Disaster Recovery** - Emergency procedures
5. **Runbook** - Common operational tasks

---

## ⏰ PROJECT TIMELINE

| Phase | Duration | Start | End | Status |
|-------|----------|-------|-----|--------|
| Phase 1: Foundation | 2 weeks | Dec 2 | Dec 16 | Planning |
| Phase 2: Authentication | 2 weeks | Dec 16 | Dec 30 | Planning |
| Phase 3: Project Mgmt | 2 weeks | Dec 30 | Jan 13 | Planning |
| Phase 4: QC Checklist | 2 weeks | Jan 13 | Jan 27 | Planning |
| Phase 5: RBAC | 1 week | Jan 27 | Feb 3 | Planning |
| Phase 6: Data Sync | 1 week | Feb 3 | Feb 10 | Planning |
| Phase 7: Testing | 1 week | Feb 10 | Feb 17 | Planning |
| Phase 8: Deployment | 1 week | Feb 17 | Feb 24 | Planning |
| **TOTAL** | **12 weeks** | **Dec 2** | **Feb 24** | **Planning** |

---

## 👥 RESOURCE ALLOCATION

### Team Composition
- **Lead Developer** - 1 person (Full-time)
  - Responsible for: Architecture, core features, code review
  - Skills: Next.js, TypeScript, Database design, API integration

- **Full Stack Developer** - 1 person (Full-time)
  - Responsible for: Frontend components, API routes, testing
  - Skills: React, TypeScript, Node.js, TailwindCSS

- **QA Engineer** - 1 person (Part-time, 50%)
  - Responsible for: Testing, bug reports, UAT coordination
  - Skills: Testing automation, QA best practices

- **DevOps Engineer** - 0.5 person (Part-time, 25%)
  - Responsible for: Infrastructure, CI/CD, monitoring
  - Skills: Docker, Kubernetes, AWS/GCP

### Timeline by Role
```
Lead Dev:    |=====================================|
Full Stack:  |=====================================|
QA:          |==========|=========|========|=====|
DevOps:      |                           |======|
             Dec 2   Dec 16  Dec 30  Jan 13  Feb 3
```

---

## 💰 COST ESTIMATION

### Development Costs
- Lead Developer: 12 weeks × 40 hrs × $75/hr = $36,000
- Full Stack Developer: 12 weeks × 40 hrs × $50/hr = $24,000
- QA Engineer: 12 weeks × 20 hrs × $40/hr = $9,600
- DevOps Engineer: 12 weeks × 10 hrs × $60/hr = $7,200
- **Subtotal: $76,800**

### Infrastructure Costs (Monthly)
- Vercel Hosting: $20
- PostgreSQL Database: $15
- Redis Cache: $10
- Monitoring (Sentry, Datadog): $50
- Email Service (SendGrid): $10
- AWS S3 (File Storage): $5
- **Monthly: $110**

### Tools & Services (One-time)
- GitHub Enterprise: $231/month = $2,772/year
- Testing Tools (BrowserStack): $99/month = $1,188/year
- **Annual: $3,960**

### Total Project Cost (est.)
**Development: $76,800**
**Infrastructure (Year 1): $1,320**
**Tools (Year 1): $3,960**
**Total Year 1: $82,080**

---

## 🎓 ASSUMPTIONS & DEPENDENCIES

### Assumptions
1. ✅ Perfex CRM instance already setup & running
2. ✅ REST API module installed & configured in Perfex
3. ✅ API credentials (token) available & properly scoped
4. ✅ PostgreSQL database available (local + production)
5. ✅ Team has experience with TypeScript & Next.js
6. ✅ No major changes to Perfex CRM during integration
7. ✅ Network connectivity between QC app & Perfex stable

### Dependencies
1. 🔗 **Perfex CRM** - Data source for projects, staff, clients, roles
2. 🔗 **PostgreSQL** - Local data persistence
3. 🔗 **Redis** - Caching layer (optional but recommended)
4. 🔗 **Node.js 18+** - Runtime environment
5. 🔗 **GitHub** - Version control
6. 🔗 **Vercel** - Deployment platform (recommended)

### External Integrations
- Perfex CRM API (mandatory)
- Email service (SendGrid/Resend) - for notifications
- File storage (AWS S3) - optional, for large files
- Monitoring (Sentry) - optional but recommended

---

## ⚠️ RISKS & MITIGATION

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|-----------|
| **API Rate Limiting** | Feature lag | Medium | Implement caching, async processing |
| **Data Sync Failures** | Data inconsistency | Low | Retry logic, manual sync option |
| **Role Permission Mismatch** | Access issues | Low | Comprehensive testing, audit logging |
| **Performance Degradation** | Poor UX | Medium | Load testing, optimization sprints |
| **Security Vulnerabilities** | Data breach | Low | Regular security audits, penetration testing |
| **Schedule Overrun** | Delayed launch | Medium | Agile methodology, weekly standups |
| **Scope Creep** | Budget overrun | Medium | Strict scope management, change control |
| **Staff Turnover** | Knowledge loss | Low | Documentation, code comments, mentoring |

---

## ✅ ACCEPTANCE CRITERIA

### For Phase Completion
- ✅ All user stories completed & accepted
- ✅ Code review completed & approved
- ✅ Unit tests passing (> 80% coverage)
- ✅ Integration tests passing
- ✅ No critical bugs open
- ✅ Documentation complete
- ✅ Performance benchmarks met

### For Final Go-Live
- ✅ All phases completed
- ✅ UAT signed off by stakeholders
- ✅ Production database setup & tested
- ✅ Monitoring & alerting configured
- ✅ Backup & disaster recovery tested
- ✅ Staff training completed
- ✅ Support procedures documented
- ✅ Go-no-go decision approved

---

## 📞 NEXT STEPS

### Immediate Actions (This Week)
1. [ ] Approve PRD
2. [ ] Finalize team & resource allocation
3. [ ] Setup development environment
4. [ ] Verify Perfex API credentials & scopes
5. [ ] Schedule kickoff meeting

### Planning Phase (Next Week)
1. [ ] Detailed technical design
2. [ ] Create database schema diagrams
3. [ ] API endpoint specifications
4. [ ] UI/UX wireframes
5. [ ] Risk mitigation plans

### Development Start (Week After)
1. [ ] Setup project repository
2. [ ] Create initial project structure
3. [ ] Begin Phase 1 (Foundation)
4. [ ] Daily standups (09:00 AM WIB)
5. [ ] Weekly progress reviews (Friday 03:00 PM WIB)

---

## 📚 APPENDIX

### A. Glossary of Terms

**API Token** - Secure authentication key for Perfex CRM API
**RBAC** - Role-Based Access Control
**JWT** - JSON Web Token for session management
**ORM** - Object-Relational Mapping (Prisma)
**SSO** - Single Sign-On
**QC** - Quality Control
**UAT** - User Acceptance Testing
**CI/CD** - Continuous Integration/Continuous Deployment
**MTTR** - Mean Time To Recovery

### B. References

- Perfex CRM Documentation: https://www.perfexcrm.com/documentations/
- Perfex CRM REST API Guide: https://perfexcrm.themesic.com/apiguide/
- Next.js 15 Documentation: https://nextjs.org/docs
- TypeScript Best Practices: https://www.typescriptlang.org/docs/
- Tailwind CSS Documentation: https://tailwindcss.com/docs
- Prisma ORM Guide: https://www.prisma.io/docs

### C. Approval Sign-off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Project Owner | | | |
| Lead Developer | | | |
| Technical Lead | | | |
| Business Stakeholder | | | |

---

**Document Version:** 1.0
**Last Updated:** December 2, 2025
**Next Review:** After Phase 1 Completion
**Status:** DRAFT - Awaiting Approval

