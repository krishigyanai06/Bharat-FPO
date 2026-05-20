const axios = require('axios');
const api = axios.create({ baseURL: 'https://master-app-h957.onrender.com/api' });
console.log(api.getUri({ url: 'purchase/getPurchases' }));
console.log(api.getUri({ url: '/purchase/getPurchases' }));
