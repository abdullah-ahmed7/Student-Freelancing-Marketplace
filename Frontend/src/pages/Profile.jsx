import { profileService } from '../services';
import { useAsync } from '../hooks/useAsync';
import { useDocumentTitle } from '../hooks/useApp';
import { Button, ErrorState, LoadingState } from '../components/ui';
import { PortfolioList, ProfileView } from './StudentProfile';

export default function Profile() {
  useDocumentTitle('My Profile');
  const me = useAsync(() => profileService.getMine(), 'me');
  const pf = useAsync(() => profileService.listPortfolio(), 'pf');

  if (me.error) return <main className="page-wrap"><ErrorState error={me.error} onRetry={me.reload} /></main>;
  if (!me.data) return <LoadingState />;

  return (
    <main className="page-wrap">
      <ProfileView student={me.data} isOwner />
      <div className="inline-actions">
        <Button to="/profile/edit">Edit profile</Button>
        <Button to={`/students/${me.data.id}`} variant="secondary">View public profile</Button>
        {!me.data.verified && <Button to="/verify" variant="secondary">Verify account</Button>}
      </div>
      <h2 className="section-h2">Portfolio</h2>
      {pf.data && pf.data.length > 0 ? <PortfolioList items={pf.data} /> : <p className="muted-text">No portfolio items yet.</p>}
      <div className="inline-actions"><Button to="/portfolio" variant="secondary">Manage portfolio</Button></div>
    </main>
  );
}
