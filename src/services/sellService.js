import api from '../lib/api';

const sellService = {
  // GET /sell/total — Fetch aggregate metrics across sales
  getSalesTotal: async (params = {}, config = {}) => {
    const res = await api.get('/sell/total', { params, ...config });
    return res.data;
  },

  // GET /sell/ — Fetch paginated sales
  getSales: async (params = {}, config = {}) => {
    const res = await api.get('/sell/', { params, ...config });
    return res.data;
  },

  // POST /sell/sell-items — Record a sale or estimate
  createSaleOrEstimate: async (payload) => {
    const res = await api.post('/sell/sell-items', payload);
    return res.data;
  },

  // PATCH /sell/:id — Update a sale or estimate
  updateSaleOrEstimate: async (id, payload) => {
    const res = await api.patch(`/sell/${id}`, payload);
    return res.data;
  },

  // POST /sell/convert-to-sale/:id — Convert Estimate to Sale
  convertToSale: async (id) => {
    const res = await api.post(`/sell/convert-to-sale/${id}`);
    return res.data;
  },

  // DELETE /sell/:id — Delete sale
  deleteSale: async (id) => {
    const res = await api.delete(`/sell/${id}`);
    return res.data;
  },

  // GET /sell/payment-in — Fetch payment receipts
  getPaymentsIn: async (params = {}, config = {}) => {
    const res = await api.get('/sell/payment-in', { params, ...config });
    return res.data;
  },

  // POST /sell/payment-in — Record customer payment-in
  recordPaymentIn: async (payload) => {
    const res = await api.post('/sell/payment-in', payload);
    return res.data;
  },

  // PATCH /sell/payment-in/:id — Update a payment-in receipt
  updatePaymentIn: async (id, payload) => {
    const res = await api.patch(`/sell/payment-in/${id}`, payload);
    return res.data;
  },

  // DELETE /sell/payment-in/:id — Delete payment-in
  deletePaymentIn: async (id) => {
    const res = await api.delete(`/sell/payment-in/${id}`);
    return res.data;
  },

  // GET /sell/sell-return — Fetch sales returns
  getSalesReturns: async (params = {}, config = {}) => {
    const res = await api.get('/sell/sell-return', { params, ...config });
    return res.data;
  },

  // POST /sell/sell-return — Record sales return
  recordSalesReturn: async (payload) => {
    const res = await api.post('/sell/sell-return', payload);
    return res.data;
  },

  // PATCH /sell/sell-return/:id — Update sales return
  updateSalesReturn: async (id, payload) => {
    const res = await api.patch(`/sell/sell-return/${id}`, payload);
    return res.data;
  },

  // DELETE /sell/sell-return/:id — Delete sales return
  deleteSalesReturn: async (id) => {
    const res = await api.delete(`/sell/sell-return/${id}`);
    return res.data;
  },
};

export default sellService;
