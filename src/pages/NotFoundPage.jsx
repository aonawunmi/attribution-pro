import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-4">
      <p className="text-6xl font-bold text-slate-700">404</p>
      <p className="text-lg">Page not found</p>
      <Link to="/" className="flex items-center gap-2 text-[#d4a843] hover:text-[#e0b84e] text-sm font-medium">
        <Home className="w-4 h-4" /> Back to Dashboard
      </Link>
    </div>
  );
}
