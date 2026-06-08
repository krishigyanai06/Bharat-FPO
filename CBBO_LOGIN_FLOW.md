# CBBO Dashboard — Login Flow Specification

> Complete guide for building the CBBO login page. The existing Bharat FPO login is **OTP-based**.
> CBBO login follows the **exact same flow** — just a different role tab added.

---

## How the Current Login Works (Existing)

```
Step 1 — Enter Mobile
  User picks role tab (FPO Admin | Super Admin)
  Enters 10-digit mobile number
  Clicks "Send OTP"
    → POST /otp/send-otp  { mobile, role, tenantCode? }
    → On success: UI moves to Step 2

Step 2 — Enter OTP
  6 individual digit input boxes (auto-focus next on type)
  Paste support (full 6-digit paste works)
  Backspace support (moves to previous box)
  Clicks "Verify OTP"
    → POST /otp/verify-otp  { mobile, otp, role, tenantCode? }
    → On success: JWT token saved, user saved, navigate to /dashboard
```

---

## What Changes for CBBO

Add a **3rd role tab** → `CBBO` alongside the existing `FPO Admin` and `Super Admin` tabs.

Everything else (OTP flow, inputs, validation, error handling) stays **100% identical**.

---

## 1. Role Tabs — Updated

```jsx
// Current tabs in Login.jsx
[
  { key: "Admin",      label: "FPO Admin",   emoji: "🏢" },
  { key: "SuperAdmin", label: "Super Admin", emoji: "⚡" },
]

// Updated tabs — add CBBO
[
  { key: "Admin",      label: "FPO Admin",   emoji: "🏢" },
  { key: "SuperAdmin", label: "Super Admin", emoji: "⚡" },
  { key: "CBBO",       label: "CBBO",        emoji: "🌐" },
]
```

---

## 2. API Payload Rules

| Role selected | tenantCode sent? | API payload |
|---|---|---|
| `Admin` | ✅ Yes — from `theme.tenantCode` | `{ mobile, role: "Admin", tenantCode: "MAR4UP" }` |
| `SuperAdmin` | ❌ No | `{ mobile, role: "SuperAdmin" }` |
| `CBBO` | ❌ No (same as SuperAdmin) | `{ mobile, role: "CBBO" }` |

In `authThunk.js`, the existing rule is:
```js
if (payload.role !== "SuperAdmin" && theme.tenantCode) {
  payload.tenantCode = theme.tenantCode;
}
```

Update it to also skip tenantCode for CBBO:
```js
const isGlobalRole = payload.role === "SuperAdmin" || payload.role === "CBBO";
if (!isGlobalRole && theme.tenantCode) {
  payload.tenantCode = theme.tenantCode;
}
```

---

## 3. Complete Login Flow Diagram

```
┌─────────────────────────────────────────────┐
│              LOGIN PAGE                      │
│                                              │
│  [ FPO Admin ] [ Super Admin ] [ CBBO ]      │  ← Role tabs
│                                              │
│  Step 1: Mobile Input                        │
│  ┌──────────────────────────────────────┐   │
│  │ +91 │ 9876543210              10/10  │   │
│  └──────────────────────────────────────┘   │
│  [ Send OTP ]                                │
│       │                                      │
│       ▼ POST /otp/send-otp                   │
│       { mobile, role: "CBBO" }               │
│       │                                      │
│       ▼ success → setStep(2)                 │
│                                              │
│  Step 2: OTP Input                           │
│  ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐       │
│  │ 4 │ │ 2 │ │ 1 │ │ 9 │ │ 3 │ │ 7 │       │
│  └───┘ └───┘ └───┘ └───┘ └───┘ └───┘       │
│  Sent to +91 9876543210  [Change number]     │
│  [ Verify OTP ]                              │
│       │                                      │
│       ▼ POST /otp/verify-otp                 │
│       { mobile, otp, role: "CBBO" }          │
│       │                                      │
│       ▼ success                              │
│       token → sessionStorage                 │
│       user  → localStorage                   │
│       user.role = "cbbo"                     │
│       │                                      │
│       ▼ navigate("/dashboard")               │
│       (Layout detects cbbo → shows           │
│        tenant switcher + CBBO sidebar)       │
└─────────────────────────────────────────────┘
```

---

## 4. Files to Change — Only 2

### File 1: `src/pages/Login.jsx`

