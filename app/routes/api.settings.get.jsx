import { json } from "@remix-run/react"

import prisma from "../db.server";

const getSettings = async (shopDomain) => {
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
  
  return settings;
}

export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const searchParams = url.searchParams;

  const domain = searchParams.get('domain');

  const settings = await getSettings(domain);

  return json(settings);
}

export const action = async ({ request }) => {}