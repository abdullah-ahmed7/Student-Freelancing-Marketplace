import { serviceService } from '../services';
import { useAsync } from '../hooks/useAsync';
import { useFavorites, useDocumentTitle } from '../hooks/useApp';
import { ServiceCard } from '../components/Cards';
import { Button, EmptyState, ErrorState, LoadingState, PageHeader } from '../components/ui';

export default function Saved() {
  useDocumentTitle('Saved Services');
  const fav = useFavorites();
  // reload when the set of saved ids changes (e.g. unsaving a card)
  const { data, error, reload } = useAsync(() => serviceService.listFavorites(), fav.ids.join(','));

  if (error) return <main className="page-wrap"><ErrorState error={error} onRetry={reload} /></main>;
  if (!data) return <LoadingState />;
  return (
    <main className="marketplace">
      <PageHeader tagline="YOUR SHORTLIST" title="Saved Services" text="Services you bookmarked to look at later." />
      <section className="services-section">
        {data.length === 0
          ? <EmptyState title="Nothing saved yet" text="Tap the heart on a service to save it here." action={<Button to="/marketplace">Explore Services</Button>} />
          : <div className="services-grid">{data.map((s) => <ServiceCard key={s.id} service={s} />)}</div>}
      </section>
    </main>
  );
}
