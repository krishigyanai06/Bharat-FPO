# CBBO Dashboard — Build Specification

> This document tells you **exactly** how to create the CBBO Dashboard inside the existing **Bharat FPO** project. Read every section before writing a single line of code.

---

## 1. What is CBBO?

**CBBO (Cluster Based Business Organization)** is a new role in the system that sits between **SuperAdmin** and **FPO/Admin**.

| Role | What they can do |
|---|---|
| `superadmin` | God-mode. Creates tenants, picks any tenant, sees everything. Read-only on data. |
| **`cbbo`** | **Monitors everything across multiple FPOs (tenants) just like SuperAdmin. Read-only on all data. Has a dedicated dashboard at `/cbbo-dashboard`.** |
| `admin` / `fpo` | Full CRUD on their own tenant's data. |
| `viewer` | Read-only on their own tenant. |

CBBO sees the **same data** as SuperAdmin — they can switch tenants and monitor all pages. The only difference is the **entry route** and the **sidebar label** shown to them.

---

## 2. Existing Project Structure (don't break anything)

```
src/
├── components/
│   ├── Layout.jsx          ← main shell, sidebar, header
│   ├── ProtectedRoute.jsx  ← role-based route guard
│   └── ...
├── config/
│   ├── rbac.js             ← ROLES, PERMISSIONS, ROUTE_ROLES
│   └── theme.js            ← brand config + API base URL
├── pages/
│   ├── Dashboard.jsx       ← existing FPO dashboard
│   ├── CreateTenant.jsx    ← SuperAdmin only
│   ├── TierFeatures.jsx    ← SuperAdmin only
│   └── ... (Listing, Inventory, Members, etc.)
├── store/
│   ├── slices/             ← Redux slices
│   ├── thunks/             ← Redux thunks (API calls)
│   └── store.js
├── lib/
│   ├── api.js              ← Axios instance with JWT + tenant header logic
│   └── tokenStorage.js
└── App.jsx                 ← React Router routes
```

---

## 3. Tech Stack (do not change)

| Layer | Tech |
|---|---|
| UI | React 18 + Vite + Tailwind CSS |
| State | Redux Toolkit |
| Routing | React Router v7 |
| HTTP | Axios (via `src/lib/api.js`) |
| Charts | Recharts |
| Icons | lucide-react |
| Toasts | react-hot-toast |

---

## 4. Changes Required — File by File

### 4.1 `src/config/rbac.js` — Add CBBO role

```js
export const ROLES = {
  FPO: 'fpo',
  ADMIN: 'admin',
  SUPERADMIN: 'superadmin',
  CBBO: 'cbbo',          // ← ADD THIS
  VIEWER: 'viewer',
};

// CBBO is read-only like SuperAdmin
export const ROLE_PERMISSIONS = {
  [ROLES.SUPERADMIN]: [PERMISSIONS.READ],
  [ROLES.CBBO]:       [PERMISSIONS.READ],   // ← ADD THIS
  [ROLES.VIEWER]:     [PERMISSIONS.READ],
  [ROLES.ADMIN]:      [PERMISSIONS.READ, PERMISSIONS.CREATE, PERMISSIONS.UPDATE, PERMISSIONS.DELETE],
  [ROLES.FPO]:        [PERMISSIONS.READ, PERMISSIONS.CREATE, PERMISSIONS.UPDATE, PERMISSIONS.DELETE],
};

// Add 'cbbo' to every route that superadmin can access
export const ROUTE_ROLES = {
  '/dashboard':        [..., ROLES.CBBO],
  '/listing':          [..., ROLES.CBBO],
  '/procurement':      [..., ROLES.CBBO],
  '/inventory':        [..., ROLES.CBBO],
  '/buy':              [..., ROLES.CBBO],
  '/broadcast':        [..., ROLES.CBBO],
  '/members':          [..., ROLES.CBBO],
  '/documents':        [..., ROLES.CBBO],
  '/ledger':           [..., ROLES.CBBO],
  '/advertisement':    [..., ROLES.CBBO],
  '/settings':         [..., ROLES.CBBO],
  // NOTE: '/create-tenant' and '/tier-features' stay SuperAdmin-only
  '/cbbo-dashboard':   [ROLES.CBBO, ROLES.SUPERADMIN],  // ← ADD THIS new route
};

// Update isReadOnly helper
export const isReadOnly = (role) => {
  const r = role?.toLowerCase();
  return r === ROLES.SUPERADMIN || r === ROLES.CBBO || r === ROLES.VIEWER;
};
```

---

### 4.2 `src/lib/api.js` — Treat CBBO like SuperAdmin for tenant context

In the request interceptor, find the block that checks `isSuperAdminUser`. Update it:

