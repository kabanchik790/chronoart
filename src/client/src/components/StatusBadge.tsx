import type { OrderStatus } from '../types';

const statusLabels: Record<OrderStatus, string> = {
  new: 'НОВЫЙ',
  accepted: 'ПРИНЯТ',
  rejected: 'ОТКЛОНЁН',
  in_progress: 'В РАБОТЕ',
  ready: 'ГОТОВ',
  completed: 'ЗАВЕРШЁН',
};

type StatusBadgeProps = {
  status: OrderStatus;
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  return <span className={`status-badge status-badge-${status}`}>{statusLabels[status]}</span>;
}

export { statusLabels };
