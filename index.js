const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();

app.use(cors()); // 启用 CORS
app.use(express.json());

const orderLookupRouter = require('./api/order-lookup');
app.use('/api/order-lookup', orderLookupRouter);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});