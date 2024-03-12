import { useState, useEffect } from 'react';
import { json } from "@remix-run/node";
import { useForm, useField } from "@shopify/react-form";
import { useAppBridge } from "@shopify/app-bridge-react";
import { Redirect } from "@shopify/app-bridge/actions";
import { CurrencyCode } from "@shopify/react-i18n";
// import Metafields from '../components/Metafields.jsx';
import {
    Form,
    useActionData,
    useLoaderData,
    useNavigation,
    useSubmit,
} from "@remix-run/react";
import {
    ActiveDatesCard,
    CombinationCard,
    DiscountClass,
    DiscountMethod,
    MethodCard,
    DiscountStatus,
    RequirementType,
    SummaryCard,
    UsageLimitsCard,
    onBreadcrumbAction,
} from "@shopify/discount-app-components";
import {
    Banner,
    Card,
    Button,
    Text,
    Layout,
    Page,
    PageActions,
    TextField,
    BlockStack,
    Select
} from "@shopify/polaris";

import shopify from "../shopify.server";

export const loader = async ({ params, request }) => {

    const { admin } = await shopify.authenticate.admin(request);


    const { id } = params;

    const discountResponse = await admin.graphql(
        `#graphql
        query GetDiscount($id: ID!) {
          discountNode(id: $id) {
            id
            configurationField: metafield(
              namespace: "$app:volume-discount"
              key: "function-configuration"
            ) {
              id
              value
            }
            discount {
              __typename
              ... on DiscountAutomaticApp {
                title
                discountClass
                combinesWith {
                  orderDiscounts
                  productDiscounts
                  shippingDiscounts
                }
                startsAt
                endsAt
              }
              ... on DiscountCodeApp {
                title
                discountClass
                combinesWith {
                  orderDiscounts
                  productDiscounts
                  shippingDiscounts
                }
                startsAt
                endsAt
                usageLimit
                appliesOncePerCustomer
                codes(first: 1) {
                  nodes {
                    code
                  }
                }
              }
            }
          }
          collections(first:  50) {
        edges {
          node {
            id
            handle
           
          }
        }
      }
        }`,
        {
            variables: {
                id: `gid://shopify/DiscountNode/${id}`,
            },
        }
    );

    const responseJson = await discountResponse.json();


    if (
        !responseJson.data.discountNode ||
        !responseJson.data.discountNode.discount
    ) {
        return json({ discount: null });
    }

    const method =
        responseJson.data.discountNode.discount.__typename === "DiscountCodeApp"
            ? DiscountMethod.Code
            : DiscountMethod.Automatic;
    const {
        title,
        codes,
        combinesWith,
        usageLimit,
        appliesOncePerCustomer,
        startsAt,
        endsAt,
    } = responseJson.data.discountNode.discount;
    const configuration = JSON.parse(
        responseJson.data.discountNode.configurationField.value
    );

    const discount = {
        title,
        method,
        code: codes?.nodes[0]?.code ?? "",
        combinesWith,
        usageLimit: usageLimit ?? null,
        appliesOncePerCustomer: appliesOncePerCustomer ?? false,
        startsAt,
        endsAt,
        configuration: {
            ...configuration,
            metafieldId: responseJson.data.discountNode.configurationField.id,
        },
    };
    const collections = responseJson.data.collections.edges

    return json({ discount, collections, responseJson });

}

