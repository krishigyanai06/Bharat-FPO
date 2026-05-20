import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import productsReducer from './slices/productsSlice';
import procurementReducer from './slices/procurementSlice';
import purchasesReducer from './slices/purchasesSlice';
import documentsReducer from './slices/documentsSlice';
import inventoryReducer from './slices/inventorySlice';
import membersReducer from './slices/membersSlice';
import reportsReducer from './slices/reportsSlice';
import dashboardReducer from './slices/dashboardSlice';
import layoutReducer from './slices/layoutSlice';
import settingsReducer from './slices/settingsSlice';
import registerReducer from "./slices/registerSlice";
import couponsReducer from './slices/couponsSlice';
import broadcastReducer from './slices/broadcastSlice';
import farmReducer from './slices/farmSlice';
import ledgerReducer from './slices/ledgerSlice';
import advertisementReducer from './slices/advertisementSlice';
import orderReducer from './slices/orderSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    products: productsReducer,
    procurement: procurementReducer,
    purchases: purchasesReducer,
    documents: documentsReducer,
      inventory: inventoryReducer,
    members: membersReducer,
    reports: reportsReducer,
    dashboard: dashboardReducer,
      layout: layoutReducer,
    settings: settingsReducer,
     register: registerReducer,
    coupons: couponsReducer,
    broadcast: broadcastReducer,
    farm: farmReducer,
    ledger: ledgerReducer,
    advertisement: advertisementReducer,
    orders: orderReducer,
  },
});
