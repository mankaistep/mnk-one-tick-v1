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
    Icon
} from "@shopify/polaris";
import {
    XSmallIcon
  } from '@shopify/polaris-icons';
import { useState } from "react";

export const loader = async ({ request }) => { return null; }

export const action = async ({ request }) => { return null; }

export default function Index() {
    const appBridge = useAppBridge();

    const [oneTickContent, setOneTickContent] = useState("test");
    const [oneTickVariant, setOneTickVariant] = useState({
        displayName: 'Selling Plans Ski Wax - Sample Selling Plans Ski Wax',
        image: {
            originalSrc: "https://cdn.shopify.com/s/files/1/0710/8093/5647/files/sample-normal-wax.png?v=1720837385"
        }
    });

    return (
        <Page title="Settings">
            <Layout>
                <Layout.Section>
                    <Card>
                        <BlockStack gap={200}>
                            <Text variant="headingSm">General settings</Text>
                            <Box width="100%">
                                <TextField label="One-tick content" placeholder="Add shipping protection ($5)" value={oneTickContent} onChange={(newValue) => {
                                    setOneTickContent(newValue);
                                }}/>
                            </Box>
                            <Box width="100%">
                                <TextField label="Select one-tick product" placeholder="Search product" onFocus={async () => {
                                    const selectedVariants = await appBridge.resourcePicker({
                                        type: "variant",
                                        action: "select"
                                    })
                                    if (selectedVariants.length > 0) {
                                        const selectedVariant = selectedVariants[0];
                                        console.log('hihi', selectedVariant);
                                    }
                                }}/>
                            </Box>
                            {oneTickVariant ?
                                <Box borderWidth="025" borderRadius="100" borderColor="border-disabled">
                                    <InlineStack>
                                        <Box borderWidth="025" borderRadius="100" borderColor="border-disabled" height="100%">
                                            <img alt="product img" src={oneTickVariant.image.originalSrc} width="40px" height="100%"></img>
                                        </Box>
                                        <Text>{oneTickVariant.displayName}</Text>
                                        <Icon source={XSmallIcon}/>
                                    </InlineStack>
                                </Box> :
                                <></>
                            }
                        </BlockStack>
                    </Card>
                </Layout.Section>
            </Layout>
        </Page>
    );
}
