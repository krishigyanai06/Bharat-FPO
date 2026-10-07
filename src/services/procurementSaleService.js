import api from '../lib/api';

const procurementSaleService = {
  getSales: async (params = {}) => {
    const res = await api.get('/procurement-sale/getSales', { params });
    return res.data;
  },

  getSaleById: async (id) => {
    const res = await api.get(`/procurement-sale/getSaleById/${id}`);
    return res.data;
  },

  addSale: async (payload) => {
    const res = await api.post('/procurement-sale/addSale', payload);
    return res.data;
  },

  updateSale: async (id, payload) => {
    const res = await api.patch(`/procurement-sale/updateSale/${id}`, payload);
    return res.data;
  },

  deleteSale: async (id) => {
    const res = await api.delete(`/procurement-sale/deleteSale/${id}`);
    return res.data;
  },

  generateEWayBill: async (id, body, token) => {
    const headers = {};
    if (token) {
      headers['x-ewaybill-token'] = token;
    }
    const res = await api.post(`/procurement-sale/generateEWayBill/${id}`, body, { headers });
    return res.data;
  },

  getStockLogs: async () => {
    const res = await api.get('/procurement/stock/logs');
    return res.data?.data || res.data || [];
  },

  adjustStock: async (payload) => {
    const res = await api.post('/procurement/stock/adjust', payload);
    return res.data;
  },

  getProcurementStock: async () => {
    let stockData = [];

    // Helper parser to flat-map stock objects from various formats
    const parseStockItem = (item) => {
      const cropNameVal = (typeof item.crop === 'object' && item.crop !== null)
        ? (item.crop.cropName || item.crop.name || '')
        : (item.cropName || item.crop || item.crop_name || '');

      const varietyVal = (typeof item.variety === 'object' && item.variety !== null)
        ? (item.variety.name || item.variety.value || '')
        : (item.variety || '');

      const godownVal = (typeof item.godown === 'object' && item.godown !== null)
        ? (item.godown.name || item.godown.value || item.godown.nameOfGodown || '')
        : (item.godown || '');

      const qty = item.availableQuantity !== undefined 
        ? item.availableQuantity 
        : (item.quantity !== undefined ? item.quantity : 0);

      return {
        _id: item._id || `${cropNameVal}_${varietyVal}_${godownVal}`.toLowerCase().replace(/\s+/g, '-'),
        cropName: cropNameVal,
        variety: varietyVal,
        godown: godownVal || 'Main Godown',
        availableQuantity: Number(qty) || 0,
        rate: Number(item.rate || item.price || item.purchasePrice || 0),
        unit: item.unit || 'qtl',
      };
    };

    // Call official endpoint: `/procurement/stock`
    try {
      console.log('[getProcurementStock] Requesting GET /procurement/stock...');
      const res = await api.get('/procurement/stock');
      const data = res.data?.data || res.data;
      if (Array.isArray(data)) {
        stockData = data.map(parseStockItem);
        console.log('[getProcurementStock] Loaded successfully:', stockData);
      }
    } catch (e) {
      console.warn('/procurement/stock failed, falling back to completed purchases aggregation...', e);
      try {
        const res = await api.get('/procurement/getPurchases');
        const purchases = res.data?.data || res.data || [];
        
        const stockMap = {};
        purchases.forEach((p) => {
          const status = (p.status || '').toLowerCase().trim();
          if (!status || status === 'completed' || status === 'approved' || status === 'in-transit') {
            p.crops?.forEach((c) => {
              const name = (c.cropName || c.name || '').trim();
              if (!name) return;
              const variety = (c.variety || '').trim();
              const godown = (p.godown || 'Main Godown').trim();
              const key = `${name}_${variety}_${godown}`.toLowerCase().trim();

              if (!stockMap[key]) {
                stockMap[key] = {
                  _id: key,
                  cropName: name,
                  variety: variety,
                  godown: godown,
                  availableQuantity: 0,
                  rate: c.rate || 0,
                  unit: c.unit || 'qtl',
                };
              }
              stockMap[key].availableQuantity += Number(c.quantity) || 0;
            });
          }
        });
        stockData = Object.values(stockMap);
        console.log('[getProcurementStock] Aggregated stock successfully:', stockData);
      } catch (err) {
        console.error('[getProcurementStock] Both stock endpoint and purchases aggregation failed:', err);
        throw new Error(err.response?.data?.message || err.message || 'Failed to retrieve procurement stock');
      }
    }

    return stockData;
  },

  downloadInvoicePdf: async (id) => {
    const res = await api.get(`/procurement-sale/receipt/${id}`, {
      responseType: 'blob'
    });
    return res.data;
  }
};

export default procurementSaleService;
