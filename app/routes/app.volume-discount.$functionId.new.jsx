import { useState, useEffect, useMemo } from 'react';
import { json } from "@remix-run/node";
import { useForm, useField } from "@shopify/react-form";
import { useAppBridge } from "@shopify/app-bridge-react";
import { Redirect } from "@shopify/app-bridge/actions";
import { CurrencyCode } from "@shopify/react-i18n";
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

import shopify, { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {

  const { admin } = await authenticate.admin(request)

  const cls = await admin.graphql(`
    #graphql
    query{
      collections(first:  50) {
        edges {
          node {
            id
            handle
           
          }
        }
      }
    }
    
    `)

  const collections = await cls.json()
  return collections

}

// This is a server-side action that is invoked when the form is submitted.
// It makes an admin GraphQL request to create a discount.
export const action = async ({ params, request }) => {
  const { functionId } = params;
  const { admin } = await shopify.authenticate.admin(request);
  const formData = await request.formData();
  const {
    title,
    combinesWith,
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


  const response = await admin.graphql(
    `#graphql
        mutation CreateAutomaticDiscount($discount: DiscountAutomaticAppInput!) {
          discountCreate: discountAutomaticAppCreate(automaticAppDiscount: $discount) {
            userErrors {
              code
              message
              field
            }
          }
        }`,
    {
      variables: {
        discount: {
          ...baseDiscount,
          metafields: [
            {
              namespace: "$app:volume-discount",
              key: "function-configuration",
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
  const errors = responseJson.data.discountCreate?.userErrors;
  return json({ errors });
};

// This is the React component for the page.
export default function VolumeNew() {
  const { data } = useLoaderData()
  const myCollections = data.collections.edges.map(node => {
    return { label: node.node.handle, value: node.node.id }
  })

  const submitForm = useSubmit();
  const actionData = useActionData();
  const navigation = useNavigation();
  const app = useAppBridge();
  const todaysDate = useMemo(() => new Date(), []);

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
      discountTitle: useField(""),
      discountMethod: useField(DiscountMethod.Automatic),
      discountCode: useField(""),
      selectedCollection: useField(''),
      combinesWith: useField({
        orderDiscounts: false,
        productDiscounts: false,
        shippingDiscounts: false,
      }),
      requirementType: useField(RequirementType.None),
      requirementSubtotal: useField("0"),
      requirementQuantity: useField("0"),
      usageLimit: useField(null),
      appliesOncePerCustomer: useField(false),
      startDate: useField(todaysDate),
      endDate: useField(null),

      configuration: { // Add quantity and percentage configuration to form data
        quantity: useField('2'),
        percentage: useField('10'),
        quantity_2: useField('0'),
        percentage_2: useField('0'),
        quantity_3: useField('0'),
        percentage_3: useField('0'),
        quantity_4: useField('0'),
        percentage_4: useField('0'),
        selectedCollection: useField(''),
      }
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

      return { status: "success" };
    },
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


  const [visibleTiers, setVisibleTiers] = useState(1);


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
                    options={myCollections}
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
                      <TextField class="test1" label="Minimum quantity" autoComplete="on"  {...configuration.quantity_2} />
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
