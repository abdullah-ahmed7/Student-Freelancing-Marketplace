import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { categoryService, serviceService } from '../services';
import { useAsync } from '../hooks/useAsync';
import { useDocumentTitle } from '../hooks/useApp';
import { ServiceCard } from '../components/Cards';
import SearchFilters, { SortControl } from '../components/SearchFilters';
import { Button, EmptyState, ErrorState, LoadingState, PageHeader, Pagination } from '../components/ui';
import { PAGE_SIZE } from '../utils/constants';

// Local text state, debounced into the URL. Remounted (via key) when filters are cleared.
function SearchBox({ initial, onSearch }) {
  const [text, setText] = useState(initial);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return undefined; }
    const t = setTimeout(() => onSearch(text), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);
  return (
    <>
      <label htmlFor="market-search" className="sr-only">Search services</label>
      <input id="market-search" type="search" placeholder="Search services, skills or sellers..."
        value={text} onChange={(e) => setText(e.target.value)} />
    </>
  );
}

export default function Marketplace() {
  useDocumentTitle('Explore Services');
  const [params, setParams] = useSearchParams();
  const urlQ = params.get('q') || '';
  const [resetKey, setResetKey] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  function update(patch, keepPage = false) {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    if (!keepPage) next.delete('page');
    setParams(next, { replace: true });
  }

  const cats = useAsync(() => categoryService.list(), 'cats');
  const page = Number(params.get('page')) || 1;
  const sort = params.get('sort') || 'relevance';
  const query = {
    q: urlQ, categoryId: params.get('category') || '', min: params.get('min'), max: params.get('max'),
    maxDelivery: params.get('delivery'), minRating: params.get('rating'), availableOnly: params.get('available') === '1',
    sort, page, pageSize: PAGE_SIZE,
  };
  const { data, error, loading, reload } = useAsync(() => serviceService.search(query), JSON.stringify(query));

  const activeFilters = ['q', 'category', 'min', 'max', 'delivery', 'rating', 'available'].some((k) => params.get(k));
  const clear = () => { setResetKey((k) => k + 1); setParams({}, { replace: true }); };

  return (
    <main className="marketplace">
      <PageHeader tagline="STUDENT SKILLS, REAL OPPORTUNITIES" title="Explore Services"
        text="Find talented students and the right service for your needs." />

      <section className="market-controls">
        <SearchBox key={resetKey} initial={urlQ} onSearch={(v) => update({ q: v })} />

        <div className="controls-bar">
          <button type="button" className="filter-toggle" aria-expanded={showFilters} onClick={() => setShowFilters(!showFilters)}>
            {showFilters ? 'Hide filters' : 'Show filters'}
          </button>
          <SortControl value={sort} onChange={(v) => update({ sort: v === 'relevance' ? '' : v })} />
        </div>

        {(showFilters || cats.data) && (
          <div className={showFilters ? 'filters-wrap open' : 'filters-wrap'}>
            <SearchFilters params={params} categories={cats.data || []} onChange={(p) => update(p)} onClear={clear} />
          </div>
        )}
      </section>

      <section className="services-section">
        <div className="results-heading">
          <h2>Available Services</h2>
          <span aria-live="polite">{data ? `${data.total} service${data.total === 1 ? '' : 's'} found` : ''}</span>
        </div>

        {error && <ErrorState error={error} onRetry={reload} />}
        {!data && !error && loading && <LoadingState label="Finding services…" />}
        {data && data.items.length > 0 && (
          <>
            <div className={`services-grid ${loading ? 'is-stale' : ''}`}>
              {data.items.map((s) => <ServiceCard key={s.id} service={s} />)}
            </div>
            <Pagination page={data.page} total={data.total} pageSize={data.pageSize} onChange={(p) => update({ page: String(p) }, true)} />
          </>
        )}
        {data && data.items.length === 0 && (
          <EmptyState title="No services found" text="Try another search, or loosen your filters."
            action={activeFilters ? <Button onClick={clear}>Clear Filters</Button> : null} />
        )}
      </section>
    </main>
  );
}
