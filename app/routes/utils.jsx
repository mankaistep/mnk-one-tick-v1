import prisma from '../db.server';

const METAFIELD_NAME = process.env.APP_METAFIELD_NAME;

export const getEscapedNewSettingsJson = (text) => {
    // Properly escape the JSON string for embedding in the GraphQL mutation
    return text.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export const sendGraqhQL = async (query, storeDomain, accessToken) => {
    const url = `https://${storeDomain}/admin/api/2024-07/graphql.json`;

    let token = accessToken;

    if (!token) {
        const shop = await prisma.shop.findFirst({
            where: {
                domain: storeDomain
            }
        });
    
        token = shop.accessToken;
    }

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': token
        },
        body: JSON.stringify({ query }),
    });

    if (!response.ok) {
        throw new Error(`GraphQL failed: ${response}`);
    }

    const result = await response.json();

    if (result.errors) {
        throw new Error(`GraphQL errors when executing ${JSON.stringify(query)} the error message: ${JSON.stringify(result)}`);
    }

    // userErrors
    const extractFirstKeyValue = (query) => {
        const regex = /(?:mutation|query)\s*{\s*(\w+)/;
        const match = query.match(regex);
        
        if (match) {
            return match[1]; // Output: metafieldDefinitionCreate (or any word found in place of it)
        }

        return null;
    };

    const metafieldQueryName = extractFirstKeyValue(query);

    if (result.data[metafieldQueryName].userErrors?.length > 0) {
        const userErrorsString = JSON.stringify(result.data[metafieldQueryName].userErrors, null, 2);
        throw new Error(`GraphQL errors (userErrors): ${userErrorsString}`);
    }

    return result.data;
}

export const setMetafield = async (shopDomain, key, value, type) => {
    // Find shop
    const shop = await prisma.shop.findFirst({
        where: {
            domain: shopDomain
        }
    });

    if (!shop) {
        throw new Error(`Shop ${shopDomain} not found`);
    }

    // Check definition
    const queryMetafieldText = `
    query {
        metafieldDefinitions(first: 1, ownerType: SHOP, key: "${key}") {
            edges {
                node {
                    name
                }
            }
        }
        }
    `;

    // Read metafield definiton
    let metafieldDefinitons = await sendGraqhQL(queryMetafieldText, shop.domain);

    // If no metafield definition created
    if (metafieldDefinitons.metafieldDefinitions.edges.length == 0) {
        // Create metafield
        const queryCreateMetafield = `
        mutation {
            metafieldDefinitionCreate(definition: {
                name: "${METAFIELD_NAME}",
                key: "${key}",
                access: {
                    admin: PUBLIC_READ,
                    storefront: PUBLIC_READ
                },
                type: "${type}",
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

    const fixedValue = type == "json" ? getEscapedNewSettingsJson(value) : value;

    // Send GraphQL
    const querySetMetafield = `
    mutation {
      metafieldsSet(metafields: [
        {
            key: "${key}",
            ownerId: "${shop.shopify_id}",
            value: "${fixedValue}",
            type: "${type}"
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

    const result = await sendGraqhQL(querySetMetafield, shop.domain);

    return result;
}