// This is a server-side action that is invoked when the form is submitted.
// It makes an admin GraphQL request to create a discount.
export const action = async ({ params, request }) => {
    const { functionId, id } = params;
    const { admin } = await shopify.authenticate.admin(request);
    const formData = await request.formData();
    console.log('formData', formData)

    const {
        title,
        method,
        code,
        combinesWith,
        usageLimit,
        appliesOncePerCustomer,
        startsAt,
        endsAt,
        configuration,
    } = JSON.parse(formData.get("discount"));

    const baseDiscount = {
        functionId,
        title,
        combinesWith,
        startsAt: new Date(startsAt),
        endsAt: endsAt && new Date(endsAt),
    };

    if (method === DiscountMethod.Code) {
        const baseCodeDiscount = {
            ...baseDiscount,
            title: code,
            code,
            usageLimit,
            appliesOncePerCustomer,
        };

        const response = await admin.graphql(
            `#graphql
            mutation UpdateCodeDiscount($id: ID!, $discount: DiscountCodeAppInput!) {
              discountUpdate: discountCodeAppUpdate(id: $id, codeAppDiscount: $discount) {
                userErrors {
                  code
                  message
                  field
                }
              }
            }`,
            {
                variables: {
                    id: `gid://shopify/DiscountCodeApp/${id}`,
                    discount: {
                        ...baseCodeDiscount,
                        metafields: [
                            {
                                id: configuration.metafieldId,
                                namespace: "$app:volume-discount",
                                key: "function-configuration",
                                type: "json",
                                value: JSON.stringify({
                                    selectedCollectionIds: "gid://shopify/Collection/410674364673",


                                    quantity: configuration.quantity,
                                    percentage: configuration.percentage,
                                }),
                            },
                        ],
                    },
                },
            }
        );

        const responseJson = await response.json();
        const errors = responseJson.data.discountUpdate?.userErrors;
        return json({ errors });
    } else {
        const response = await admin.graphql(
            `#graphql
            mutation UpdateAutomaticDiscount($id: ID!, $discount: DiscountAutomaticAppInput!) {
              discountUpdate: discountAutomaticAppUpdate(id: $id, automaticAppDiscount: $discount) {
                userErrors {
                  code
                  message
                  field
                }
              }
            }`,
            {
                variables: {
                    id: `gid://shopify/DiscountAutomaticApp/${id}`,
                    discount: {
                        ...baseDiscount,
                        metafields: [
                            {
                                id: configuration.metafieldId,
                                type: "json",
                                value: JSON.stringify(
                                    {
                                        selectedCollectionIds: configuration.selectedCollectionIds,
                                        tiers: [
                                            {
                                                quantity: configuration.quantity,
                                                percentage: configuration.percentage,
                                            },
                                            {
                                                quantity: configuration.quantity_2,
                                                percentage: configuration.percentage_2,
                                            },
                                            {
                                                quantity: configuration.quantity_3,
                                                percentage: configuration.percentage_3,
                                            },
                                            {
                                                quantity: configuration.quantity_4,
                                                percentage: configuration.percentage_4,
                                            },
                                        ]
                                    },
                                ),
                            },
                        ],
                    },
                },
            }
        );

        const responseJson = await response.json();
        const errors = responseJson.data.discountUpdate?.userErrors;
        return json({ errors });
    }

};

