import type { Plan } from '../../../server/src/contract.ts';
import { aed } from '../api';

/** What the history analysis found: rising prices and where the money goes. */
export function Insights({ insights }: { insights: Plan['insights'] }) {
  if (!insights.priceDrift.length && !insights.categorySpend.length) return null;
  return (
    <section className="card" aria-label="Spend and price drift">
      <h2>Spend and price drift</h2>
      {insights.focus && insights.focus.label !== 'mixed' && (
        <p className="notice success">
          Shopping focus: {insights.focus.label === 'fresh'
            ? `fresh produce (${Math.round(insights.focus.freshShare * 100)}% of spend), so fresh produce is treated as essential`
            : `long-shelf-life pantry food (${Math.round((1 - insights.focus.freshShare) * 100)}% of spend), so pantry staples are treated as essential`}
        </p>
      )}
      <div className="insights">
        <div>
          <h3>Prices that went up</h3>
          {insights.priceDrift.length === 0 && <p className="muted small">No item rose more than 5%.</p>}
          <ul className="rows">
            {insights.priceDrift.map((d) => (
              <li key={d.name} className="row"><span className="row-main">{d.name}</span><span className="amount danger-text">+{d.driftPct.toFixed(1)}%</span></li>
            ))}
          </ul>
        </div>
        <div>
          <h3>Weekly spend by category (4-week average)</h3>
          <ul className="rows">
            {insights.categorySpend.map((c) => (
              <li key={c.category} className="row"><span className="row-main">{c.category}</span><span className="amount">{aed(c.weeklyAvg)}</span></li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
