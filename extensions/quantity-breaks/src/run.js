// @ts-check
import { DiscountApplicationStrategy } from "../generated/api";

/**
* @typedef {import("../generated/api").RunInput} RunInput
* @typedef {import("../generated/api").FunctionRunResult} FunctionRunResult
* @typedef {import("../generated/api").Target} Target
* @typedef {import("../generated/api").ProductVariant} ProductVariant
*/

/**
* @type {FunctionRunResult}
*/
const EMPTY_DISCOUNT = {
  discountApplicationStrategy: DiscountApplicationStrategy.Maximum,
  discounts: [],
};

/**
* Parses the discount configuration from the metafield value.
* @param {string} value - The JSON string from the metafield.
* @returns {Array<{quantity: number, percentage: number}>}
*/
function parseDiscountConfig(value) {
  try {
    const config = JSON.parse(value);
    // Ensure the configuration is in the expected format (array of objects).
    if (Array.isArray(config)) {
      return config;
    }
    console.error("Discount configuration is not an array.");
  } catch (error) {
    console.error("Error parsing discount configuration:", error);
  }
  return [];
}

/**
* @param {RunInput} input
* @returns {FunctionRunResult}
*/
export function run(input) {
  // Extract and parse the discount configurations from the metafield value.
  const discountConfigs = parseDiscountConfig(input?.discountNode?.metafield?.value ?? "[]");

  let discountsToApply = [];

  // Iterate through each cart line to determine applicable discounts.
  input.cart.lines.forEach(line => {
    if (line.merchandise.__typename !== "ProductVariant") {
      return;
    }

    // Find the highest applicable discount for the line based on quantity.
    const applicableDiscount = discountConfigs
      .filter(config => line.quantity >= config.quantity)
      .sort((a, b) => b.quantity - a.quantity) // Sort to get the highest quantity first.
      .shift(); // Take the first element after sorting.

    if (applicableDiscount) {
      discountsToApply.push({
        targets: [{
          productVariant: {
            id: line.merchandise.id,
          },
        }],
        value: {
          percentage: {
            value: applicableDiscount.percentage.toString(),
          },
        },
      });
    }
  });

  // If no discounts to apply, return the default empty discount structure.
  if (discountsToApply.length === 0) {
    return EMPTY_DISCOUNT;
  }

  return {
    discounts: discountsToApply,
    discountApplicationStrategy: DiscountApplicationStrategy.Maximum,
  };
};
