import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { on } from "events";

export const action = async ({ request }) => {
  const { topic, shop, session, admin, payload } = await authenticate.webhook(request);

  if (!admin) {
    // The admin context isn't returned if the webhook fired after a shop was uninstalled.
    throw new Response();
  }

  // The topics handled here should be declared in the shopify.app.toml.
  // More info: https://shopify.dev/docs/apps/build/cli-for-apps/app-configuration
  console.log('Webhook recevied: ', topic);

  switch (topic) {
    case "ORDERS_PAID":
      if (session) {
        // Get shop id
        const shop = await prisma.shop.findFirst({
          where: {
            domain: session.shop
          }
        })
        
        if (!shop) {
          return true;
        }

        // Get one tick settings
        const settings = await prisma.settings.findFirst({
          where: {
            shopId: shop.id
          }
        })

        if (!settings) {
          return true;
        }

        const oneTickVariantId = settings.oneTickVariantId;

        const orderWebhook = payload;
        
        let oneTickTotalPrice = 0;

        // Check having onetick in the order
        let hasOneTick = false;
        for (let lineItem of orderWebhook.line_items) {
          if (oneTickVariantId?.endsWith(lineItem.variant_id)) {
            hasOneTick = true;
            oneTickTotalPrice += parseFloat(lineItem.price) * parseInt(lineItem.quantity);
          }
        }

        if (!hasOneTick) {
          return true;
        }

        const webhookId = orderWebhook.id;

        // Check if exist
        const log = await prisma.oneTickOrderLog.findFirst({
          where: {
            webhookId: webhookId
          }
        })
        if (log) {
          console.log(log);
          return true;
        }

        const shopifyOrderId = orderWebhook.admin_graphql_api_id;
        const shopifyOrderCustomerId = orderWebhook.customer ? orderWebhook.customer.admin_graphql_api_id : null;
        const shopifyOrderCreatedAt = new Date(orderWebhook.created_at);
        const customerEmail = orderWebhook.customer ? orderWebhook.customer.email : null;
        const subtotalPrice = parseFloat(orderWebhook.subtotal_price);
        const totalPrice = parseFloat(orderWebhook.total_price);
        const oneTickPrice = oneTickTotalPrice;
        const updatedAt = new Date();
        const createdAt = new Date();

        // Update db
        await prisma.oneTickOrderLog.create({
          data: {
            webhookId: webhookId,
            shopifyOrderId: shopifyOrderId,
            shopifyOrderCustomerId: shopifyOrderCustomerId,
            shopifyOrderCreatedAt: shopifyOrderCreatedAt,
            customerEmail: customerEmail,
            subtotalPrice: subtotalPrice,
            totalPrice: totalPrice,
            oneTickPrice: oneTickPrice,
            updatedAt: updatedAt,
            createdAt: createdAt,
          }
        })

      }
    case "APP_UNINSTALLED":
      if (session) {
        await prisma.session.deleteMany({ where: { shop } });
      }

      break;
    case "CUSTOMERS_DATA_REQUEST":
    case "CUSTOMERS_REDACT":
    case "SHOP_REDACT":
    default:
      throw new Response("Unhandled webhook topic", { status: 404 });
  }

  // throw new Response();

  return true;
};
