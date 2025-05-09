const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();

// 动态 CORS 配置
const allowedOrigins = [
  'https://www.zgrills.com', // 自定义域名
  'https://zgrills.myshopify.com', // Shopify 默认域名
  'http://127.0.0.1:9292' // 本地开发（可选）
];
app.use(cors({
  origin: (origin, callback) => {
    // 允许无来源请求（如 curl）或匹配的来源
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
}));
app.use(express.json());

const orderLookupRouter = require('./api/order-lookup');
app.use('/api/order-lookup', orderLookupRouter);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});