import { Compass } from 'lucide-react';
import { LinkButton } from '../components/common/Button';

export default function NotFound() {
  return (
    <div className="grid min-h-[70vh] place-items-center bg-canvas px-4">
      <div className="text-center">
        <Compass className="mx-auto size-12 text-muted" aria-hidden />
        <h1 className="mt-4 text-3xl font-extrabold text-ink">Page not found</h1>
        <p className="mt-2 text-muted">That link doesn’t exist in this demo.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <LinkButton to="/">Public website</LinkButton>
          <LinkButton to="/app/dashboard" variant="outline">
            Office dashboard
          </LinkButton>
        </div>
      </div>
    </div>
  );
}
