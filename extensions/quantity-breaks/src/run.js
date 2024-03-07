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
  discountApplicationStrategy: DiscountApplicationStrategy.First,
  discounts: [],
};

/**
* @param {RunInput} input
* @returns {FunctionRunResult}
*/
export function run(input) {
  // Define a type for your configuration, and parse it from the metafield
  /**
  * @type {{
  *   quantity: number
  *   percentage: number
  * }}
  */
  const configuration = JSON.parse(
    input?.discountNode?.metafield?.value ?? "{}"
  );
  configuration.tiers.map(tier=>{
    if (!tier.quantity || !tier.percentage) {
      return EMPTY_DISCOUNT;
    }
    return null
  })

 let discountsToApply =[]
  const targets = input.cart.lines
    // Use the configured quantity instead of a hardcoded value
    // 
    .forEach((line) => {
      if (line.merchandise.__typename !== "ProductVariant") {
        return;
      }
      const applicableDiscount = configuration.tiers
      .filter(config => line.quantity >= config.quantity && line.merchandise.product.inAnyCollection)
      .sort((a, b) => b.quantity - a.quantity) // Sort to get the highest quantity first.
      .shift();

      if (applicableDiscount) {
        if(applicableDiscount.quantity != 0){
  
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
          "message": "BUY " + applicableDiscount.quantity +  " GET " + applicableDiscount.percentage.toString() + "% OFF"
        });
      }
    }
    } 
      
      )

  

  if (!discountsToApply.length) {
    console.error("No cart lines qualify for volume discount.");
    return EMPTY_DISCOUNT;
  }
 
  
console.log(JSON.stringify(discountsToApply),'discountsToApply')
  return {
    discounts: discountsToApply,
    discountApplicationStrategy: DiscountApplicationStrategy.First
  };
};