import { json } from "@remix-run/react"

import prisma from "../db.server";

import { authenticate } from "../shopify.server";

import { sendGraqhQL } from "./utils";

const getSettings = async (shopDomain, variantIncluded) => {
  const shop = await prisma.shop.findFirst({
    where: {
      domain: shopDomain
    }
  })

  if (!shop) {
    return null;
  }

  const settings = await prisma.settings.findFirst({
    where: {
      shopId: shop.id
    }
  })

  if (settings) {
    if (variantIncluded && settings?.oneTickVariantId) {
      const variantQuery = `
        query {
              productVariant(id: "${settings.oneTickVariantId}") {
                  title
                  displayName
                  price
                  image {
                      url
                      originalSrc
                  }
              }
          }
        `
      const variantQueryData = await sendGraqhQL(variantQuery, shopDomain, shop.accessToken);
      
      settings.variant = variantQueryData.productVariant;
    }
  }

  return settings;
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

  // Check variant true
  const variantIncluded = searchParams.has('variant') && searchParams.get('variant') == 'true';

  const settings = await getSettings(domain, variantIncluded);

  return json(settings);
}

export const action = async ({ request }) => {}
