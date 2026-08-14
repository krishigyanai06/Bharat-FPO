import api from '../lib/api';

const bankDetailsService = {
  getBankDetails: async () => {
    const res = await api.get('/tenant/bank-details');
    return res.data?.data || res.data;
  },

  updateBankDetails: async (payload) => {
    const res = await api.patch('/tenant/bank-details', payload);
    return res.data?.data || res.data;
  },
};

export default bankDetailsService;
