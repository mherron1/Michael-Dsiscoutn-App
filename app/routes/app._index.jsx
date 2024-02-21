import { useEffect } from "react";
import { json } from "@remix-run/node";
import { useActionData, useNavigation, useSubmit } from "@remix-run/react";
import { useNavigate } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  Button,
  BlockStack,
  Box,
  List,
  Link,
  InlineStack,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  await authenticate.admin(request);

  return null;
};


export default function Index() {
  const navigate = useNavigate();

  const handleCreateDiscountClick = () => {
    navigate(`volume-discount/19fdf967-7ef9-453c-8d03-e97fdc3aab6c/new`);
  };

  const handlePaymentRuleClick = () => {
    navigate(`payment-customization/e844ecb1-61aa-4310-b58d-547acf7a666d/new`);
  };
 


  return (
    <Page>
    <ui-title-bar title="Jadepuma Functions">

    </ui-title-bar>
      <BlockStack gap="500">

        <layout>
        <card>

        <div
          style={{
            textAlign: "center",
            backgroundColor: "#ffffff",
            padding: "20px",
            borderRadius: "5px",
            maxWidth: "800px",
            margin: "20px auto",
          }}
        >

          <img style={{width: "150px"}}  src="https://jadepuma.com/cdn/shop/files/JadePuma-logo_400x.svg?v=1682267029"/>


          <div
          style={{
            textAlign: "left",
            backgroundColor: "#ffffff",
            padding: "20px",
            maxWidth: "800px",
            margin: "20px auto",
            backgroundColor: "#e5e5e5",
            borderRadius: "5px"
          }}
        >
          

          <Button onClick={handleCreateDiscountClick}>
              Create Quantity Breaks Discount
          </Button>


          </div>

          <div
          style={{
            textAlign: "left",
            backgroundColor: "#ffffff",
            padding: "20px",
            maxWidth: "800px",
            margin: "20px auto",
            backgroundColor: "#e5e5e5",
            borderRadius: "5px"
          }}
        >
        
          <Button onClick={handlePaymentRuleClick}>
              Create Custom Payment Rule
          </Button>

          </div>


        </div>

        </card>
       </layout>



      </BlockStack>
    </Page>
  );
}
