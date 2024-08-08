import { useAppBridge } from "@shopify/app-bridge-react";
import {
    Layout,
    Page,
    Card,
    BlockStack,
    Text,
    InlineStack,
    TextField,
    Box,
    Button,
    Thumbnail,
    Icon,
    InlineGrid
} from "@shopify/polaris";
import {
    XIcon
} from '@shopify/polaris-icons';

import { useState, useEffect } from "react";

import { authenticate } from "../shopify.server"
import { Form, useLoaderData } from "@remix-run/react";

import { json } from "@remix-run/node"

export const loader = async ({ request }) => {
    const { admin, session } = await authenticate.admin(request);

    const domain = session.shop;

    const origin = new URL(request.url).origin;

    return json({
        domain: domain,
        origin: origin
    });
}

export const action = async ({ request }) => {
    await authenticate.admin(request);

    return null; 
}

export default function Index() {
    const appBridge = useAppBridge();

    const loaderData = useLoaderData();

    const domain = loaderData.domain;

    // One tick content
    const [oneTickContent, setOneTickContent] = useState("");
    const [oneTickVariant, setOneTickVariant] = useState(undefined);

    // Set one tick function
    useEffect(() => {
        const setOneTickData = async () => {
            const apiURL = `/api/settings/get?domain=${domain}&variant=true`;
        
            const response = await fetch(apiURL, {
                method: "GET"
                })
        
            if (!response.ok) {
                throw new Error("Not okay :(")
            }
                
            const settings = await response.json(); 

            let defaultOneTickVariant = null;
            let defaultOneTickContent = null;
        
            defaultOneTickVariant = null;
            defaultOneTickContent = settings?.oneTickContent ? settings.oneTickContent : null;
        
            if (settings?.oneTickVariantId) {
                defaultOneTickVariant = settings.variant;
            }

            setOneTickContent(defaultOneTickContent);
            setOneTickVariant(defaultOneTickVariant);
        
        }
        setOneTickData();
    }, [])

    // Save settings
    const handleSettingSave = async (settings) => {
        const response = await fetch("/api/settings/save?domain=" + domain, {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify(settings)
        })
    
        if (!response.ok) {
            throw new Error("Not okay :(")
        }

        appBridge.toast.show("Settings saved");
    }

    // Dispact when varirant change
    const dispatchVariantChangeEvent = () => {
        // Find the element with the name "oneTickId"
        const element = document.querySelector('[name="oneTickId"]');

        if (element) {
            // Create a new event
            const event = new Event('change', {
                bubbles: true,
                cancelable: true,
            });

            // Dispatch the event on the element
            element.dispatchEvent(event);
        } else {
            console.log('Element with name "oneTickId" not found.');
        }
    }

    // Hande variant remove
    const handleVariantRemove = async () => {
        setOneTickVariant(null);
        dispatchVariantChangeEvent();
    }

    return (
        <Page title="Settings">
            <Layout>
                <Layout.Section>
                    <Card>
                        <Form
                            data-save-bar
                            
                            onSubmit={async (event) => {
                                event.preventDefault();
                                
                                const dataOneTickContent = oneTickContent;
                                const dataOneTickVariantId = oneTickVariant ? oneTickVariant.id : null;

                                await handleSettingSave({
                                    oneTickContent: dataOneTickContent,
                                    oneTickVariantId: dataOneTickVariantId
                                })
                            }}

                            onReset={async (event) => {
                                setOneTickVariant(loaderData.oneTickVariant);
                            }}
                            
                        >
                            <BlockStack gap={200}>
                                <Text variant="headingSm">General settings</Text>
                                <Box width="100%">
                                    <TextField name="oneTickContent" label="One-tick content" placeholder="Add shipping protection ($5)" value={oneTickContent} onChange={(newValue) => {
                                        setOneTickContent(newValue);
                                    }}/>
                                </Box>
                                <Box width="100%">
                                    <div hidden>
                                        <TextField name="oneTickId" value={oneTickVariant?.id ? oneTickVariant.id : ""}/>                         
                                    </div>
                                    <TextField label="Select one-tick product" placeholder="Search product" onFocus={async () => {
                                        const selectedVariants = await appBridge.resourcePicker({
                                            type: "variant",
                                            action: "select",
                                            multiple: false
                                        })
                                        if (selectedVariants?.length > 0) {
                                            const selectedVariant = selectedVariants[0];

                                            console.log(selectedVariant);
                                            setOneTickVariant(selectedVariant);

                                            // Dispatch change event for Save bar
                                            dispatchVariantChangeEvent();
                                        }
                                    }}/>
                                </Box>
                                {oneTickVariant ?
                                    <Box borderWidth="025" borderRadius="150" borderColor="border-disabled" padding="200">
                                        <InlineStack gap="200" blockAlign="center">
                                            {oneTickVariant.image && oneTickVariant.image.originalSrc ?
                                                <img alt="product img" src={oneTickVariant.image.originalSrc} width="50px" height="50px" style={{borderRadius: "4px"}}></img> :
                                                <img alt="product img" src="https://www.beelights.gr/assets/images/empty-image.png" width="50px" height="50px" style={{borderRadius: "4px"}}></img>
                                            }
                                            <div style={{flex: 1}}>
                                                <Box>
                                                    <BlockStack>
                                                        <Text>{oneTickVariant.displayName.replace(" - " + oneTickVariant.title, "")}</Text>
                                                        <Text tone="subdued">{"$" + oneTickVariant.price + ", " + oneTickVariant.title}</Text>
                                                    </BlockStack>
                                                </Box>
                                            </div>
                                            <Box>
                                                <Button variant="plan" icon={XIcon} onClick={handleVariantRemove}>
                                                    {/* <Icon source={XIcon}/> */}
                                                </Button>
                                            </Box>
                                        </InlineStack>
                                    </Box> :
                                    <></>
                                }
                            </BlockStack>
                        </Form>
                    </Card>
                </Layout.Section>
            </Layout>
        </Page>
    );
}
