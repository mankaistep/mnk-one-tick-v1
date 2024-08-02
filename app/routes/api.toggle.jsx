import { json } from "@remix-run/react"

import prisma from "../db.server";

import { sendGraqhQL } from './utils';

const METAFIELD_NAME = "verynewonetick";
const METAFIELD_KEY = "onetick_status_2";

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

const metafieldUpdateOnetickStatus = async(oneTickId, newStatus) => {
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

  // Get private metafield
  const queryMetafieldText = `
    query {
      metafieldDefinitions(first: 1, ownerType: SHOP, key: "${METAFIELD_KEY}") {
        edges {
          node {
            name
          }
        }
      }
    }
  `;

  // Read metafield definiton
  let oneTickMetafields = await sendGraqhQL(queryMetafieldText, shop.domain);

  // If no metafield created
  if (oneTickMetafields.metafieldDefinitions.edges.length == 0) {
    // Create metafield
    const queryCreateMetafield = `
      mutation {
        metafieldDefinitionCreate(definition: {
          name: "${METAFIELD_NAME}",
          key: "${METAFIELD_KEY}",
          access: {
            admin: PUBLIC_READ,
            storefront: PUBLIC_READ
          }
          type: "single_line_text_field",
          ownerType: SHOP
        }) {
          createdDefinition {
            id
            name
          }
          userErrors {
            field
            message
            code
          }
        }
      }
    `;
    await sendGraqhQL(queryCreateMetafield, shop.domain); 
  }
  // Set value
  const querySetMetafield = `
    mutation {
      metafieldsSet(metafields: [
        {
          key: "${METAFIELD_KEY}",
          ownerId: "${shop.shopify_id}",
          value: "${newStatus}",
          type: "single_line_text_field"
        }
      ]) {
        metafields {
          key
          namespace
          value
          createdAt
          updatedAt
        }
        userErrors {
          field
          message
          code
        }
      }
    }
  `;
  await sendGraqhQL(querySetMetafield, shop.domain);
}

export const loader = async () => {}

export const action = async ({ request }) => {
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