Find the ROLES array and add CBBO:

```jsx
// BEFORE
const ROLES = [
  { key: "Admin",      label: "FPO Admin",   emoji: "🏢" },
  { key: "SuperAdmin", label: "Super Admin", emoji: "⚡" },
];

// AFTER
const ROLES = [
  { key: "Admin",      label: "FPO Admin",   emoji: "🏢" },
  { key: "SuperAdmin", label: "Super Admin", emoji: "⚡" },
  { key: "CBBO",       label: "CBBO",        emoji: "🌐" },
];
```

That is the **only change** in Login.jsx. The tabs are already rendered in a `.map()` loop so adding 1 object to the array is all that's needed.

---

### File 2: `src/store/thunks/authThunk.js`

Update tenantCode logic in **both** `sendOtp` and `verifyOtp`:

```js
// BEFORE (in both thunks)
if (payload.role !== "SuperAdmin" && theme.tenantCode) {
  payload.tenantCode = theme.tenantCode;
}

// AFTER
const isGlobalRole = payload.role === "SuperAdmin" || payload.role === "CBBO";
if (!isGlobalRole && theme.tenantCode) {
  payload.tenantCode = theme.tenantCode;
}
```

---

## 5. What Happens After CBBO Logs In

```
verifyOtp.fulfilled runs
  → token saved to sessionStorage
  → user.role = "cbbo" saved to localStorage
  → navigate("/dashboard")

Layout.jsx renders
  → normalizeRole(user.role) === "cbbo"
  → isSuperAdmin = true  (because cbbo is included in the check)
  → fetchTenants() dispatched
  → Tenant dropdown appears in header
  → CBBO Dashboard sidebar item appears
  → Data loads for selected tenant
```

---

## 6. Validation Rules (unchanged from existing)

| Field | Rule |
|---|---|
| Mobile | Required, regex `/^[6-9][0-9]{9}$/`, 10 digits only |
| OTP | All 6 boxes must be filled before submit |
| Role | Must be one of: Admin, SuperAdmin, CBBO |

Error display: shown in a red alert box above the form inputs (already built).

---

## 7. State Flow (Redux)

```
sendOtp dispatched
  → auth.loading = true
  → auth.error = null
  ← success: auth.otpSent = true, loading = false
  ← failure: auth.error = "message", loading = false

verifyOtp dispatched
  → auth.loading = true
  ← success:
      auth.token = "jwt..."
      auth.user  = { role: "cbbo", ... }
      auth.isAuthenticated = true
      auth.loading = false
      sessionStorage.token = "jwt..."
      localStorage.user = "{...}"
  ← failure:
      auth.error = "Invalid OTP"
      auth.loading = false
```

---

## 8. After-Login Redirect Logic

```js
// In Login.jsx — no change needed
await dispatch(verifyOtp({ mobile, otp, role })).unwrap();
navigate("/dashboard", { replace: true });
```

CBBO lands on `/dashboard` first (same as others).
From there they can navigate to `/cbbo-dashboard` via sidebar.

Alternatively, redirect CBBO directly to their dedicated page:

```js
// Optional: role-based redirect after login
const resolvedRole = String(userData?.role || role).toLowerCase().replace(/\s+/g, "");
if (resolvedRole === "cbbo") {
  navigate("/cbbo-dashboard", { replace: true });
} else {
  navigate("/dashboard", { replace: true });
}
```

---

## 9. Summary — Total Changes for CBBO Login

| File | Change | Lines |
|---|---|---|
| `Login.jsx` | Add 1 object to ROLES array | 1 line |
| `authThunk.js` | Update tenantCode skip condition (×2) | 2 lines |
| `rbac.js` | Already covered in CBBO_DASHBOARD.md | — |

**That's it. 3 lines of code to add CBBO login support.**

---

## 10. Quick Checklist

- [ ] CBBO tab added to Login.jsx ROLES array
- [ ] `authThunk.js` sendOtp — tenantCode skipped for CBBO
- [ ] `authThunk.js` verifyOtp — tenantCode skipped for CBBO
- [ ] Backend accepts `role: "CBBO"` in `/otp/send-otp`
- [ ] Backend accepts `role: "CBBO"` in `/otp/verify-otp`
- [ ] Backend returns valid JWT with `role: "cbbo"` in token/user data
- [ ] After login, CBBO lands on dashboard and sees tenant switcher