```js
// OLD
isSuperAdminUser = String(user.role).replace(/\s+/g,'').toLowerCase() === 'superadmin';

// NEW — also treat cbbo as a "super" user who needs tenant context
const normalizedRole = String(user.role).replace(/\s+/g,'').toLowerCase();
isSuperAdminUser = normalizedRole === 'superadmin' || normalizedRole === 'cbbo';
```

This ensures CBBO requests automatically send `x-tenant-id` header + `tenantId` query param, exactly like SuperAdmin.

---

### 4.3 `src/components/Layout.jsx` — Show CBBO the tenant switcher + correct menu

#### 3a. Detect CBBO role alongside SuperAdmin

Find every place that checks `isSuperAdmin` and add `cbbo` check:

```js
// OLD
const isSuperAdmin = userRole === "superadmin";

// NEW
const isSuperAdmin = userRole === "superadmin" || userRole === "cbbo";
```

This makes CBBO automatically:
- See the **tenant dropdown** in the header
- Fetch all tenants on load
- Auto-select a default tenant
- Trigger data re-fetch when switching tenant

#### 3b. Add CBBO-specific sidebar item

In the `menuItems` array, add a new entry that only CBBO (and SuperAdmin) can see:

```js
{ icon: LayoutDashboard, label: "CBBO Dashboard", path: "/cbbo-dashboard", roles: ["cbbo", "superadmin"] },
```

Place it **at the top** of the menu list so it appears as the first item for CBBO users.

#### 3c. Sidebar brand label

The sidebar already shows `user?.role || me?.role`. No change needed — it will automatically display "cbbo".

---

### 4.4 `src/pages/CbboDashboard.jsx` — NEW FILE (create this)

This is the main page. It shows **the same data as the existing `Dashboard.jsx`** but with a different heading and a CBBO-specific badge.

**Full implementation plan:**

```
CbboDashboard.jsx
  ├── Imports same Redux selectors as Dashboard.jsx
  │   └── getDashboardData thunk, dashboard slice state
  ├── Same useEffect to dispatch getDashboardData()
  │   └── Guard: if (isCbbo || isSuperAdmin) && !selectedTenantId → return early
  ├── Same stat cards: Pending Approvals, Approved Listings, Total Orders, Total Farmers
  ├── Same charts:
  │   ├── Monthly Procurement Bar Chart
  │   ├── Monthly Sales Revenue Area Chart
  │   ├── Monthly Orders Count Bar Chart
  │   └── Top Selling Products Pie Chart
  └── Header says "CBBO Dashboard Overview" instead of "Dashboard Overview"
```

**Key differences from Dashboard.jsx:**
1. Page title → `"CBBO Dashboard Overview"`
2. Subtitle → `"Monitoring all FPO activity across tenants."`
3. No "Download Report" button (CBBO is read-only — omit PDF export)
4. Role check uses `userRole === 'cbbo' || userRole === 'superadmin'` for the tenant-wait guard

**Skeleton of the file:**

```jsx
// src/pages/CbboDashboard.jsx
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getDashboardData } from "../store/thunks/dashboardThunk";
// ... same imports as Dashboard.jsx (charts, icons, skeleton)

function CbboDashboard() {
  const dispatch = useDispatch();
  const { stats, monthlyRevenue, /* ...rest */ loading, error } = useSelector(s => s.dashboard);
  const { user } = useSelector(s => s.auth);
  const { selectedTenantId } = useSelector(s => s.layout);

  const userRole = String(user?.role || "").replace(/\s+/g,"").toLowerCase();
  const isMonitor = userRole === "cbbo" || userRole === "superadmin";

  useEffect(() => {
    if (isMonitor && !selectedTenantId) return;
    dispatch(getDashboardData());
  }, [dispatch, isMonitor, selectedTenantId]);

  if (isMonitor && !selectedTenantId) {
    return <div>Waiting for tenant selection...</div>;
  }

  if (loading) return <SkeletonLayout />;
  if (error)   return <ErrorState />;

  return (
    <div className="space-y-6">
      {/* Header — CBBO branding */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">CBBO Dashboard Overview</h1>
        <p className="text-sm text-gray-500 mt-0.5">Monitoring all FPO activity across tenants.</p>
      </div>

      {/* Stat Cards — identical to Dashboard.jsx */}
      {/* Charts — identical to Dashboard.jsx */}
    </div>
  );
}

export default CbboDashboard;
```

> Copy the stat cards and chart sections verbatim from `Dashboard.jsx`. Only change the header text and remove the PDF download button.

---

### 4.5 `src/App.jsx` — Register the new route

Add the lazy import and the route:

```jsx
// Add with other lazy imports
const CbboDashboard = lazy(() => import('./pages/CbboDashboard'));

// Add inside the nested routes (after the existing routes)
<Route
  path="cbbo-dashboard"
  element={
    <ProtectedRoute allowedRoles={ROUTE_ROLES['/cbbo-dashboard']}>
      <Suspense fallback={<PageLoader />}>
        <CbboDashboard />
      </Suspense>
    </ProtectedRoute>
  }
/>
```

