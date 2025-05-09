const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();

// 限制 CORS 到 Shopify 域名
app.use(cors({
  origin: 'https://zgrills.myshopify.com' // 替换为你的 Shopify 域名
}));
app.use(express.json());

const orderLookupRouter = require('./api/order-lookup');
app.use('/api/order-lookup', orderLookupRouter);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});