import { useState } from "react";
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
  Box
} from "@shopify/polaris";
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
  if (!shop || !shop.appId) {
    // Get shopify id
    const queryShopGraphQL = `
      query {
        shop {
          id
          name
          email
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

  return json(oneTick);
};

export const action = async ({ request }) => {};

export default function Index() {

  const appBridge = useAppBridge();

  const oneTick = useLoaderData();
  const [oneTickStatus, setOneTickStatus] = useState(oneTick.status);
  const [oneTickStatusChanging, setOneTickStatusChanging] = useState(false);

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

  return (
    <Page title="Welcome to One-tick Upsell 2 😍">
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
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
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
