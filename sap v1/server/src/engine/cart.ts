// Exact price of the approved basket. Pure function.
import type { Cart, Plan } from '../contract.ts';
import { r2 } from './analysis.ts';
import { parseFees } from './stores.ts';

/**
 * The Careem sandbox keeps no state: its cart always holds a fixed basket, whatever we send.
 * So the subtotal is our planned basket (the items sent to create_grocery_cart_with_quantities),
 * while the fees and the automatically applied best promo are read from cart_get_basket_price.
 * total = subtotal + delivery fee + service fee - promo saving. Nothing is ever charged.
 */
export function priceCart(plan: Pick<Plan, 'items' | 'stores'>, cartResponse: any, priceResponse: any, sampleData: boolean): Cart {
  const store = plan.stores.find((s) => s.chosen)!;
  const subtotal = r2(plan.items.reduce((sum, item) => sum + item.lineTotal, 0));
  const { deliveryFee, serviceFee } = parseFees(priceResponse);
  const code = priceResponse?.price?.promo_code?.code as string | undefined;
  const saving = code ? r2(Number(priceResponse.price.total_saving ?? 0)) : 0;
  return {
    merchantId: store.merchantId, storeName: store.name, basketId: String(cartResponse?.data?.basket_id ?? priceResponse?.basket?.id ?? ''),
    subtotal, deliveryFee, serviceFee, promo: code ? { code, saving } : null,
    total: r2(subtotal + deliveryFee + serviceFee - saving), charged: false, sampleData,
  };
}
