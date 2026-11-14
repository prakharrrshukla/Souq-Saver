// The Careem-style Home screen: mint promo area (search + offer banner), two rows of service tiles,
// the Souq Saver card right after them, then payment cards and the rest of Home. Only the Souq Saver
// card does something; everything else is the familiar surrounding of the super app.
import { useState } from 'react';
import type { Plan } from '../../../server/src/contract.ts';
import { aed } from '../api';
import { Basket, IconAccount, IconCar, IconHome, IconOffers, IconPin, IconPlus, IconSearch, IconWallet, TILE_ART } from './art';

const TILES = [['Rides', 'Food', 'Quik', 'Pay'], ['Hala Taxi', 'Shops', 'Box', 'Home & Spa']];

const OFFERS = [
  { title: 'Groceries on a budget', text: 'Souq Saver plans your weekly basket', tone: 'green' },
  { title: 'Careem Quik', text: 'Groceries delivered in minutes', tone: 'blue' },
  { title: 'Weekend offers', text: 'Deals from Careem Shops near you', tone: 'orange' },
];

type Props = { name: string; area: string; plan: Plan | null; onOpenSouq: () => void };

export function Home({ name, area, plan, onOpenSouq }: Props) {
  const [slide, setSlide] = useState(0);
  const chosen = plan?.stores.find((s) => s.chosen);

  return (
    <>
      <div className="home-scroll">
        <section className="promo">
          <div className="promo-top">
            <span className="promo-place"><IconPin /> Home · {area}</span>
            <span className="avatar" aria-label={name}>{name.slice(0, 1)}</span>
          </div>
          <label className="search">
            <IconSearch />
            <input readOnly placeholder="Discover places" aria-label="Discover places" />
          </label>
          <div className="offers" onScroll={(e) => setSlide(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}>
            {OFFERS.map((o) => (
              <div key={o.title} className={`offer offer-${o.tone}`}>
                <strong>{o.title}</strong>
                <span>{o.text}</span>
              </div>
            ))}
          </div>
          <div className="dots" aria-hidden="true">
            {OFFERS.map((o, i) => <span key={o.title} className={i === slide ? 'dot-on' : ''} />)}
          </div>
        </section>

        <section className="surface">
          {TILES.map((row) => (
            <div key={row[0]} className="tiles">
              {row.map((label) => (
                <div key={label} className="tile">
                  <span className="tile-art">{TILE_ART[label]}</span>
                  <span className="tile-label">{label}</span>
                </div>
              ))}
            </div>
          ))}

          <button className="ss-card" onClick={onOpenSouq} aria-label="Souq Saver: plan my basket">
            <span className="ss-card-art"><Basket /></span>
            <span className="ss-card-text">
              <strong>Souq Saver</strong>
              <span>Plan your weekly groceries around your budget</span>
              {plan && chosen && <span className="ss-card-status">Your basket: {aed(plan.estTotal)} at {chosen.name}</span>}
              <span className="ss-cta">{plan ? 'Open my basket' : 'Plan my basket'}</span>
            </span>
          </button>

          <div className="pay-row">
            <div className="pay-card"><IconWallet /><span className="pay-label">Balance</span><strong>AED 125.50</strong></div>
            <div className="pay-card"><IconPlus /><span className="pay-label">Add card</span><strong>New card</strong></div>
            <div className="pay-card"><IconCar /><span className="pay-label">Salik</span><strong>Top up</strong></div>
          </div>

          <h3 className="home-heading">Go further with Careem</h3>
          <div className="more">
            <div className="more-card more-plus"><strong>Careem Plus</strong><span>Membership benefits across the app</span></div>
            <div className="more-card more-rewards"><strong>Rewards</strong><span>Earn points on every ride and order</span></div>
          </div>
          <h3 className="home-heading">Recently used</h3>
          <div className="recent">
            {['Quik', 'Food', 'Rides'].map((label) => (
              <div key={label} className="recent-item"><span className="tile-art small">{TILE_ART[label]}</span>{label}</div>
            ))}
          </div>
        </section>
      </div>

      <nav className="tabbar" aria-label="Main">
        <span className="tab tab-on"><IconHome />Home</span>
        <span className="tab"><IconOffers />Offers</span>
        <span className="tab"><IconWallet />Pay</span>
        <span className="tab"><IconAccount />Account</span>
      </nav>
    </>
  );
}
