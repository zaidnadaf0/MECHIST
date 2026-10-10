MECHIST — ROADASSISTBACKUP-INSPIRED ROLE-BASED LOGIN + PORTAL STRUCTURE REBUILD

PROJECTS
========
Current project:
D:\MECHIST

Reference project:
D:\RoadAssistBACKUP

Use RoadAssistBACKUP as the PRIMARY UI/UX reference for the login experiences, role separation, dashboards, navigation, and useful role-specific surfaces.

IMPORTANT:
- Do NOT create a new project.
- Do NOT replace MECHIST's architecture with RoadAssistBACKUP's architecture.
- RoadAssistBACKUP is a design/structure/feature reference only.
- Preserve MECHIST's Firebase/backend architecture and existing functionality.
- Do NOT commit.
- Do NOT push.

MAIN PROBLEM
============
The current MECHIST website does not make the three roles feel like three properly separated professional portals.

Desired structure:

CUSTOMER
Customer Login
    ↓
Customer Dashboard
    ↓
Customer-specific pages/features

MECHANIC
Mechanic Login
    ↓
Mechanic Dashboard
    ↓
Mechanic-specific pages/features

ADMIN
Admin Login
    ↓
Admin Dashboard
    ↓
Admin-specific pages/features

Do NOT make one generic dashboard that attempts to serve all roles.

STEP 1 — INSPECT BOTH PROJECTS FIRST
====================================
Before making significant modifications, inspect:
D:\MECHIST
D:\RoadAssistBACKUP

Compare:
- Login pages
- Customer login
- Mechanic login
- Admin login
- Role selection
- Dashboard layouts
- Sidebar/top navigation
- Customer pages
- Mechanic pages
- Admin pages
- Protected routes
- Role guards
- Firebase authentication
- Existing MECHIST role logic
- Relevant RoadAssistBACKUP components and page structure

First understand how each project currently works.

Do not blindly copy code from RoadAssistBACKUP.

STEP 2 — REQUIRED LOGIN STRUCTURE
=================================
THREE clearly separated login experiences are required.

CUSTOMER LOGIN
Route: /login/customer
Purpose: Customer signs in to request and manage roadside assistance.
After successful authentication → customer dashboard.
Customer must never land on mechanic/admin dashboard.

MECHANIC LOGIN
Route: /login/mechanic
Purpose: Mechanic signs in to receive and manage roadside assistance jobs.
After successful authentication → mechanic dashboard.
Mechanic must never land on customer/admin dashboard.

ADMIN LOGIN
Route: /admin/login
Purpose: Administrator signs in to operate and manage the platform.
After successful authentication → admin dashboard.
Admin must never land on customer/mechanic dashboard.

STEP 3 — LOGIN PAGE DESIGN
==========================
Take strong inspiration from the RoadAssistBACKUP login pages.

The three login pages should feel intentionally designed for their role.
Do NOT simply duplicate one login screen three times with a different title.

Each login page should have:
- Role-specific heading
- Role-specific supporting text
- Role-specific visual/icon
- Email field
- Password field
- Show/hide password
- Login button
- Forgot password
- Appropriate signup/navigation
- Loading state
- Firebase authentication error state
- Successful-login transition
- Responsive layout
- Proper spacing and visual hierarchy

Keep MECHIST branding and design language.
Use RoadAssistBACKUP for inspiration rather than copying its implementation.

STEP 4 — CUSTOMER PORTAL
========================
Customer routes:
/dashboard
/request
/track/:id
/history
/vehicles

Customer dashboard should clearly communicate:
- Customer identity/welcome
- Request roadside assistance
- Current active request
- Assigned mechanic
- Tracking
- Recent service history
- Vehicles
- Notifications
- Relevant customer actions

Customer navigation should contain only customer-relevant features.

Customer must NOT see:
- Mechanic job queue
- Mechanic availability controls
- Mechanic profile management
- Admin controls
- Admin statistics
- Mechanic approval controls

Customer portal should feel complete and intentional, not like a generic dashboard with empty boxes.

STEP 5 — MECHANIC PORTAL
========================
Mechanic routes:
/mechanic
/mechanic/job/:id
/mechanic/history
/mechanic/profile

