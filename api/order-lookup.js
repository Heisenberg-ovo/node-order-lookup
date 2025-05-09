const express = require('express');
const router = express.Router();
const axios = require('axios');
const axiosRetry = require('axios-retry').default;

// 验证环境变量
if (!process.env.SHOPIFY_SHOP_NAME || !process.env.SHOPIFY_ACCESS_TOKEN) {
  console.error('Missing Shopify environment variables');
  process.exit(1);
}

// 配置 axios-retry
axiosRetry(axios, {
  retries: 3,
  retryDelay: (retryCount) => retryCount * 1000,
  retryCondition: (error) => error.response?.status === 429
});

router.post('/', async (req, res) => {
  const { orderNumber } = req.body;
  if (!orderNumber) {
    return res.status(400).json({ success: false, message: '订单号不能为空' });
  }

  try {
    const cleanOrderNumber = orderNumber.replace(/^#/, '');
    console.log('Querying order:', cleanOrderNumber);

    // GraphQL 查询
    const query = `
      query ($query: String!) {
        orders(first: 10, query: $query) {
          edges {
            node {
              id
              name
              createdAt
              legacyResourceId
              lineItems(first: 10) {
                edges {
                  node {
                    name
                    product {
                      id
                      title
                    }
                    variant {
                      id
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;
    const variables = {
      query: `from:${cleanOrderNumber} OR name:${orderNumber}`
    };

    const response = await axios.post(
      `https://${process.env.SHOPIFY_SHOP_NAME}/admin/api/2024-10/graphql.json`,
      { query, variables },
      {
        headers: {
          'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('Shopify API response:', JSON.stringify(response.data, null, 2));

    if (response.data.errors) {
      console.error('GraphQL errors:', response.data.errors);
      return res.status(500).json({
        success: false,
        message: 'Shopify API 返回错误',
        error: response.data.errors
      });
    }

    const orders = response.data.data?.orders?.edges?.map(edge => edge.node) || [];
    console.log(`Found ${orders.length} orders`);

    const matchedOrder = orders.find(
      order => order.legacyResourceId === cleanOrderNumber || order.name.replace(/^#/, '') === cleanOrderNumber
    );

    if (matchedOrder) {
      // 提取产品 ID 和标题
      const products = matchedOrder.lineItems?.edges
        ?.map(edge => ({
          id: edge.node.product?.id,
          title: edge.node.product?.title
        }))
        .filter(item => item.id && item.title) || [];

      // 判断订单类型
      let orderType = 'none';
      const productIdMap = {
        '6928203087921': 'takeOne',
        '6928205643825': 'takeTwo'
      };

      for (const product of products) {
        console.log('Product:', { id: product.id, title: product.title }); // 调试
        const productId = product.id.split('/').pop();
        const title = product.title.toUpperCase();

        // 检查 takeOne 和 takeTwo
        if (productIdMap[productId]) {
          orderType = productIdMap[productId];
          break;
        }
        // 检查 normal（ID 或标题）
        if (productId === '6928200532017' || title.includes('REWARD CROWDFUNDING')) {
          orderType = 'normal';
          break;
        }
      }

      // 调试 lineItems
      console.log('Line items:', JSON.stringify(matchedOrder.lineItems, null, 2));

      res.json({
        success: true,
        order: {
          created_at: matchedOrder.createdAt,
          name: matchedOrder.name,
          products,
          orderType // normal, takeOne, takeTwo, none
        }
      });
    } else {
      res.json({ success: false, message: '未找到订单' });
    }
  } catch (error) {
    console.error('Error querying order:', error.message, error.stack);
    res.status(500).json({ success: false, message: '服务器错误', error: error.message });
  }
});

module.exports = router;