import { json } from "@remix-run/react"

import prisma from "../db.server";

import { setMetafield } from './utils';

import { authenticate } from '../shopify.server';

const METAFIELD_KEY = "onetick_status_key";
const METAFIELD_TYPE = "single_line_text_field";

const dbUpdateOnetickStatus = async (oneTickId) => {
  const oneTick = await prisma.oneTick.findFirst({
    where: {
      id: oneTickId
    }
  })

  if (!oneTick) {
    throw new Error("One tick not found")
  }

  const newStatus = !oneTick.status;

  await prisma.oneTick.update({
    where: {
      id: oneTick.id
    },
    data: {
      status: newStatus
    }
  })

  return newStatus;
}

const metafieldUpdateOnetickStatus = async (oneTickId, newStatus) => {
  // Get onetick from db
  const oneTick = await prisma.oneTick.findFirst({
    where: {
      id: oneTickId
    }
  })

  if (!oneTick) {
    throw new Error(`One tick ${oneTickId} not found`)
  }

  // Get shop shopify id
  const shopId = oneTick.shopId;

  const shop = await prisma.shop.findFirst({
    where: {
      id: shopId
    }
  });

  if (!shop) {
    throw new Error(`Shop ${shopId} not found`);
  }

  await setMetafield(shop.domain, METAFIELD_KEY, newStatus, METAFIELD_TYPE);
}

export const loader = async () => {}

export const action = async ({ request }) => {
    try {
      await authenticate.admin(request);
      console.log('toggle request: ', request);
    }
    catch (error) {
      console.log('Error while authenticating request ', request);
      console.log('Error', error);
    }

    const jsonData = await request.json();
    const oneTickId = jsonData.id;

    // Update db
    const dbUpdate = await dbUpdateOnetickStatus(oneTickId);
    const updateResult = dbUpdate;

    // Update metafield
    await metafieldUpdateOnetickStatus(oneTickId, updateResult);

    return json({
      status: updateResult
    });
}