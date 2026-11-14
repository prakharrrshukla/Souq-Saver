import type { Cart } from '../../../server/src/contract.ts';
import { aed } from '../api';

/** Shown after Approve. There is no pay or checkout button anywhere in this app. */
export function CartResult({ cart }: { cart: Cart }) {
  return (
    <section className="card cart-result" aria-label="Cart result" role="status">
      <h2>Cart ready at {cart.storeName}</h2>
      <p className="cart-total">
        Total <strong>{aed(cart.total)}</strong>
        {cart.promo && <span className="tag success">promo {cart.promo.code} saves {aed(cart.promo.saving)}</span>}
      </p>
      <p className="muted small">
        Subtotal {aed(cart.subtotal)} + delivery {aed(cart.deliveryFee)} + service {aed(cart.serviceFee)}
        {cart.promo ? ` − ${cart.promo.code} ${aed(cart.promo.saving)}` : ''} · basket {cart.basketId}
      </p>
      <p className="notice success"><strong>Nothing has been charged.</strong> Checkout always needs you, in the Careem app.</p>
      {cart.sampleData && <p className="muted small">Sample: the sandbox cart keeps no state, so the subtotal is the planned basket; fees and promo come from Careem's price call.</p>}
    </section>
  );
}
