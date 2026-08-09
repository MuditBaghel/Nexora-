interface Props {
  status: string;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}

const variantMap: Record<string, Props['variant']> = {
  ACTIVE: 'success',
  CONFIRMED: 'success',
  IN: 'success',
  LEAD: 'info',
  DRAFT: 'warning',
  INACTIVE: 'default',
  CANCELLED: 'danger',
  OUT: 'danger',
};

export default function StatusBadge({ status, variant }: Props) {
  const v = variant ?? variantMap[status] ?? 'default';
  const label = status.charAt(0) + status.slice(1).toLowerCase();
  return <span className={`badge badge-${v}`}>{label}</span>;
}
