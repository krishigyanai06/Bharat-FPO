import api from '../lib/api';

const purchaseService = {
  // GET /purchase/total — Fetch aggregate metrics across purchase transactions
  getPurchaseTotal: async (params = {}, config = {}) => {
    const res = await api.get('/purchase/total', { params, ...config });
    return res.data;
  },

  // GET /purchase/list — Fetch paginated purchases
  getPurchases: async (params = {}, config = {}) => {
    const res = await api.get('/purchase/list', { params, ...config });
    return res.data;
  },

  // GET /purchase/:id — Fetch single purchase details
  getPurchaseById: async (id) => {
    const res = await api.get(`/purchase/${id}`);
    return res.data;
  },

  // POST /purchase/add — Create purchase bill or order
  createPurchase: async (payload) => {
    const res = await api.post('/purchase/add', payload);
    return res.data;
  },

  // PATCH /purchase/update/:id — Update purchase bill or order
  updatePurchase: async (id, payload) => {
    const res = await api.patch(`/purchase/update/${id}`, payload);
    return res.data;
  },

  // DELETE /purchase/delete/:id — Delete purchase
  deletePurchase: async (id) => {
    const res = await api.delete(`/purchase/delete/${id}`);
    return res.data;
  },

  // GET /purchase/payment-out/list — Fetch payments out
  getPaymentsOut: async (params = {}, config = {}) => {
    const res = await api.get('/purchase/payment-out/list', { params, ...config });
    return res.data;
  },

  // POST /purchase/payment-out — Record customer payment out
  createPaymentOut: async (payload) => {
    const res = await api.post('/purchase/payment-out', payload);
    return res.data;
  },

  // PATCH /purchase/payment-out/:id — Update payment out
  updatePaymentOut: async (id, payload) => {
    const res = await api.patch(`/purchase/payment-out/${id}`, payload);
    return res.data;
  },

  // DELETE /purchase/payment-out/:id — Delete payment out
  deletePaymentOut: async (id) => {
    const res = await api.delete(`/purchase/payment-out/${id}`);
    return res.data;
  },

  // GET /purchase/purchase-return/list — Fetch purchase returns / debit notes
  getPurchaseReturns: async (params = {}, config = {}) => {
    const res = await api.get('/purchase/purchase-return/list', { params, ...config });
    return res.data;
  },

  // POST /purchase/purchase-return — Record purchase return
  createPurchaseReturn: async (payload) => {
    const res = await api.post('/purchase/purchase-return', payload);
    return res.data;
  },

  // DELETE /purchase/purchase-return/:id — Delete purchase return
  deletePurchaseReturn: async (id) => {
    const res = await api.delete(`/purchase/purchase-return/${id}`);
    return res.data;
  },

  // GET /purchase/expense/list — Fetch expenses
  getExpenses: async (params = {}, config = {}) => {
    const res = await api.get('/purchase/expense/list', { params, ...config });
    return res.data;
  },

  // POST /purchase/expense — Record expense
  createExpense: async (payload) => {
    const res = await api.post('/purchase/expense', payload);
    return res.data;
  },

  // DELETE /purchase/expense/:id — Delete expense
  deleteExpense: async (id) => {
    const res = await api.delete(`/purchase/expense/${id}`);
    return res.data;
  },

  // POST /purchase/convert-to-bill/:id — Convert purchase order to bill
  convertToPurchaseBill: async (id) => {
    const res = await api.post(`/purchase/convert-to-bill/${id}`);
    return res.data;
  },
};

export default purchaseService;
