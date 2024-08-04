import prisma from '../db.server';

import { json } from '@remix-run/node';

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
        console.log('GraphQL error log: ', json(result));
        throw new Error(`GraphQL errors: ${json(result)}`);
    }

    return result.data;
}