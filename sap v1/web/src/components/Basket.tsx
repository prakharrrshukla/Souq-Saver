import type { Plan, PlanItem } from '../../../server/src/contract.ts';
import { aed } from '../api';

const CHIP: Record<PlanItem['reason'], string> = { kept: 'Kept', swapped: 'Swapped', reduced: 'Reduced', deferred: 'Not due', cut: 'Cut' };

function chipLabel(item: PlanItem) {
  return item.reason === 'deferred' && item.nextDue ? `Not due till ${item.nextDue}` : CHIP[item.reason];
}

type Props = { plan: Plan; approving: boolean; approved: boolean; onApprove: () => void };

export function Basket({ plan, approving, approved, onApprove }: Props) {
  const store = plan.stores.find((s) => s.chosen);
  return (
    <section className="card" aria-label="Basket">
      <h2>Basket {store && <span className="muted">at {store.name}</span>}</h2>
      <ul className="rows">
        {plan.items.map((item) => (
          <li key={`${item.itemId}-${item.reason}`} className={item.lineTotal > 0 ? 'row' : 'row excluded'} title={item.note}>
            <div className="row-main">
              <span className="item-name">{item.qty} × {item.name}</span>
              <span className={`chip ${item.reason}`}>{chipLabel(item)}</span>
              <span className="tier">{item.tier}</span>
              <div className="muted small">{item.note}{item.replaces ? ` (replaces ${item.replaces})` : ''}</div>
            </div>
            <div className="amount">{item.lineTotal > 0 ? aed(item.lineTotal) : '—'}</div>
          </li>
        ))}
      </ul>

      <dl className="totals">
        <div><dt>Last week</dt><dd>{aed(plan.lastWeekTotal)}</dd></div>
        <div><dt>Budget{plan.budget.cutPercent !== undefined ? ` (cut ${plan.budget.cutPercent}%)` : ''}</dt><dd>{aed(plan.budget.aed)}</dd></div>
        <div className="total"><dt>Estimated total</dt><dd>{aed(plan.estTotal)}</dd></div>
        <div><dt>Monthly saving (estimate)</dt><dd>{aed(plan.monthlySavingEstimate)}</dd></div>
      </dl>
      {!plan.withinBudget && plan.shortfall > 0 && (
        <p className="notice warning">Over budget by {aed(plan.shortfall)}. Water and staples are never cut.</p>
      )}

      <div className="approve">
        <span className="muted">Nothing is charged. Approve only builds the cart.</span>
        <button className="primary" onClick={onApprove} disabled={approving || approved || !plan.approvalToken}>
          {approving ? 'Building cart…' : approved ? 'Cart built' : 'Approve basket'}
        </button>
      </div>
    </section>
  );
}
