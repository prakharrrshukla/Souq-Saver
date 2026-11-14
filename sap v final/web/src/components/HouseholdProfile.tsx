import type { Plan } from '../../../server/src/contract.ts';

type Household = NonNullable<Plan['insights']['household']>;

/** v2: how the AI engine describes this household, learned only from its Careem order history. */
export function HouseholdProfile({ household }: { household?: Household }) {
  if (!household || !household.summary) return null;
  const groups: [string, string[]][] = [
    ['Routines', household.routines],
    ['Loves', household.likes],
    ['Tried and dropped', household.dislikes],
    ['Switched', household.switches],
  ];
  return (
    <section className="card profile" aria-label="What the AI learned about this household">
      <h2>What the AI learned about this household</h2>
      <p className="profile-summary">{household.summary}</p>
      <div className="insights">
        {groups.filter(([, list]) => list.length > 0).map(([title, list]) => (
          <div key={title}>
            <h3>{title}</h3>
            <ul className="profile-list">
              {list.slice(0, 4).map((line) => <li key={line}>{line}</li>)}
            </ul>
          </div>
        ))}
      </div>
      <p className="muted small">Learned by {household.model} from the Careem order history (sample data). Every total is checked by the calculator, not the AI.</p>
    </section>
  );
}