Mechanic dashboard should clearly communicate:
- Mechanic identity
- Verification status
- Online/offline availability
- Incoming job offers
- Active job
- Current job status
- Job history
- Profile
- Service/location information
- Notifications where applicable

Mechanic navigation should contain only mechanic-relevant features.

Mechanic must NOT see:
- Customer vehicle management
- Customer request creation
- Customer-only history
- Admin controls
- Admin analytics

IMPORTANT:
Preserve the existing MECHIST mechanic workflow:
requested → accepted → on-the-way → arrived → service → completed

Preserve:
- decline
- release
- rematching
- declinedBy
- 120-second offer behavior
- realtime Firebase listeners
- mechanic eligibility
- GPS/location functionality

STEP 6 — ADMIN PORTAL
=====================
Admin routes:
/admin
/admin/mechanics
/admin/requests
/admin/users

Admin dashboard should feel like a REAL OPERATIONS DASHBOARD.

Clearly communicate:
- Total users
- Customers
- Mechanics
- Pending mechanic approvals
- Active requests
- Completed requests
- Request status overview
- Operational diagnostics
- Admin actions

Admin navigation:
- Dashboard
- Mechanics
- Requests
- Users

Use existing MECHIST admin authorization.
DO NOT weaken admin security.
Preserve isClaimAdmin, role authorization, and Firestore security rules.

STEP 7 — ROLE-BASED ROUTING
==========================
Audit current authentication and routing.

Implement/repair:
Customer authentication → Customer portal
Mechanic authentication → Mechanic portal
Admin authentication → Admin portal

If authenticated user attempts another role's protected route:
Customer → mechanic/admin: BLOCK
Mechanic → customer/admin: BLOCK
Admin → customer/mechanic: BLOCK unless legitimately required.

Redirect unauthorized users to their own portal.

Do not use frontend-only role checks as the only security mechanism.
Preserve Firebase authorization/security.

Role resolution must NOT produce a blank page.
While loading: intentional loading/fallback state.
If resolution fails: intentional error state or safe redirect.

STEP 8 — NAVIGATION
===================
Separate navigation systems.

CUSTOMER:
Dashboard
Request Assistance
Track Service
History
Vehicles
Notifications/Profile as appropriate

MECHANIC:
Dashboard
Jobs
History
Profile
Notifications as appropriate

ADMIN:
Dashboard
Mechanics
Requests
Users

Active navigation item must always be visually obvious.
Do not show irrelevant navigation to another role.
Navigation must work on desktop and mobile.

STEP 9 — DASHBOARD QUALITY
==========================
Dashboards must NOT contain:
- Huge empty boxes
- Blank cards
- Empty dark containers
- unexplained whitespace
- fake statistics
- fake mechanics
- fake requests
- placeholder descriptions

Use real MECHIST Firebase data.

Genuine no-data:
show useful empty state explaining next action.

Loading:
show proper skeleton/loading state.

Firebase failure:
show actual error state.

Never silently convert Firebase/network errors into empty arrays.

Use viewport space intelligently.
Avoid excessive max-width constraints leaving large unused areas.

STEP 10 — ROADASSISTBACKUP INSPIRATION
======================================
Review RoadAssistBACKUP:
- Customer dashboard
- Mechanic dashboard
- Admin dashboard
- Login experiences
- Navigation
- Profile surfaces
- Vehicle surfaces
- Notifications
- History
- Admin operations

Bring over ONLY useful concepts that fit MECHIST.
Do NOT copy its architecture.

Do NOT introduce:
- localStorage as source of truth
- fake seed data
- fake ETA
- fake fees
- duplicate map systems
- fake mechanics
- monolithic app state

MECHIST Firebase remains the source of truth.

STEP 11 — EXISTING MECHIST FEATURES THAT MUST NOT BREAK
=======================================================
Do NOT break:
- Firebase Auth
- Firestore
- Firebase Storage
- Realtime listeners
- Customer request lifecycle
- Mechanic matching
- declinedBy
- rematching
- mechanic release
- GPS/geolocation
- maps
- vehicle CRUD
- notifications
- history
- admin authorization
- admin assignment/reassignment
- Firestore security rules
- Storage security rules

