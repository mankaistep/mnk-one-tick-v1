import { useState, useEffect } from "react";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  BlockStack,
  InlineGrid,
  Button,
  InlineStack,
  Badge,
  Box,
  Icon
} from "@shopify/polaris";
import {
  CashDollarIcon,
  CartIcon,
  PersonIcon
} from "@shopify/polaris-icons"
import { authenticate } from "../shopify.server";

import { useAppBridge } from "@shopify/app-bridge-react";

import prisma from "../db.server"

import { sendGraqhQL } from "./utils";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  const currentShopDomain = session.shop;

  let oneTick = null;
  let shop = await prisma.shop.findFirst({
    where: {
      domain: currentShopDomain
    }
  })

  // Create shop data
  if (!shop || !shop.appId || !shop.currencyFormat) {
    // Get shopify id
    const queryShopGraphQL = `
      query {
        shop {
          id
          name
          email
          currencyFormats {
            moneyWithCurrencyFormat
          }
        }
      }
    `;
    const data = await sendGraqhQL(queryShopGraphQL, currentShopDomain, session.accessToken);

    const queryAppIdGraphQL = `
      query {
        currentAppInstallation {
          id
          app {
            id
          }
        }
      }
    `;

    const appInstallation = await sendGraqhQL(queryAppIdGraphQL, currentShopDomain, session.accessToken);
    const appId = appInstallation.currentAppInstallation.app.id.replace('gid://shopify/App/', '');

    if (!shop) {
      shop = await prisma.shop.create({
        data: {
          domain: currentShopDomain,
          shopify_id: data.shop.id,
          email: data.shop.email,
          app_id: appId,
          name: data.shop.name,
          currencyFormat: data.shop.currencyFormats.moneyWithCurrencyFormat,
          accessToken: session.accessToken,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })
    }
    else if (!shop.app_id) {
      shop = await prisma.shop.updateMany({
        where: {
          domain: currentShopDomain
        },
        data: {
          app_id: appId
        }
      })
    }
    else if (!shop.currencyFormat) {
      shop = await prisma.shop.updateMany({
        where: {
          domain: currentShopDomain
        },
        data: {
          currencyFormat: data.shop.currencyFormats.moneyWithCurrencyFormat
        }
      })
    }

  }

  // Get one tick
  oneTick = await prisma.oneTick.findFirst({
    where: {
      shopId: shop.id
    }
  })

  // Get one tick state
  if (!oneTick) {
    oneTick = await prisma.oneTick.create({
      data: {
        shopId: shop.id,
        status: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })
  }

  return json({
    shop: shop,
    oneTick: oneTick,
    domain: currentShopDomain
  });
};

export const action = async ({ request }) => {
  await authenticate.admin(request);

  return null;
};

export default function Index() {
  /*
    DECLARE
  */
  const appBridge = useAppBridge();
  const loaderData = useLoaderData();

  const oneTick = loaderData.oneTick;
  const domain = loaderData.domain;
  const shop = loaderData.shop;

  const [oneTickStatus, setOneTickStatus] = useState(oneTick.status);
  const [oneTickStatusChanging, setOneTickStatusChanging] = useState(false);
  const [oneTickMetrics, setOneTickMetrics] = useState({
    revenue: 0,
    orders: 0,
    customers: 0
  })

  const handleToggle = async () => {
    setOneTickStatusChanging(true);
    try {
      const response = await fetch("/api/toggle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          id: oneTick.id
        })
      })

      if (!response.ok) {
        throw new Error("Not okay :(")
      }
      
      const data = await response.json(); 
      

      setOneTickStatus(data.status);

      if (data.status) {
        appBridge.toast.show("One-tick activated");
      }
      else {
        appBridge.toast.show("One-tick deactivated");
      }
    }
    catch (error) {
      console.log('Error while handling toggle: ', error);
    }
    finally {
      setOneTickStatusChanging(false);
    }
  };

  /*
    RUN
  */

  // Load metrics
  useEffect(() => {
    const getAndSetMetrics = async () => {
      const apiURL = `/api/metrics/get?domain=${domain}`;
        
      const response = await fetch(apiURL, {
          method: "GET"
          })
  
      if (!response.ok) {
          throw new Error("Not okay :(")
      }
          
      const metrics = await response.json();   

      setOneTickMetrics(metrics);
    }
    getAndSetMetrics();
  }, []);

  return (
    <Page title="Welcome to One-tick Upsell 2 😍">
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            <BlockStack gap="300">
            { /* Status*/ }
              <Card roundedAbove="sm">
                <InlineGrid columns="2" >
                  <BlockStack gap="200">
                    <InlineStack gap="200">
                      <Text variant="headingSm">
                        One-tick status
                      </Text>
                      {oneTickStatus ? <Badge tone="success">Active</Badge> : <></>}
                    </InlineStack>
                    <InlineStack>
                      <Text variant="bodyMd">
                        {oneTickStatus ? "One-tick is running on your store" : "Enable one-tick to generate more sales from your stores"}
                      </Text>
                    </InlineStack>
                  </BlockStack>
                  <BlockStack>
                    <InlineStack align="end">
                      <Box width="65px">
                        {oneTickStatusChanging ?
                          <Button loading fullWidth>
                          </Button> : 
                          <Button fullWidth variant={oneTickStatus ? "secondary" : "primary"} onClick={handleToggle}>
                            {oneTickStatus ? "Disable" : "Enable"}
                          </Button>
                        }
                      </Box>
                    </InlineStack>
                  </BlockStack>
                </InlineGrid>
              </Card>

              {/* Metrics */}
              <InlineGrid columns={3} gap="200">
                {/* Metric card */}
                <Card roundedAbove="sm">
                  <BlockStack gap="200">
                    <InlineStack gap="100" align="start">
                      <Box>
                        <Icon tone="subdued" source={CashDollarIcon}></Icon>
                      </Box>
                      <Text tone="subdued">Revenue generated</Text>
                    </InlineStack>
                    <Box paddingInlineStart={100}>
                      <Text variant="headingMd">{shop.currencyFormat.replace("{{amount_no_decimals_with_comma_separator}}", oneTickMetrics.revenue)}</Text>
                    </Box>
                  </BlockStack>
                </Card>
                {/* Metric card */}
                <Card roundedAbove="sm">
                  <BlockStack gap="200">
                    <InlineStack gap="100" align="start">
                      <Box>
                        <Icon tone="subdued" source={CartIcon}></Icon>
                      </Box>
                      <Text tone="subdued">Orders having one-tick</Text>
                    </InlineStack>
                    <Box paddingInlineStart={100}>
                      <Text variant="headingMd">{oneTickMetrics.orders}</Text>
                    </Box>
                  </BlockStack>
                </Card>
                {/* Metric card */}
                <Card roundedAbove="sm">
                  <BlockStack gap="200">
                    <InlineStack gap="100" align="start">
                      <Box>
                        <Icon tone="subdued" source={PersonIcon}></Icon>
                      </Box>
                      <Text tone="subdued">Customers picked one-tick</Text>
                    </InlineStack>
                    <Box paddingInlineStart={100}>
                      <Text variant="headingMd">{oneTickMetrics.customers}</Text>
                    </Box>
                  </BlockStack>
                </Card>
              </InlineGrid>
            </BlockStack>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
