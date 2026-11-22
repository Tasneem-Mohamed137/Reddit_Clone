import { Link } from 'react-router-dom';
import { Snoo } from '../components/ui/Logo';

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center gap-3 py-24 text-center">
      <Snoo size={72} />
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="text-muted">Sorry, there is nothing here.</p>
      <Link to="/" className="rounded-full bg-btn px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90">
        Back to Home
      </Link>
    </div>
  );
}