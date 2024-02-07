// @ts-check

/**
* @typedef {import("../generated/api").RunInput} RunInput
* @typedef {import("../generated/api").FunctionRunResult} FunctionRunResult
*/

/**
* @type {FunctionRunResult}
*/
const NO_CHANGES = {
  operations: [],
};

/**
* @param {RunInput} input
* @returns {FunctionRunResult}
*/
export function run(input) {
  // Define a type for your configuration, and parse it from the metafield
  /**
  * @type {{
  *   paymentMethodName: string,
  *   cartTotal: number,
  * }}
  */
  const configuration = JSON.parse(
    input?.paymentCustomization?.metafield?.value ?? "{}"
  );
  if (!configuration.paymentMethodName || configuration.cartTotal == null) {
    console.error("Configuration is incomplete.");
    return NO_CHANGES;
  }

  const cartTotal = parseFloat(input.cart.cost.totalAmount.amount ?? "0.0");
  // Adjusted logic: Hide the payment method if the cart total is less than the configured amount
  if (cartTotal < configuration.cartTotal) {
    const hidePaymentMethod = input.paymentMethods
      .find(method => method.name.includes(configuration.paymentMethodName));

    if (!hidePaymentMethod) {
      console.error("Configured payment method not found.");
      return NO_CHANGES;
    }

    return {
      operations: [{
        hide: {
          paymentMethodId: hidePaymentMethod.id
        }
      }]
    };
  }

  console.log("Cart total is high enough, no action taken.");
  return NO_CHANGES;
};
