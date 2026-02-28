import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-4">
      <p className="text-6xl font-bold text-slate-300">404</p>
      <p className="text-lg">Page not found</p>
      <Link to="/" className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium">
        <Home className="w-4 h-4" /> Back to Dashboard
      </Link>
    </div>
  );
}
