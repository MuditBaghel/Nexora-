import { Link } from 'react-router-dom';
import { ArrowLeftIcon } from '../components/common/icons';

export default function NotFound() {
  return (
    <div className="empty-state" style={{ minHeight: '60vh' }}>
      <span className="empty-icon">404</span>
      <h3>Page not found</h3>
      <p>The page you're looking for doesn't exist or has been moved.</p>
      <Link to="/dashboard" className="btn btn-primary">
        <ArrowLeftIcon /> Back to Dashboard
      </Link>
    </div>
  );
}
