# KrishiGyanAI — Bharat FPO Connect (Backend API)

Multi-tenant, single-database agri-tech platform backend built with **Node.js**, **Express**, and **MongoDB/Mongoose**.

---

## Table of Contents

- [Setup](#setup)
- [Authentication](#authentication)
- [Testing Notes (Multi-Tenant)](#testing-notes-multi-tenant)
- [API Endpoints](#api-endpoints)
  - [OTP](#1-otp)
  - [User (Auth & Profile)](#2-user-auth--profile)
  - [Admin](#3-admin)
  - [Product](#4-product)
  - [Inventory](#5-inventory)
  - [Cart](#6-cart)
  - [Order](#7-order)
  - [Sell (Counter Sales)](#8-sell-counter-sales)
  - [Procurement](#9-procurement)
  - [Payment](#10-payment)
  - [Ledger](#11-ledger)
  - [Farm](#12-farm)
  - [Crop (User Crops)](#13-crop-user-crops)
  - [Crop Calendar](#14-crop-calendar)
  - [Crop Doctor (AI)](#15-crop-doctor-ai)
  - [Sell Crops (Farmer Marketplace)](#16-sell-crops-farmer-marketplace)
  - [Community (Posts)](#17-community-posts)
  - [Broadcast (Notifications)](#18-broadcast-notifications)
  - [Advertisement Posters](#19-advertisement-posters)
  - [Marketplace](#20-marketplace)
  - [Chat (AI Chatbot)](#21-chat-ai-chatbot)
  - [FCM (Push Tokens)](#22-fcm-push-tokens)
  - [Mandi Price](#23-mandi-price)
  - [Tenant (Configuration)](#24-tenant-configuration)
  - [Kisan Khata (Kisan Diary)](#25-kisan-khata-kisan-diary)
  - [Super Admin](#26-super-admin)
  - [Schemes Data](#27-schemes-data)
  - [Party](#28-party)
  - [Purchase](#29-purchase)
  - [Reports](#30-reports)
  - [HSN (Tax Codes)](#31-hsn-tax-codes)

---

## Setup

```bash
# Install dependencies
npm install

# Set environment variables (create .env file)
PORT=5000
MONGO_URI=mongodb+srv://...
JWT_SECRET=your_jwt_secret
AWS_S3_BUCKET=your_bucket
AWS_REGION=your_region
AWS_ACCESS_KEY=your_key
AWS_SECRET_KEY=your_secret

# Start development server
npm run dev
```

---

## Authentication

All protected routes require a **Bearer Token** in the `Authorization` header:

```
Authorization: Bearer <JWT_TOKEN>
```

The JWT is returned on successful registration or sign-in. It contains `id`, `role`, and `tenantId`.

**Roles:** `Admin`, `Staff`, `Farmer`

---

## Testing Notes (Multi-Tenant)

> **IMPORTANT:** This is a multi-tenant system. Every query is scoped by `tenantId`.

**To properly test tenant isolation:**
1. Register an **Admin** (creates a new Tenant automatically).
2. Register a **Farmer** via the OTP endpoints using that tenant's `tenantCode`.
3. Register a **second Admin** (different tenant).
4. Verify that data created by Tenant A is **NOT visible** to Tenant B.

**Key testing checklist:**
- ✅ Create data as Tenant A → Confirm visible as Tenant A
- ✅ Switch to Tenant B → Confirm Tenant A's data is **NOT visible**
- ✅ Try accessing Tenant A's record ID from Tenant B → Should return `"Not found"`
- ✅ Try deleting Tenant A's record from Tenant B → Should return `"Not found"`

---

## API Endpoints

Base URL: `http://localhost:5000/api`

🔒 = Requires Auth Token | 👑 = Admin Only | 👔 = Admin/Staff | 🌾 = Farmer Only

---

### 1. OTP

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/otp/send-otp` | — | Send OTP (needs tenantCode for new Farmer) |
| `POST` | `/otp/verify-otp` | — | Verify OTP & Register |

**POST** `/otp/send-otp`
```json
{
  "mobile": "9876543210",
  "role": "Farmer",
  "tenantCode": "AGR9B2"
}
```

**POST** `/otp/verify-otp`
```json
{
  "mobile": "9876543210",
  "otp": "1234",
  "role": "Farmer",
  "tenantCode": "AGR9B2"
}
```

---

### 2. User (Auth & Profile)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/user/check-user` | — | Check if user exists by phone |
| `POST` | `/user/register-staff` | 🔒👑 | Register a Staff member |
| `POST` | `/user/signin` | — | Sign in (phone + password) |
| `PUT` | `/user/update-profile` | 🔒 | Update profile (multipart) |
| `DELETE` | `/user/delete-account` | 🔒 | Delete own account |
| `GET` | `/user/getUserDetails` | 🔒 | Get logged-in user details |
| `GET` | `/user/getAllUsers` | 🔒👔 | Get all users in tenant |
| `GET` | `/user/getAllFarmers` | 🔒👔 | Get all farmers in tenant |
| `GET` | `/user/files/private` | 🔒 | Get private files (signed URLs) |
| `GET` | `/user/logout` | 🔒 | Logout |

**POST** `/user/signin`
```json
{
  "phone": "9876543210",
  "password": "123456"
}
```

**PUT** `/user/update-profile` *(multipart/form-data)*
| Field | Type | Notes |
|-------|------|-------|
| `firstName` | text | Optional |
| `lastName` | text | Optional |
| `profileImage` | file | Max 1 |
| `soilHealthCard` | file | Max 1 (PDF/Img) |
| `labReport` | file | Max 1 (PDF/Img) |
| `govtSchemeDocs` | file | Max 3 (PDF/Img) |
| `seedLicense` | file | Max 1 |
| `fertilizerLicense` | file | Max 1 |
| `procurementLicense` | file | Max 1 |
| `GSTCertificate` | file | Max 1 |
| `CINCertificate` | file | Max 1 |
| `PANCard` | file | Max 1 |
| `InsecticidesLicense`| file | Max 1 |
| `CEODocuments` | file | Max 3 |
| `BODDocuments` | file | Max 3 |
| `FinancialDocuments` | file | Max 3 |

**GET** `/user/files/private?type=soilHealthCard&index=0`

---

### 3. Admin

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/admin/register` | — | Register Admin (creates tenant) |
| `POST` | `/admin/create-staff` | 🔒👑 | Create staff account |
| `POST` | `/admin/create-admin` | 🔒👑 | Create another admin |
| `POST` | `/admin/create-farmer`| 🔒👔 | Create farmer account |
| `GET` | `/admin/files/private` | 🔒👑 | Get admin private files |

**POST** `/admin/register`
*Registers a new Admin and creates a new Tenant/Business automatically. The `tenantCode` is generated using the first 3 letters of the `businessName` plus 3 random characters (e.g., AGR9B2).*
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "phone": "9876543210",
  "businessName": "Agro Solutions"
}
```

**POST** `/admin/create-staff`
*Allows an existing Admin to create a Staff account for their tenant.*
```json
{
  "firstName": "Staff",
  "lastName": "Member",
  "phone": "9876543211",
  "emailId": "staff@example.com",
  "joiningDate": "2026-05-01",
  "gender": "male",
  "village": "Deoria",
  "district": "Deoria",
  "state": "UP"
}
```

**POST** `/admin/create-admin`
*Allows an existing Admin to create another Admin account.*
```json
{
  "firstName": "Second",
  "lastName": "Admin",
  "phone": "9876543212",
  "emailId": "admin2@example.com",
  "shopName": "Agro Solutions Branch 2",
  "gstNumber": "22AAAAA0000A1Z5",
  "gender": "male",
  "village": "Deoria",
  "district": "Deoria",
  "state": "UP"
}
```

**POST** `/admin/create-farmer`
*Allows an Admin or Staff member to create a Farmer account for their tenant.*
```json
{
  "firstName": "Ramesh",
  "lastName": "Kumar",
  "phone": "9876543213",
  "gender": "male",
  "village": "Deoria",
  "district": "Deoria",
  "state": "UP",
  "farmerCategory": "small"
}
```

---

### 4. Product

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/product/addProduct` | 🔒👔 | Add product (multipart or base64) |
| `PATCH` | `/product/updateProduct/:id` | 🔒👔 | Update product (multipart or base64) |
| `GET` | `/product/getProducts` | 🔒 | Get all products |
| `GET` | `/product/getProductById/:id` | 🔒 | Get product by ID |
| `DELETE` | `/product/deleteProduct/:id` | 🔒👔 | Soft-delete product |
| `PATCH` | `/product/toggleProductStatus/:id` | 🔒👔 | Toggle active/inactive |
| `GET` | `/product/expiringProducts` | 🔒👔 | Expiry dashboard |

**POST** `/product/addProduct` *(multipart/form-data or JSON)*
| Field | Type | Notes |
|-------|------|-------|
| `productName` | text | Required |
| `brand` | text | Required |
| `productCategory` | text | Required |
| `description` | text | Optional |
| `products` | text (JSON) | Array of variants (see below) |
| `productImages` | file / text | Max 5 images (supports multipart uploads or base64 data URIs) |
| `productVideos` | file / text | Max 3 videos (supports multipart uploads or base64 data URIs) |
| `targetCrops` | text / JSON | Array of crop names |
| `productTechnicalDetails` | text | Optional |
| `howToUse` | text | Optional |
| `productBenefits` | text | Optional |
| `itemType` | text | Optional (`"PRODUCT"` or `"SERVICE"`, default `"PRODUCT"`) |
| `hsnCode` | text | Optional |
| `taxRate` | text | Optional |

**`products` (variants) JSON:**
```json
[
  {
    "mrp": 500,
    "quantity": 100,
    "unit": "ml",
    "parameter": "500",
    "purchaseDate": "2026-01-01",
    "expiryDate": "2027-01-01",
    "itemCode": "ITEM123",
    "purchasePrice": 400,
    "purchasePriceTaxType": "Without Tax",
    "salePrice": 480,
    "salePriceTaxType": "Without Tax",
    "discountOnSalePrice": 10,
    "discountType": "Percentage",
    "wholesalePrice": 450,
    "wholesalePriceTaxType": "Without Tax",
    "minWholesaleQty": 5,
    "openingStockPrice": 400,
    "asOfDate": "2026-01-01",
    "minStockToMaintain": 10,
    "location": "Aisle 3"
  }
]
```

---

### 5. Inventory

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/inventory/get-all-items` | — | Get all inventory items |
| `GET` | `/inventory/stocks` | 🔒 | Get all stock levels |
| `GET` | `/inventory/stock/:itemId` | 🔒 | Get stock for specific item |

---

### 6. Cart

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/cart/add` | 🔒 | Add item to cart |
| `GET` | `/cart/get-cart` | 🔒 | Get my cart |
| `PUT` | `/cart/update` | 🔒 | Update cart item quantity |
| `DELETE` | `/cart/remove/:itemId` | 🔒 | Remove item from cart |
| `DELETE` | `/cart/remove-all` | 🔒 | Clear entire cart |

**POST** `/cart/add`
```json
{
  "itemId": "INVENTORY_ITEM_ID",
  "quantity": 2,
  "expectedPrice": 450
}
```

**PUT** `/cart/update`
```json
{
  "itemId": "CART_ITEM_ID",
  "quantity": 5
}
```

---

### 7. Order

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/order/place` | 🔒🌾 | Place order from cart |
| `GET` | `/order/allOrders` | 🔒👔 | Get all orders |
| `PUT` | `/order/updateOrderStatus/:id` | 🔒👑 | Approve/Reject/Sell order |
| `GET` | `/order/myOrders` | 🔒🌾 | Get farmer's own orders |
| `PATCH` | `/order/:id/update-prices` | 🔒👑 | Update item prices |
| `POST` | `/order/generateReceipt/:id` | 🔒👔 | Generate receipt |
| `GET` | `/order/receipt/:id` | 🔒 | Get receipt details |
| `GET` | `/order/downloadReceipt/:id` | 🔒 | Download receipt PDF |
| `GET` | `/order/allReceipts` | 🔒👔 | Get all receipts |

**POST** `/order/place`
```json
{
  "paymentMethod": "CASH"
}
```

**PUT** `/order/updateOrderStatus/:id`
```json
{
  "status": "APPROVED",
  "sell": true,
  "creditDays": 30
}
```

**PATCH** `/order/:id/update-prices`
```json
{
  "items": [
    { "itemId": "ITEM_OBJECT_ID", "finalPrice": 400 }
  ]
}
```

---

### 8. Sell (Counter Sales)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/sell/sell-items` | 🔒👔 | Sell items directly (creates SALE or ESTIMATE) |
| `POST` | `/sell/` | 🔒👔 | Alias for direct sale |
| `GET` | `/sell/` | 🔒👔 | Get all sell records (paginated, filterable) |
| `GET` | `/sell/:id` | 🔒👔 | Get sell record by ID |
| `PATCH` | `/sell/:id` | 🔒👔 | Update a sell record (adjusts stock dynamically) |
| `DELETE` | `/sell/:id` | 🔒👔 | Delete a sell record (reverts stock/ledger) |
| `POST` | `/sell/convert-to-sale/:id` | 🔒👔 | Convert an Estimate to a final Sale |
| `GET` | `/sell/receipt/:id` | 🔒👔 | Download sale receipt/invoice PDF |
| `POST` | `/sell/payment-in` | 🔒👔 | Record a customer payment-in receipt (also auto-created on Credit sales) |
| `GET` | `/sell/payment-in` | 🔒👔 | Get all payment-in receipts |
| `GET` | `/sell/payment-in/:id` | 🔒👔 | Get specific payment-in receipt details |
| `PATCH` | `/sell/payment-in/:id` | 🔒👔 | Update a payment-in receipt (reconciles linked sell bill amounts) |
| `DELETE` | `/sell/payment-in/:id` | 🔒👔 | Delete a payment-in receipt (reverts linked sell bill amounts) |
| `POST` | `/sell/sell-return` | 🔒👔 | Create a sell return (Credit Note) |
| `GET` | `/sell/sell-return` | 🔒👔 | Get all sell return listings |
| `GET` | `/sell/sell-return/:id` | 🔒👔 | Get details of a sell return |
| `PATCH` | `/sell/sell-return/:id` | 🔒👔 | Update a sell return |
| `DELETE` | `/sell/sell-return/:id` | 🔒👔 | Delete a sell return and cancel credit |

**POST** `/sell/sell-items` (or `/sell/`)
```json
{
  "saleType": "SALE",
  "billingType": "Credit",
  "party": "PARTY_ID_STRING",
  "buyerName": "Ramesh Kumar",
  "buyerPhone": "9876543210",
  "buyerAddress": "Village Deoria",
  "buyerType": "FARMER",
  "items": [
    {
      "item": "INVENTORY_ITEM_ID",
      "quantity": 2,
      "unit": "kg",
      "pricePerUnit": 450,
      "rate": 450,
      "taxType": "Without Tax",
      "discountPercent": 10,
      "discountAmount": 100,
      "taxPercent": 5,
      "taxAmount": 40,
      "amount": 840
    }
  ],
  "subTotal": 900,
  "totalAmount": 840,
  "remarks": "Credit sale with discount and tax"
}
```

**GET** `/sell/` *(Query Filters)*
`?page=1&limit=10&saleType=SALE&billingType=Credit&party=PARTY_ID&startDate=2026-06-01&endDate=2026-06-30&search=Ramesh`

**POST** `/sell/payment-in`
```json
{
  "party": "PARTY_ID_STRING",
  "sell": "SELL_ID_STRING",
  "payments": [
    { "paymentType": "UPI", "amount": 500, "referenceNo": "REF12345" },
    { "paymentType": "Cash", "amount": 400 }
  ],
  "receivedAmount": 900,
  "description": "Part payment received"
}
```

> [!NOTE]
> The `sell` field is optional — it links this payment to a specific Sell bill and automatically updates that bill's `receivedAmount` / `pendingAmount`. When `sell` is provided, updating or deleting the payment-in receipt will reconcile the sell bill's amounts via a delta calculation.

**GET** `/sell/payment-in` *(Query Filters)*
`?page=1&limit=10&party=PARTY_ID&startDate=2026-06-01&endDate=2026-06-30&search=RCPT-2026`

**POST** `/sell/sell-return`
```json
{
  "sale": "SALE_ID_STRING",
  "party": "PARTY_ID_STRING",
  "items": [
    {
      "item": "INVENTORY_ITEM_ID",
      "quantity": 1,
      "unit": "kg",
      "pricePerUnit": 450,
      "rate": 450,
      "taxType": "Without Tax",
      "discountPercent": 10,
      "discountAmount": 50,
      "taxPercent": 5,
      "taxAmount": 20,
      "amount": 420
    }
  ],
  "subTotal": 450,
  "totalAmount": 420,
  "description": "Item returned due to minor damage"
}
```

**GET** `/sell/sell-return` *(Query Filters)*
`?page=1&limit=10&party=PARTY_ID&sale=SALE_ID&startDate=2026-06-01&endDate=2026-06-30&search=RET-2026`

---

### 9. Procurement

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/procurement/addPurchase` | 🔒👔 | Record crop procurement |
| `PUT` | `/procurement/updatePurchase/:id` | 🔒👔 | Update procurement |
| `DELETE` | `/procurement/deletePurchase/:id` | 🔒👔 | Delete procurement |
| `GET` | `/procurement/getPurchases` | 🔒👔 | Get all procurements |
| `GET` | `/procurement/getPurchaseById/:id` | 🔒👔 | Get procurement by ID |
| `GET` | `/procurement/receipt/:id` | 🔒👔 | Download procurement PDF |

**POST** `/procurement/addPurchase`
```json
{
  "farmer": "FARMER_USER_ID",
  "crops": [
    { "cropName": "Wheat", "variety": "HD-2967", "rate": 2200, "quantity": 50 }
  ],
  "procurementDate": "2026-04-20",
  "procurementCenter": "Deoria Center",
  "previousDues": 5000,
  "godown": "Godown A",
  "vehicle": "UP53-1234",
  "remarks": "Good quality"
}
```

**GET** `/procurement/getPurchases?page=1&limit=10&farmer=FARMER_ID`

---

### 10. Payment

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/payment/farmer-payment` | 🔒👑 | Record farmer → admin payment |
| `POST` | `/payment/admin-payment` | 🔒👑 | Record admin → farmer payment |
| `GET` | `/payment/balance` | 🔒 | Get farmer balance |

**POST** `/payment/farmer-payment`
```json
{
  "farmerId": "FARMER_USER_ID",
  "amount": 5000,
  "paymentMethod": "CASH"
}
```

**GET** `/payment/balance?farmerId=FARMER_USER_ID`

---

### 11. Ledger

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/ledger/:id` | 🔒👔 | Get ledger for a user |
| `GET` | `/ledger/` | 🔒👔 | Get all ledger entries |
| `GET` | `/ledger/reference/:type` | 🔒👔 | Get ledger by type |

**Types:** `PROCUREMENT`, `PROCUREMENT_PAYMENT`, `SALE`, `PAYMENT`, `REFUND`, `ADJUSTMENT`

---

### 12. Farm

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/farm/addFarm` | — | Add farm (with GeoJSON) |
| `GET` | `/farm/getFarmsByUserId/:userId` | — | Get farms by user |
| `GET` | `/farm/getFarmByFarmId/:id` | — | Get farm by ID |
| `PUT` | `/farm/updateFarmById/:id` | — | Update farm |
| `DELETE` | `/farm/deleteFarmById/:id` | — | Delete farm |
| `GET` | `/farm/getAllFarms` | 🔒👔 | Get all farms in tenant |

**POST** `/farm/addFarm`
```json
{
  "userId": "USER_ID",
  "farmName": "Ramesh Farm",
  "farmArea": "5",
  "unit": "acre",
  "geojson": {
    "type": "Feature",
    "geometry": {
      "type": "Polygon",
      "coordinates": [[[83.78, 26.76], [83.79, 26.76], [83.79, 26.77], [83.78, 26.77], [83.78, 26.76]]]
    }
  },
  "tenantId": "TENANT_ID"
}
```

---

### 13. Crop (User Crops)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/crop/addCrop` | 🔒🌾 | Add crop to farm |
| `PUT` | `/crop/updateCrop/:id` | 🔒🌾 | Update crop |
| `DELETE` | `/crop/deleteCrop/:id` | 🔒🌾 | Delete crop |
| `GET` | `/crop/getCropsByUser` | 🔒 | Get user's crops |
| `GET` | `/crop/:userCropId/calendar` | — | Get crop-specific calendar |

**POST** `/crop/addCrop`
```json
{
  "farmId": "FARM_ID",
  "cropName": "Wheat",
  "variety": "HD-2967",
  "area": 2.5,
  "unit": "acre",
  "sowingDate": "2026-01-15"
}
```

---

### 14. Crop Calendar

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/crop-calendar/` | — | Get all stored crop calendars |
| `GET` | `/crop-calendar/:cropName` | — | Get calendar for crop (DB → AI fallback) |
| `GET` | `/crop-calendar/:cropName?variety=HD-2967` | — | Get specific variety calendar |
| `DELETE` | `/crop-calendar/:cropName` | — | Delete calendar (force regenerate) |

---

### 15. Crop Doctor (AI)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/crop-doctor/analyze` | 🔒 | **AI Analysis:** Upload image to get Gemini diagnosis |
| `POST` | `/crop-doctor/saveReport` | 🔒 | Save diagnosis image + result to history |
| `GET` | `/crop-doctor/getUserReports/:userId` | — | Get user's diagnosis history |
| `GET` | `/crop-doctor/getReportById/:reportId` | — | Get specific report |
| `DELETE` | `/crop-doctor/deleteReport/:reportId` | — | Delete report |

**POST** `/crop-doctor/analyze` *(multipart/form-data)*
| Field | Type | Notes |
|-------|------|-------|
| `diagnosisImage` | file | Required (Max 1 image) |
| `lang` | query | Optional (e.g., `hi`, `mr`, `te`). Default: `en` |

**POST** `/crop-doctor/saveReport` *(multipart/form-data)*
| Field | Type | Notes |
|-------|------|-------|
| `diagnosisImage` | file | Max 1 image |
| `diagnosis` | text | The AI diagnosis text to save |

---

### 16. Sell Crops (Farmer Marketplace)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/sell-crop/add` | 🔒 | List crop for sale (multipart) |
| `PUT` | `/sell-crop/update/:id` | 🔒 | Update listing |
| `DELETE` | `/sell-crop/delete/:id` | 🔒 | Delete listing |
| `GET` | `/sell-crop/getListings` | — | Get all listings |
| `GET` | `/sell-crop/getListingsByUser` | 🔒 | Get user's listings |
| `GET` | `/sell-crop/getCropByCropId/:id` | — | Get listing by ID |
| `GET` | `/sell-crop/receipt/:id` | 🔒 | Download receipt PDF |

**POST** `/sell-crop/add` *(multipart/form-data)*
| Field | Type | Notes |
|-------|------|-------|
| `cropName` | text | Required |
| `variety` | text | Required |
| `quantity` | text | Required |
| `price` | text | Required |
| `location` | text (JSON) | `{"type":"Point","coordinates":[83.78,26.76]}` |
| `harvestDate` | text | Date string |
| `cropImages` | file | Max 5 images |

---

### 17. Community (Posts)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/posts/createPost` | 🔒 | Create post (with image) |
| `POST` | `/posts/likePost` | — | Like/unlike a post |
| `POST` | `/posts/dislikePost` | — | Dislike/un-dislike a post |
| `POST` | `/posts/commentPost` | — | Comment on a post |
| `POST` | `/posts/sharePost` | — | Share a post |
| `GET` | `/posts/getPostsByUserId/:userId` | — | Get user's posts |
| `GET` | `/posts/getAllPosts` | — | Get all posts (with engagement) |
| `PUT` | `/posts/updatePost/:id` | 🔒 | Update post |
| `DELETE` | `/posts/deletePost/:postId` | 🔒 | Delete post |

**POST** `/posts/createPost` *(multipart/form-data)*
| Field | Type | Notes |
|-------|------|-------|
| `caption` | text | Optional |
| `postImage` | file | Max 1 image |

**POST** `/posts/likePost`
```json
{
  "userId": "USER_ID",
  "postId": "POST_ID"
}
```

**POST** `/posts/commentPost`
```json
{
  "userId": "USER_ID",
  "postId": "POST_ID",
  "comment": "Great post!"
}
```

---

### 18. Broadcast (Notifications)

> All routes require authentication (`protect` middleware applied globally).

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/broadcast/send` | 🔒👑 | Send broadcast notification |
| `GET` | `/broadcast/stats` | 🔒👑 | Get broadcast statistics |
| `GET` | `/broadcast/history` | 🔒👑 | Get history (paginated) |
| `GET` | `/broadcast/admin/:id` | 🔒👑 | Get broadcast details (admin) |
| `GET` | `/broadcast/` | 🔒 | Get all broadcasts |
| `GET` | `/broadcast/:id` | 🔒 | Get broadcast details (public) |

**POST** `/broadcast/send` *(multipart/form-data)*
| Field | Type | Notes |
|-------|------|-------|
| `title` | text | Required |
| `description` | text | Required |
| `targetRole` | text | `"Farmer"` or `"Staff"` |
| `broadcastImage` | file | Max 1 image (optional) |

**GET** `/broadcast/history?page=1&limit=10&targetRole=Farmer`

---

### 19. Advertisement Posters

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/advertisement-posters/upload-poster` | 🔒👑 | Upload posters |
| `GET` | `/advertisement-posters/` | — | Get all posters |
| `DELETE` | `/advertisement-posters/:id/delete` | 🔒👑 | Delete poster |

**POST** `/advertisement-posters/upload-poster` *(multipart/form-data)*
| Field | Type | Notes |
|-------|------|-------|
| `posterImages` | file | Max 5 images |

---

### 20. Marketplace

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/marketplace/items` | — | Get all available items |

Returns aggregated inventory with product details, images, and pricing.

---

### 21. Chat (AI Chatbot)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/chat/chatBot` | — | Send message to AI chatbot |
| `GET` | `/chat/chatHistory/:user_id` | — | Get chat history |

**POST** `/chat/chatBot`
```json
{
  "user_id": "USER_ID",
  "query": "How to increase wheat yield?",
  "language": "English"
}
```

**GET** `/chat/chatHistory/:user_id?limit=20&skip=0`

---

### 22. FCM (Push Tokens)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/fcm/save-token` | 🔒 | Save FCM push notification token |

**POST** `/fcm/save-token`
```json
{
  "token": "FCM_DEVICE_TOKEN_STRING"
}
```

---

### 23. Mandi Price

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/mandi/prices` | — | Get prices by filters |
| `GET` | `/mandi/my-location` | — | Get prices for user's location |
| `GET` | `/mandi/all-pages` | — | Get all prices (paginated) |

**GET** `/mandi/prices?state=UP&district=Deoria&commodity=Wheat`

**GET** `/mandi/my-location?lat=26.76&lng=83.78`

---

### 24. Tenant (Configuration)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/tenant/config/:tenantCode` | — | Get tenant theme config (public) |
| `PUT` | `/tenant/config` | 🔒👑 | Update tenant theme (Admin only) |
| `PATCH` | `/tenant/bank-details` | 🔒👑 | Update FPO bank details (Admin only) |
| `GET` | `/tenant/bank-details` | 🔒 | Get FPO bank details |

**GET** `/tenant/config/KrishiGyan-A1B2C3`

**PATCH** `/tenant/bank-details`
```json
{
  "bankName": "HDFC BANK, MARATHALLI, BANGLORE",
  "accountNumber": "12345678954",
  "ifscCode": "HDFC0002565",
  "accountHolderName": "Aniket",
  "upiId": "aniket@upi"
}
```

**PUT** `/tenant/config` *(multipart/form-data or JSON)*
| Field | Type | Notes |
|-------|------|-------|
| `primaryColor` | text | Hex color code (e.g., `#4CAF50`) |
| `secondaryColor` | text | Hex color code |
| `logoImage` | file / text | S3 File upload or Base64 string |
| `appName` | text | E.g., `KrishiGyan AI` |
| `fontFamily` | text | CSS font-family string |

---

### 25. Kisan Khata (Kisan Diary)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/khata/summary` | 🔒 | Get khata summary |
| `POST` | `/khata/income/add` | 🔒 | Add income entry |
| `GET` | `/khata/income` | 🔒 | Get income entries |
| `PUT` | `/khata/income/:id` | 🔒 | Update income entry |
| `DELETE` | `/khata/income/:id` | 🔒 | Delete income entry |
| `POST` | `/khata/expense/add` | 🔒 | Add expense entry |
| `GET` | `/khata/expense` | 🔒 | Get expense entries |
| `PUT` | `/khata/expense/:id` | 🔒 | Update expense entry |
| `DELETE` | `/khata/expense/:id` | 🔒 | Delete expense entry |
| `GET` | `/khata/ledger` | 🔒 | Get ledger details (filtered) |
| `GET` | `/khata/ledger/pdf` | 🔒 | Export ledger as PDF |

---

### 26. Super Admin

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/superadmin/dashboard-stats` | 🔒👑 | Get overall dashboard statistics |
| `GET` | `/superadmin/tenants` | 🔒👑 | Get list of all tenants |

---

### 27. Schemes Data

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/schemes/` | — | Get all agricultural schemes data |

---

### 28. Party

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/party/addParty` | 🔒 | Create a new party |
| `PATCH` | `/party/updateParty/:id` | 🔒 | Update an existing party |
| `GET` | `/party/getAllParties` | 🔒 | Get all parties matching query |
| `GET` | `/party/:id` | 🔒 | Get a single party by ID |
| `DELETE` | `/party/:id` | 🔒 | Soft-delete a party |

**POST** `/party/addParty`
```json
{
  "name": "Mahadev Traders",
  "phoneNumber": "9876543210",
  "gstin": "22AAAAA0000A1Z5",
  "gstType": "Registered-Regular",
  "state": "Uttar Pradesh",
  "email": "mahadevtraders@example.com",
  "billingAddress": "Main Road, Deoria",
  "shippingAddress": "Main Road, Deoria",
  "openingBalance": 15000,
  "openingBalanceType": "CREDIT"
}
```

**GET** `/party/getAllParties` *(Query Filters)*
`?search=Mahadev&gstType=Registered-Regular`

---

### 29. Purchase

#### Bills and Purchase Orders

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/purchase/add` | 🔒 | Create purchase (BILL or ORDER) (Supports file upload under `image`) |
| `GET` | `/purchase/list` | 🔒 | Get all purchases (paginated, filterable) |
| `GET` | `/purchase/:id` | 🔒 | Get a purchase by ID |
| `PATCH` | `/purchase/update/:id` | 🔒 | Update an existing purchase (Supports file upload under `image`) |
| `DELETE` | `/purchase/delete/:id` | 🔒 | Delete a purchase |
| `POST` | `/purchase/convert-to-purchase/:id` | 🔒 | Convert a Purchase Order to a final Purchase Bill |

**POST** `/purchase/add` *(Supports JSON or multipart/form-data)*
```json
{
  "purchaseType": "BILL",
  "billNumber": "PUR-2026-001",
  "billingType": "Credit",
  "paymentType": "UPI",
  "referenceNo": "TXN123456",
  "paidAmount": 2000,
  "unpaidAmount": 2484,
  "party": "PARTY_ID_STRING",
  "billDate": "2026-06-15",
  "dueDate": "2026-07-15",
  "stateOfSupply": "Uttar Pradesh",
  "items": [
    {
      "item": "INVENTORY_ITEM_ID",
      "quantity": 10,
      "unit": "bag",
      "pricePerUnit": 400,
      "taxType": "Without Tax",
      "discountPercent": 5,
      "discountAmount": 200,
      "taxPercent": 18,
      "taxAmount": 684,
      "amount": 4484
    }
  ],
  "subTotal": 4000,
  "totalAmount": 4484,
  "remarks": "Urgent procurement"
}
```

> [!NOTE]
> - **File Upload**: Both `/purchase/add` and `/purchase/update/:id` support file uploads (images or PDFs) under the form-data field name `image`. Uploads are secured and stored in the private `purchase-bills` directory on S3.
> - **Payment Resolution**:
>   - `paidAmount` and `unpaidAmount` track the transaction settlement status. For cash bills, they default to `totalAmount` and `0`. For credit bills, they default to `0` and `totalAmount` unless specific values are passed.
>   - `paymentType` enum supports `["Cash", "UPI", "Cheque", "Bank Transfer", "Card"]`.

> [!IMPORTANT]
> **Atomic Payment Out Creation** — When a Purchase Bill/Order is saved with `paidAmount > 0`, the backend **automatically creates a matching Payment Out receipt** in the same MongoDB transaction. This means:
> - A single API call to `/purchase/add` creates both the `PurchaseBill` and the linked `PaymentOut` atomically.
> - If anything fails, **neither record is saved** — no partial data.
> - The auto-generated `PaymentOut` carries `linkedBill` (pointing to the source bill) and `isAutoGenerated: true` for traceability.
> - Manual "Pay Dues" payments created via `/purchase/payment-out` carry `isAutoGenerated: false` and are independently tracked.
> - On **update**, the linked `PaymentOut` is automatically adjusted to reflect the new `paidAmount` (created, updated, or deleted as needed). For manual payments, the linked bill's `paidAmount`/`unpaidAmount` is reconciled via a delta calculation.
> - On **delete** of the bill, the auto-linked `PaymentOut` and its ledger entry are cascade-deleted. Deleting a manual `PaymentOut` reverts the linked bill's outstanding amounts.
> - On **convert-to-purchase** (Order → Bill), if the order had a `paidAmount > 0`, a `PaymentOut` is auto-created as well.

**GET** `/purchase/list` *(Query Filters)*
`?page=1&limit=10&purchaseType=BILL&billingType=Credit&party=PARTY_ID&startDate=2026-06-01&endDate=2026-06-30&search=PUR-2026`

#### Payments Out

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/purchase/payment-out` | 🔒 | Record a standalone vendor payment-out receipt |
| `GET` | `/purchase/payment-out/list` | 🔒 | Get all payment-out receipts (manual + auto-generated) |
| `GET` | `/purchase/payment-out/:id` | 🔒 | Get specific payment-out receipt details |
| `PATCH` | `/purchase/payment-out/update/:id` | 🔒 | Update a payment-out receipt |
| `DELETE` | `/purchase/payment-out/delete/:id` | 🔒 | Delete a payment-out receipt |

> [!NOTE]
> - All payment-out receipts expose a `linkedBill` field (populated with bill details) and an `isAutoGenerated` boolean in GET responses.
> - Auto-generated receipts (`isAutoGenerated: true`) are managed by the Purchase lifecycle and should not be manually edited to avoid inconsistency.
> - Manually-created receipts (`isAutoGenerated: false`) are fully editable; updating `paidAmount` automatically reconciles the linked bill's outstanding balance.

**POST** `/purchase/payment-out` *(for standalone "Pay Dues" payments linked to a specific bill)*
```json
{
  "party": "PARTY_ID_STRING",
  "purchase": "PURCHASE_BILL_ID_STRING",
  "receiptNo": "PAYOUT-2026-001",
  "date": "2026-06-15",
  "payments": [
    { "paymentType": "UPI", "amount": 3000, "referenceNo": "TXN123456" }
  ],
  "paidAmount": 3000,
  "description": "Part payment for outstanding dues"
}
```

> [!NOTE]
> The `purchase` field is optional. When provided, the referenced bill's `paidAmount` and `unpaidAmount` are updated atomically in the same transaction.

**GET** `/purchase/payment-out/list` *(Query Filters)*
`?page=1&limit=10&party=PARTY_ID&startDate=2026-06-01&endDate=2026-06-30&search=PAYOUT-2026`

**PATCH** `/purchase/payment-out/update/:id`
```json
{
  "party": "PARTY_ID_STRING",
  "purchase": "PURCHASE_BILL_ID_STRING",
  "receiptNo": "PAYOUT-2026-001",
  "date": "2026-06-15",
  "payments": [
    { "paymentType": "UPI", "amount": 2000, "referenceNo": "TXN123456-UPDATED" }
  ],
  "paidAmount": 2000,
  "description": "Updated part payment details"
}
```

> [!NOTE]
> When `paidAmount` is changed, the linked bill's `paidAmount` / `unpaidAmount` is automatically adjusted by the **delta** (new − old). For example, changing from ₹3,000 → ₹2,000 adds ₹1,000 back to the bill's `unpaidAmount`.

#### Purchase Returns (Debit Notes)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/purchase/return` | 🔒 | Create a purchase return (Debit Note) |
| `GET` | `/purchase/return/list` | 🔒 | Get all purchase returns |
| `DELETE` | `/purchase/return/delete/:id` | 🔒 | Delete a purchase return |

**POST** `/purchase/return`
```json
{
  "purchase": "PURCHASE_ID_STRING",
  "party": "PARTY_ID_STRING",
  "returnNo": "RET-2026-001",
  "returnDate": "2026-06-15",
  "items": [
    {
      "item": "INVENTORY_ITEM_ID",
      "quantity": 1,
      "unit": "bag",
      "pricePerUnit": 400,
      "taxType": "Without Tax",
      "discountPercent": 5,
      "discountAmount": 20,
      "taxPercent": 18,
      "taxAmount": 68.4,
      "amount": 448.4
    }
  ],
  "subTotal": 400,
  "totalAmount": 448.4,
  "description": "Damaged items returned"
}
```

**GET** `/purchase/return/list` *(Query Filters)*
`?page=1&limit=10&party=PARTY_ID&startDate=2026-06-01&endDate=2026-06-30&search=RET-2026`

#### Expenses

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/purchase/expense` | 🔒 | Add expense entry (supports GST) |
| `GET` | `/purchase/expense/list` | 🔒 | Get all expenses |
| `DELETE` | `/purchase/expense/delete/:id` | 🔒 | Delete an expense entry |

**POST** `/purchase/expense`
```json
{
  "gstEnabled": true,
  "party": "PARTY_ID_STRING",
  "expenseCategory": "Office Supplies",
  "expenseNo": "EXP-2026-001",
  "billDate": "2026-06-15",
  "stateOfSupply": "Uttar Pradesh",
  "items": [
    {
      "itemName": "Stationery",
      "quantity": 2,
      "pricePerUnit": 500,
      "discountPercent": 0,
      "taxPercent": 18,
      "amount": 1180
    }
  ],
  "subTotal": 1000,
  "totalAmount": 1180,
  "paymentType": "Cash",
  "description": "Bought printing paper"
}
```

**GET** `/purchase/expense/list` *(Query Filters)*
`?page=1&limit=10&party=PARTY_ID&category=Office%20Supplies&startDate=2026-06-01&endDate=2026-06-30&search=EXP-2026`

---

### 30. Reports

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/reports/sell/pdf` | 🔒👔 | Download Sales Report PDF (filtered) |
| `GET` | `/reports/purchase/pdf` | 🔒👔 | Download Purchase Report PDF (filtered) |
| `GET` | `/reports/balance-sheet` | 🔒👔 | Get Balance Sheet Statement (JSON or PDF) |

**GET** `/reports/sell/pdf` *(Query Filters)*
`?saleType=SALE&billingType=Credit&startDate=2026-06-01&endDate=2026-06-30&search=Ramesh`

**GET** `/reports/purchase/pdf` *(Query Filters)*
`?purchaseType=BILL&billingType=Credit&startDate=2026-06-01&endDate=2026-06-30&search=PUR-2026`

**GET** `/reports/balance-sheet` *(Query Filters)*
`?date=2026-06-18&format=json` (default format is json, can specify format=pdf to stream PDF file)

---

### 31. HSN (Tax Codes)

Read-only lookup API for Indian **Harmonised System of Nomenclature (HSN)** codes. Used to attach correct GST rates to products and purchase/sell items. All routes require authentication.

| Method | Endpoint | Auth | Description |
|--------|----------|------|--------------|
| `GET` | `/hsn/list` | 🔒 | Search & list HSN codes (paginated) |
| `GET` | `/hsn/gst-rates` | 🔒 | Get all distinct GST rate slabs |
| `GET` | `/hsn/code/:code` | 🔒 | Get a single HSN entry by code |
| `GET` | `/hsn/children/:parentCode` | 🔒 | Get all child codes under a parent |

**GET** `/hsn/list` *(Query Filters)*
`?search=rice&gstRate=5&level=2&page=1&limit=20`

| Query Param | Type | Description |
|-------------|------|-------------|
| `search` | string | Numeric prefix (code match) or text (description full-text search) |
| `gstRate` | number | Filter by GST rate slab (e.g. `0`, `5`, `12`, `18`, `28`) |
| `level` | number | Filter by hierarchy level (`1` = chapter, `2` = heading, `4` = subheading, etc.) |
| `page` | number | Page number (default `1`) |
| `limit` | number | Results per page (default `20`) |

**Sample Response** (list item):
```json
{
  "code": "1006",
  "description": "Rice",
  "level": 2,
  "parentCode": "10",
  "gstRate": 5,
  "cgst": 2.5,
  "sgst": 2.5,
  "igst": 5
}
```

**GET** `/hsn/gst-rates`
Returns all distinct GST rate slabs present in the database, sorted ascending.
```json
{ "success": true, "data": [0, 5, 12, 18, 28] }
```

**GET** `/hsn/code/1006`
Fetch the full record for a specific HSN code. Returns `404` if not found.

**GET** `/hsn/children/10`
Returns all direct children of chapter/heading `10` (e.g., all headings under cereals).

> [!NOTE]
> - HSN data is **tenant-independent** — the same master dataset is shared across all tenants.
> - Numeric `search` values perform a **prefix match** on the code (e.g., `search=01` returns all codes starting with `01`).
> - Non-numeric `search` values trigger a **full-text search** on the description field.

---

## Architecture

```
modules/
├── admin/             # Admin registration & management
├── advertisement/     # Ad poster management
├── broadcast/         # Push notification broadcasting
├── cart/              # Shopping cart
├── chat/              # AI chatbot proxy
├── common/            # Shared models (Receipt, Counter)
├── community/         # Social posts, likes, comments
├── crop/              # User crop management
├── cropCalendar/      # AI-generated crop calendars
├── cropDoctor/        # AI crop disease diagnosis
├── farm/              # Farm GeoJSON mapping
├── fcm/               # Firebase Cloud Messaging tokens
├── fileUpload/        # S3 upload schema
├── hsn/               # HSN/SAC tax code master (read-only lookup)
├── inventory/         # Inventory items & stock tracking
├── kisanDiary/        # Kisan Khata income/expense tracking
├── ledger/            # Financial ledger (debit/credit)
├── mandiPrice/        # Government mandi price data
├── marketplace/       # Aggregated product marketplace
├── order/             # Order lifecycle & receipts
├── otp/               # Phone OTP verification
├── party/             # Party / Vendor / Customer management
├── payment/           # Payment recording
├── procurement/       # Crop procurement from farmers
├── product/           # Product catalog & variants
├── purchase/          # Bills, Purchase Orders, Returns, and Expenses
├── report/            # Reports (WIP)
├── schemesData/       # Agricultural schemes data
├── sell/              # Counter/direct sales
├── sellCrops/         # Farmer crop listings
├── superadmin/        # Cross-tenant analytics and management
├── tenant/            # Tenant model & theme config
└── user/              # User auth, profile, roles
```

**Each module follows:**
```
module/
├── module.model.js       # Mongoose schema
├── module.service.js     # Business logic (tenant-scoped)
├── module.controller.js  # Request/Response handler
└── module.route.js       # Express routes
```

---

## Error Response Format

All errors follow this format:
```json
{
  "success": false,
  "message": "Error description here"
}
```

## Success Response Format

```json
{
  "success": true,
  "message": "Operation description",
  "data": { }
}
```