// This is the React component for the page.
export default function VolumeNew() {
    const { discount, collections } = useLoaderData()
    const { metafieldId } = discount.configuration;
    const tiers = discount.configuration.tiers.filter(tier => tier.quantity > 0)


    const myCollections = collections.map(node => {
        return { label: node.node.handle, value: node.node.id }
    })

    const submitForm = useSubmit();
    const actionData = useActionData();
    const navigation = useNavigation();
    const app = useAppBridge();

    const isLoading = navigation.state === "submitting";
    const currencyCode = CurrencyCode.Cad;
    const submitErrors = actionData?.errors || [];
    const redirect = Redirect.create(app);

    useEffect(() => {
        if (actionData?.errors.length === 0) {
            redirect.dispatch(Redirect.Action.ADMIN_SECTION, {
                name: Redirect.ResourceType.Discount,
            });
        }
    }, [actionData]);



    const {
        fields: {
            discountTitle,
            discountCode,
            discountMethod,
            combinesWith,
            requirementType,
            requirementSubtotal,
            requirementQuantity,
            usageLimit,
            appliesOncePerCustomer,
            startDate,
            endDate,
            configuration,
            selectedCollection
        },
        submit,
    } = useForm({
        fields: {
            discountTitle: useField(discount.title),
            discountMethod: useField(discount.method),
            discountCode: useField(discount.code),
            combinesWith: useField(discount.combinesWith),
            requirementType: useField(RequirementType.None),
            requirementSubtotal: useField("0"),
            requirementQuantity: useField("0"),
            usageLimit: useField(null),
            appliesOncePerCustomer: useField(false),
            startDate: useField(discount.startsAt),
            endDate: useField(discount.endsAt),

            configuration: { // Add quantity and percentage configuration to form data
                quantity: useField(tiers[0]?.quantity),
                percentage: useField(tiers[0]?.percentage),
                quantity_2: useField(tiers[1]?.quantity),
                percentage_2: useField(tiers[1]?.percentage),
                quantity_3: useField(tiers[2]?.quantity),
                percentage_3: useField(tiers[2]?.percentage),
                quantity_4: useField(tiers[3]?.quantity),
                percentage_4: useField(tiers[3]?.percentage),
            },
            selectedCollection: useField(discount.configuration.selectedCollectionIds),

        },
        onSubmit: async (form) => {
            const discount = {

                title: form.discountTitle,
                method: form.discountMethod,
                code: form.discountCode,
                combinesWith: form.combinesWith,
                usageLimit: form.usageLimit == null ? null : parseInt(form.usageLimit),
                appliesOncePerCustomer: form.appliesOncePerCustomer,
                startsAt: form.startDate,
                endsAt: form.endDate,
                configuration: {
                    metafieldId,
                    quantity: parseInt(form.configuration.quantity),
                    percentage: parseFloat(form.configuration.percentage),
                    quantity_2: parseInt(form.configuration.quantity_2),
                    percentage_2: parseFloat(form.configuration.percentage_2),
                    quantity_3: parseInt(form.configuration.quantity_3),
                    percentage_3: parseFloat(form.configuration.percentage_3),
                    quantity_4: parseInt(form.configuration.quantity_4),
                    percentage_4: parseFloat(form.configuration.percentage_4),
                    selectedCollectionIds: selectedCollection.value

                },
            };

            submitForm({ discount: JSON.stringify(discount) }, { method: "post" });
            // console.log('onsubmit form discount', discount)

            return { status: "success" };

        }

    });
    const errorBanner =
        submitErrors.length > 0 ? (
            <Layout.Section>
                <Banner status="critical">
                    <p>There were some issues with your form submission:</p>
                    <ul>
                        {submitErrors.map(({ message, field }, index) => {
                            return (
                                <li key={`${message}${index}`}>
                                    {field.join(".")} {message}
                                </li>
                            );
                        })}
                    </ul>
                </Banner>
            </Layout.Section>
        ) : null;


    const [visibleTiers, setVisibleTiers] = useState(tiers.length || 1);


    // Function to add a new tier
    const addTier = () => {
        setVisibleTiers(current => Math.min(current + 1, 4)); // Assuming a maximum of 4 tiers
    };

    const removeTier = () => {

        if (visibleTiers == 2) {
            configuration.quantity_2.value = 0;
            configuration.percentage_2.value = 0;
        }
        if (visibleTiers == 3) {
            configuration.quantity_3.value = 0;
            configuration.percentage_3.value = 0;
        }
        if (visibleTiers == 4) {
            configuration.quantity_4.value = 0;
            configuration.percentage_4.value = 0;
        }


        setVisibleTiers(current => Math.min(current - 1, 4)); // Assuming a maximum of 4 tiers

    };


    let filteredCollections = myCollections.filter(cls => cls.label != 'frontpage')
    // console.log(filteredCollections, 'filteredCollections')
    return (
        // Render a discount form using Polaris components and the discount app components

        <Page
            title="Create tiered quantity discounts"
            backAction={{
                content: "Discounts",
                onAction: () => onBreadcrumbAction(redirect, true),
            }}
            primaryAction={{
                content: "Save",
                onAction: submit,
                loading: isLoading,
            }}
        >
            <Layout>
                {errorBanner}
                <Layout.Section>
                    <Form method="post">
                        <BlockStack align="space-around" gap="2">
                            <MethodCard
                                title="Quantity Breaks"
                                discountTitle={discountTitle}
                                discountClass={DiscountClass.Product}
                                discountCode={discountCode}
                                discountMethod={discountMethod}
                                discountMethodHidden={true}
                            />
                            <>
                                <Card>
                                    <Select
                                        label="Select a Collection"
                                        options={filteredCollections}
                                        {...selectedCollection}






                                    />

                                </Card>
                                <Card>
                                    <BlockStack gap="3">
                                        <Text variant="headingMd" as="h2">Tier 1</Text>
                                        <TextField label="Minimum quantity" autoComplete="on"  {...configuration.quantity} />
                                        <TextField label="Discount percentage" autoComplete="on"  {...configuration.percentage} suffix="%" />
                                    </BlockStack>
                                </Card>

                                {visibleTiers >= 2 && (
                                    <Card>
                                        <BlockStack gap="3">
                                            <Text variant="headingMd" as="h2">Tier 2 </Text>
                                            <TextField className="test1" label="Minimum quantity" autoComplete="on"  {...configuration.quantity_2} />
                                            <TextField label="Discount percentage" autoComplete="on"  {...configuration.percentage_2} suffix="%" />
                                        </BlockStack>
                                    </Card>
                                )}

                                {visibleTiers >= 3 && (
                                    <Card>
                                        <BlockStack gap="3">
                                            <Text variant="headingMd" as="h2">Tier 3 </Text>
                                            <TextField label="Minimum quantity" autoComplete="on"  {...configuration.quantity_3} />
                                            <TextField label="Discount percentage" autoComplete="on"  {...configuration.percentage_3} suffix="%" />
                                        </BlockStack>
                                    </Card>
                                )}

                                {visibleTiers >= 4 && (
                                    <Card>
                                        <BlockStack gap="3">
                                            <Text variant="headingMd" as="h2">Tier 4 </Text>
                                            <TextField label="Minimum quantity" autoComplete="on"  {...configuration.quantity_4} />
                                            <TextField label="Discount percentage" autoComplete="on"  {...configuration.percentage_4} suffix="%" />
                                        </BlockStack>
                                    </Card>
                                )}

                                <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', margin: '20px' }}>
                                    {visibleTiers < 4 && (
                                        <div>
                                            <Button style={{ width: '100px' }} onClick={addTier} fullWidth={false}>
                                                Add Tier
                                            </Button>
                                        </div>
                                    )}

                                    {visibleTiers > 1 && (
                                        <div>
                                            <Button style={{ width: '100px' }} onClick={removeTier} fullWidth={false}>
                                                Remove Tier
                                            </Button>
                                        </div>
                                    )}
                                </div>



                            </>


                            {discountMethod.value === DiscountMethod.Code && (
                                <UsageLimitsCard
                                    totalUsageLimit={usageLimit}
                                    oncePerCustomer={appliesOncePerCustomer}
                                />
                            )}
                            <CombinationCard
                                combinableDiscountTypes={combinesWith}
                                discountClass={DiscountClass.Product}
                                discountDescriptor={"Discount"}
                            />
                            <ActiveDatesCard
                                startDate={startDate}
                                endDate={endDate}
                                timezoneAbbreviation="EST"
                            />
                        </BlockStack>
                    </Form>
                </Layout.Section>
                <Layout.Section secondary>
                    <SummaryCard
                        header={{
                            discountMethod: discountMethod.value,
                            discountDescriptor:
                                discountMethod.value === DiscountMethod.Automatic
                                    ? discountTitle.value
                                    : discountCode.value,
                            appDiscountType: "Volume",
                            isEditing: false,
                        }}
                        performance={{
                            status: DiscountStatus.Scheduled,
                            usageCount: 0,
                            isEditing: false,
                        }}
                        minimumRequirements={{
                            requirementType: requirementType.value,
                            subtotal: requirementSubtotal.value,
                            quantity: requirementQuantity.value,
                            currencyCode: currencyCode,
                        }}
                        usageLimits={{
                            oncePerCustomer: appliesOncePerCustomer.value,
                            totalUsageLimit: usageLimit.value,
                        }}
                        activeDates={{
                            startDate: startDate.value,
                            endDate: endDate.value,
                        }}
                    />
                </Layout.Section>
                <Layout.Section>
                    <PageActions
                        primaryAction={{
                            content: "Save discount",
                            onAction: submit,
                            loading: isLoading,
                        }}
                        secondaryActions={[
                            {
                                content: "Discard",
                                onAction: () => onBreadcrumbAction(redirect, true),
                            },
                        ]}
                    />
                </Layout.Section>
            </Layout>
        </Page>
    );
}
