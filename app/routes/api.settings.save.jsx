import { json } from "@remix-run/react"

import prisma from "../db.server";

import { setMetafield } from "./utils";

import { authenticate } from "../shopify.server";

const METAFIELD_KEY = "onetick_settings_key";
const METAFIELD_TYPE = "json";

const updateSettingsToDB = async (shopDomain, newSettings) => {

  let result = {
    result: "failed",
    message: "Fail for unknown reasons"
  }

  const shop = await prisma.shop.findFirst({
    where: {
      domain: shopDomain
    }
  })

  if (!shop) {
    return result;
  }

  const settings = await prisma.settings.findFirst({
    where: {
      shopId: shop.id
    }
  })

  // Exist => update
  if (settings) {
    await prisma.settings.update({
      where: {
        id: settings.id
      },
      data: {
        oneTickContent: newSettings.oneTickContent,
        oneTickVariantId: newSettings.oneTickVariantId,
        updatedAt: new Date()
      }
    })

    result = {
      result: "succeed",
      message: "Settings data updated"
    }
  }
  // Non exist => create
  else {
    await prisma.settings.create({
      data: {
        shopId: shop.id,
        oneTickContent: newSettings.oneTickContent,
        oneTickVariantId: newSettings.oneTickVariantId,
        createdAt: new Date(),
        updatedAt: new Date()
        }
      }
    )

    result = {
      result: "succeed",
      message: "Settings data created"
    }
  }

  return result;
}

const updateSettingsToMetafield = async(shopDomain, newSettings) => {

  await setMetafield(shopDomain, METAFIELD_KEY, JSON.stringify(newSettings), METAFIELD_TYPE);

  return true;
}

export const loader = async () => {}

export const action = async ({ request }) => {
    try {
      await authenticate.admin(request);
    }
    catch (error) {
      console.log('Error while authenticating request ', request);
      console.log('Error', error);
    } 

    const jsonData = await request.json();

    const url = new URL(request.url);
    const searchParams = url.searchParams;
    const domain = searchParams.get('domain');

    const result = {
      success: true,
      message: "Updated to DB and Metafield!"
    }
    
    await updateSettingsToDB(domain, jsonData);

    await updateSettingsToMetafield(domain, jsonData);

    return json(result);
}