ML PHASES 6–8 MUST REMAIN UNTOUCHED.
DO NOT START ML PHASE 9.
DO NOT START ML PHASE 10.

STEP 12 — NOT JUST COSMETIC CHANGES
===================================
The actual information architecture must be corrected.

Final experience:

                    MECHIST
                       |
          ┌────────────┼────────────┐
          ↓            ↓            ↓
      CUSTOMER      MECHANIC       ADMIN
       LOGIN          LOGIN         LOGIN
          ↓            ↓            ↓
     CUSTOMER       MECHANIC      ADMIN
     DASHBOARD      DASHBOARD     DASHBOARD
          ↓            ↓            ↓
     CUSTOMER       MECHANIC      ADMIN
      FEATURES       FEATURES      FEATURES

Each role should feel like its own professional portal.

STEP 13 — VISUAL DIRECTION
==========================
Use the best ideas from RoadAssistBACKUP while keeping MECHIST identity.

Desired qualities:
- Professional roadside-assistance platform
- Modern mobility/automotive technology
- Clear role identity
- Strong visual hierarchy
- Premium but practical
- Clean cards and panels
- Useful motion where appropriate
- No excessive empty space
- No fake content
- No crypto/gaming/neon aesthetic
- No unnecessary glassmorphism
- No giant decorative elements competing with controls

Role colors may distinguish portals:
Customer: azure/signal direction
Mechanic: aqua direction
Admin: iris direction

Keep accessibility and contrast in mind.

STEP 14 — RESPONSIVE DESIGN
==========================
Must work on:
- Desktop
- Laptop
- Tablet
- Mobile

On mobile:
- navigation collapses cleanly
- important actions remain obvious
- cards do not overflow
- dialogs fit viewport
- forms remain usable

STEP 15 — IMPLEMENTATION ORDER
==============================
1. Inspect RoadAssistBACKUP login/portal structure.
2. Inspect MECHIST authentication/routing.
3. Identify cause of poor role separation.
4. Implement/repair three login experiences.
5. Repair role-based redirects.
6. Repair customer portal structure.
7. Repair mechanic portal structure.
8. Repair admin portal structure.
9. Repair role-specific navigation.
10. Fix dashboard layouts and empty/loading/error states.
11. Verify protected routes.
12. Verify existing functionality.
13. Run all project gates.

Run:
npm run typecheck
npm run build
npm test
npm run lint:rules
npm --prefix functions run build

STEP 16 — TEST ACTUAL ROLE FLOWS
================================
CUSTOMER:
Customer login → Customer dashboard → Request → Vehicles → History → Tracking

MECHANIC:
Mechanic login → Mechanic dashboard → Job → History → Profile

ADMIN:
Admin login → Admin dashboard → Mechanics → Requests → Users

Also test unauthorized route access.

Confirm:
- Customer cannot enter mechanic/admin portal.
- Mechanic cannot enter customer/admin portal.
- Non-admin cannot enter admin portal.
- Role resolution does not show blank screen.
- Existing Firebase data continues to load.

STEP 17 — DO NOT PUSH
=====================
DO NOT:
- git commit
- git push
- create a PR
- merge anything

I will manually inspect the website first.
Keep all changes local.

FINAL REPORT
============
Report:
1. Files changed
2. Customer login changes
3. Mechanic login changes
4. Admin login changes
5. Customer portal changes
6. Mechanic portal changes
7. Admin portal changes
8. Routing/role-guard changes
9. Navigation changes
10. Empty/loading/error-state changes
11. RoadAssistBACKUP concepts adopted
12. RoadAssistBACKUP concepts deliberately NOT adopted
13. Existing MECHIST functionality preserved
14. Tests and build results
15. Remaining limitations

Do not claim browser verification unless actually performed.

MOST IMPORTANT:
The result should make a user immediately understand:
"I am a CUSTOMER and this is my customer portal."
"I am a MECHANIC and this is my mechanic portal."
"I am an ADMIN and this is my admin operations portal."

Use the existing MECHIST architecture, with RoadAssistBACKUP as the visual/structural reference.
