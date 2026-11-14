import type { StoreQuote } from '../../../server/src/contract.ts';
import { aed } from '../api';

export function StoreComparison({ stores }: { stores: StoreQuote[] }) {
  return (
    <section className="card" aria-label="Store comparison">
      <h2>Store comparison</h2>
      <ul className="rows">
        {stores.map((store) => (
          <li key={store.merchantId} className={store.chosen ? 'row chosen' : 'row'}>
            <div className="row-main">
              <strong>{store.name}</strong>
              {store.chosen && <span className="tag success">Cheapest</span>}
              {store.missing.length > 0 && <span className="tag danger">Missing {store.missing.join(', ')}</span>}
              <div className="muted small">
                {store.type === 'quik' ? 'Careem Quik' : 'Careem Shops'} · items {aed(store.itemsTotal)} + delivery {aed(store.deliveryFee)} + service {aed(store.serviceFee)}
              </div>
            </div>
            <div className={store.valid ? 'amount' : 'amount muted'}>{aed(store.estTotal)}</div>
          </li>
        ))}
      </ul>
      <p className="muted small">Whole basket at one store, fees included. A store missing water or a staple is not chosen.</p>
    </section>
  );
}