---

## 5. How Data Flow Works for CBBO

```
1. CBBO logs in → JWT token contains role: "cbbo"
2. authSlice stores user.role = "cbbo"
3. Layout.jsx detects isSuperAdmin = true  (because cbbo check is included)
4. Layout fetches all tenants → shows tenant dropdown in header
5. CBBO picks a tenant → selectedTenantId saved to localStorage + Redux
6. api.js interceptor reads user.role === "cbbo" → sends x-tenant-id header on every request
7. CbboDashboard dispatches getDashboardData() → backend returns that tenant's data
8. Dashboard renders exactly the same charts/stats as the FPO would see
```

---

## 6. Routing Summary After Changes

| Path | Who can access |
|---|---|
| `/dashboard` | fpo, admin, viewer, superadmin, **cbbo** |
| `/listing` | fpo, admin, superadmin, **cbbo** |
| `/procurement` | fpo, admin, superadmin, **cbbo** |
| `/inventory` | fpo, admin, viewer, superadmin, **cbbo** |
| `/buy` | fpo, admin, superadmin, **cbbo** |
| `/broadcast` | fpo, admin, superadmin, **cbbo** |
| `/members` | fpo, admin, viewer, superadmin, **cbbo** |
| `/documents` | fpo, admin, viewer, superadmin, **cbbo** |
| `/ledger` | fpo, admin, superadmin, **cbbo** |
| `/advertisement` | fpo, admin, superadmin, **cbbo** |
| `/reports` | fpo, admin, viewer |
| `/settings` | fpo, admin, superadmin, **cbbo** |
| `/create-tenant` | superadmin only |
| `/tier-features` | superadmin only |
| **`/cbbo-dashboard`** | **cbbo, superadmin** |

---

## 7. Sidebar Menu for CBBO (visible items)

When `userRole === "cbbo"`, the sidebar should show:

1. CBBO Dashboard `/cbbo-dashboard` ← new, top of list
2. Dashboard `/dashboard`
3. Listing Approvals `/listing`
4. Procurement `/procurement`
5. Inventory `/inventory`
6. Order Book `/buy`
7. Broadcast `/broadcast`
8. Members `/members`
9. Ledger `/ledger`
10. Advertisement `/advertisement`
11. Settings `/settings`

**NOT shown to CBBO:** Create Tenant, Tier & Features, Reports (per ROUTE_ROLES above).

---

## 8. CBBO vs SuperAdmin — Differences at a Glance

| Feature | SuperAdmin | CBBO |
|---|---|---|
| See tenant dropdown | ✅ | ✅ |
| Switch tenants | ✅ | ✅ |
| All monitoring pages | ✅ | ✅ |
| Create Tenant page | ✅ | ❌ |
| Tier & Features page | ✅ | ❌ |
| CBBO Dashboard page | ✅ (can also access) | ✅ |
| Write/edit any data | ❌ read-only | ❌ read-only |

---

## 9. Backend Expectation

The backend already supports:
- `x-tenant-id` header → scopes all queries to that tenant
- `tenantId` query param → fallback
- JWT role field → `"cbbo"` should be a valid role string the backend recognizes

**If the backend does not yet know the `cbbo` role**, ask the backend team to:
1. Allow `cbbo` as a valid role in their auth middleware
2. Treat `cbbo` with the same read permissions as `superadmin` (tenant-scoped reads)

---

## 10. Files to Create / Modify

| Action | File |
|---|---|
| **MODIFY** | `src/config/rbac.js` |
| **MODIFY** | `src/lib/api.js` |
| **MODIFY** | `src/components/Layout.jsx` |
| **MODIFY** | `src/App.jsx` |
| **CREATE** | `src/pages/CbboDashboard.jsx` |

That's it. 5 files total. No new Redux slices, no new thunks, no new API calls needed — CBBO reuses everything SuperAdmin already has.

---

## 11. Quick Checklist Before You Ship

- [ ] `ROLES.CBBO = 'cbbo'` added to rbac.js
- [ ] `ROLE_PERMISSIONS[cbbo]` set to `[READ]`
- [ ] `cbbo` added to `ROUTE_ROLES` for all appropriate routes
- [ ] `/cbbo-dashboard` route added to `ROUTE_ROLES`
- [ ] `isReadOnly()` returns true for `cbbo`
- [ ] `api.js` treats `cbbo` role as super user (sends tenant context headers)
- [ ] `Layout.jsx` `isSuperAdmin` flag includes `cbbo`
- [ ] `CbboDashboard.jsx` created with same data as `Dashboard.jsx`
- [ ] New route registered in `App.jsx`
- [ ] "CBBO Dashboard" sidebar item added with `roles: ["cbbo", "superadmin"]`
- [ ] No existing tests or features broken
