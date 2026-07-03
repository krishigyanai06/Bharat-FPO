import api from '../lib/api';

const eWayBillService = {
  authenticate: async (credentials) => {
    const res = await api.post('/e-invoice/e-way-bill/session/authenticate', credentials);
    return res.data;
  },

  generateByIRN: async (irn, payload) => {
    const res = await api.post(`/e-invoice/e-way-bill/generate-by-irn/${irn}`, payload, {
      governmentToken: 'einvoice',
    });
    return res.data;
  },

  generateStandalone: async (payload) => {
    const res = await api.post('/e-invoice/e-way-bill/generate-standalone', payload, {
      governmentToken: 'ewaybill',
    });
    return res.data;
  },

  cancel: async (payload) => {
    const res = await api.post('/e-invoice/e-way-bill/cancel', payload, {
      governmentToken: 'ewaybill',
    });
    return res.data;
  },

  extend: async (payload) => {
    const res = await api.post('/e-invoice/e-way-bill/extend', payload, {
      governmentToken: 'ewaybill',
    });
    return res.data;
  },

  updateVehicle: async (payload) => {
    const res = await api.put('/e-invoice/e-way-bill/vehicle', payload, {
      governmentToken: 'ewaybill',
    });
    return res.data;
  },

  updateTransporter: async (payload) => {
    const res = await api.put('/e-invoice/e-way-bill/transporter', payload, {
      governmentToken: 'ewaybill',
    });
    return res.data;
  },

  generatePdf: async (payload) => {
    const res = await api.post('/e-invoice/e-way-bill/pdf/generate', payload, {
      responseType: 'blob',
      governmentToken: 'ewaybill',
    });
    return res.data;
  },
};

export default eWayBillService;
