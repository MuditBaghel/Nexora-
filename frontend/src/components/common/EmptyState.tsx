import { PackageIcon } from './icons';

interface Props {
  title: string;
  message?: string;
  action?: React.ReactNode;
}

export default function EmptyState({ title, message, action }: Props) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <PackageIcon size={26} />
      </span>
      <h3>{title}</h3>
      {message && <p>{message}</p>}
      {action}
    </div>
  );
}
