import { json } from "@remix-run/react"

import prisma from "../db.server";

import { authenticate } from "../shopify.server";

const getMetrics = async (shopDomain) => {
  const metrics = {
    revenue: 0,
    orders: 0,
    customers: 0
  }

  // Check shop
  const shop = await prisma.shop.findFirst({
    where: {
      domain: shopDomain
    }
  })

  if (!shop) {
    return metrics;
  }

  // Get logs
  const logs = await prisma.oneTickOrderLog.findMany({
    where: {
      shopId: shop.id
    }
  })

  let revenue = 0;
  let orders = 0;
  let customersSet = new Set();
  
  logs.forEach(log => {
    revenue += log.oneTickPrice; // Summing up the oneTickPrice for revenue
    orders += 1; // Incrementing the orders count
    customersSet.add(log.shopifyCustomerId); // Adding unique customer IDs to the set
  });

  let customers = customersSet.size;

  metrics.revenue = revenue;
  metrics.orders = orders;
  metrics.customers = customers;

  return metrics;
}

export const loader = async ({ request }) => {
  try {
    await authenticate.admin(request);
  }
  catch (error) {
    console.log('Error while authenticating request ', request);
    console.log('Error', error);
    
    return json({
      'success': 'fail'
    })
  }

  const url = new URL(request.url);
  const searchParams = url.searchParams;

  const domain = searchParams.get('domain');

  const settings = await getMetrics(domain);

  return json(settings);
}

export const action = async ({ request }) => {}
