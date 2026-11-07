import { useEffect, useState } from 'react';
import { profileService } from '../services';
import { useAsync } from '../hooks/useAsync';
import { useDocumentTitle } from '../hooks/useApp';
import { StudentCard } from '../components/Cards';
import { EmptyState, ErrorState, LoadingState, PageHeader } from '../components/ui';

export default function Students() {
  useDocumentTitle('Discover Students');
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [availableOnly, setAvailableOnly] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q), 250);
    return () => clearTimeout(t);
  }, [q]);

  const { data, error, loading, reload } = useAsync(
    () => profileService.listStudents({ q: debounced, availableOnly }), `${debounced}|${availableOnly}`);

  return (
    <main className="marketplace">
      <PageHeader tagline="THE COMMUNITY" title="Discover Students" text="Search by name, skill, program or department." />
      <section className="market-controls">
        <label htmlFor="stu-search" className="sr-only">Search students</label>
        <input id="stu-search" type="search" placeholder="Try “React”, “Python” or a name…" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="filter-grid filter-grid-single">
          <label className="check"><input type="checkbox" checked={availableOnly} onChange={(e) => setAvailableOnly(e.target.checked)} /> Available students only</label>
        </div>
      </section>
      <section className="services-section">
        <div className="results-heading"><h2>Students</h2><span aria-live="polite">{data ? `${data.length} found` : ''}</span></div>
        {error && <ErrorState error={error} onRetry={reload} />}
        {!data && !error && loading && <LoadingState />}
        {data && data.length > 0 && <div className="services-grid">{data.map((s) => <StudentCard key={s.id} student={s} />)}</div>}
        {data && data.length === 0 && <EmptyState title="No students found" text="Try a different skill or name." />}
      </section>
    </main>
  );
}
