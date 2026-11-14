// The Souq Saver screen inside a phone: a Careem-style chat with the composer pinned at the bottom, and the
// planner cards. Totals and savings are shown exactly as the backend's plan gives them. What the AI learned
// about the household is shown below the phone (Phones.tsx), not in it.
import type { Language } from '../../../server/src/contract.ts';
import { aed } from '../api';
import { Basket } from '../components/Basket';
import { CartResult } from '../components/CartResult';
import { Insights } from '../components/Insights';
import { StoreComparison } from '../components/StoreComparison';
import { IconBack } from './art';
import { ChatMessages, Composer } from './PhoneChat';
import type { Planner } from './usePlanner';

const LANGUAGES: [Language, string][] = [['en', 'EN'], ['ar', 'العربية'], ['hi', 'हिन्दी'], ['ur', 'اردو'], ['tl', 'TL']];

type Props = { name: string; area: string; planner: Planner; blocked?: string; sampleData: boolean; onBack: () => void };

export function SouqSaverScreen({ name, area, planner: p, blocked, sampleData, onBack }: Props) {
  const plan = p.plan;
  const chosen = plan?.stores.find((s) => s.chosen);
  return (
    <div className="ss-screen">
      <header className="ss-top">
        <button className="ss-back" onClick={onBack} aria-label="Back to Home"><IconBack /></button>
        <div className="ss-title">
          <strong>Souq Saver</strong>
          <span>{name} · {area}</span>
        </div>
        <select className="ss-lang" value={p.language} onChange={(e) => p.setLanguage(e.target.value as Language)} aria-label="Reply language">
          {LANGUAGES.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
        </select>
      </header>

      <div className="ss-body">
        {sampleData && <p className="ss-sample">Sample data in Careem's format, via the Careem MCP sandbox</p>}

        {plan && (
          <section className="ss-summary" aria-label="This week's basket">
            <div className="ss-summary-main">
              <span>Estimated total{chosen ? ` at ${chosen.name}` : ''}</span>
              <strong>{aed(plan.estTotal)}</strong>
            </div>
            <dl>
              <div><dt>Budget</dt><dd>{aed(plan.budget.aed)}{plan.budget.cutPercent !== undefined ? ` (−${plan.budget.cutPercent}%)` : ''}</dd></div>
              <div><dt>Last week</dt><dd>{aed(plan.lastWeekTotal)}</dd></div>
              <div><dt>Monthly saving</dt><dd>~{aed(plan.monthlySavingEstimate)}</dd></div>
            </dl>
            <span className={plan.withinBudget ? 'ss-verdict ok' : 'ss-verdict over'}>
              {plan.withinBudget ? 'Within budget' : `Over budget by ${aed(plan.shortfall)}`}
            </span>
            {p.cart && <span className="ss-verdict ok">Cart ready: {aed(p.cart.total)}, nothing charged</span>}
          </section>
        )}

        <ChatMessages lines={p.lines} busy={p.busy} />

        {plan && <StoreComparison stores={plan.stores} routing={plan.routing} />}
        {plan && <Basket plan={plan} approving={p.approving} approved={!!p.cart} onApprove={p.onApprove} blocked={blocked} />}
        {p.cart && <CartResult cart={p.cart} />}
        {plan && <Insights insights={plan.insights} />}

        {p.lines.length > 0 && <button className="text-button ss-new" onClick={p.newChat} disabled={p.busy || p.approving}>Start a new chat</button>}
      </div>

      <Composer input={p.input} onInput={p.setInput} budget={p.budget} onBudget={p.setBudget} busy={p.busy} onSend={p.send} formError={p.formError} blocked={blocked} />
    </div>
  );
}
