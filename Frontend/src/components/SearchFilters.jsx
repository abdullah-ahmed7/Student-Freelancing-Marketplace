import { SORT_OPTIONS } from '../utils/constants';
import { Button } from './ui';

export function SortControl({ value, onChange }) {
  return (
    <label className="sort-control">
      <span>Sort by</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

// Controlled by URL search params so filters are shareable and survive refresh.
export default function SearchFilters({ params, categories, onChange, onClear }) {
  const get = (k) => params.get(k) || '';
  return (
    <div className="filters">
      <div className="filter-row">
        <button type="button" className={`filter-btn ${!get('category') ? 'active' : ''}`} onClick={() => onChange({ category: '' })}>All</button>
        {categories.map((c) => (
          <button key={c.id} type="button" className={`filter-btn ${get('category') === c.id ? 'active' : ''}`}
            aria-pressed={get('category') === c.id} onClick={() => onChange({ category: c.id })}>{c.name}</button>
        ))}
      </div>

      <div className="filter-grid">
        <label>Min price (PKR)
          <input type="number" min="0" inputMode="numeric" value={get('min')} onChange={(e) => onChange({ min: e.target.value })} />
        </label>
        <label>Max price (PKR)
          <input type="number" min="0" inputMode="numeric" value={get('max')} onChange={(e) => onChange({ max: e.target.value })} />
        </label>
        <label>Delivery
          <select value={get('delivery')} onChange={(e) => onChange({ delivery: e.target.value })}>
            <option value="">Any time</option><option value="1">1 day</option><option value="3">Up to 3 days</option>
            <option value="7">Up to 7 days</option><option value="14">Up to 14 days</option>
          </select>
        </label>
        <label>Rating
          <select value={get('rating')} onChange={(e) => onChange({ rating: e.target.value })}>
            <option value="">Any rating</option><option value="4">4★ & up</option><option value="4.5">4.5★ & up</option>
          </select>
        </label>
        <label className="check">
          <input type="checkbox" checked={get('available') === '1'} onChange={(e) => onChange({ available: e.target.checked ? '1' : '' })} />
          Available sellers only
        </label>
        <Button variant="secondary" onClick={onClear}>Clear filters</Button>
      </div>
    </div>
  );
}
