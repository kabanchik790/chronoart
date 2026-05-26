import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { NavLink, useParams } from 'react-router-dom';
import { ApiError } from '../api/auth';
import { get, updateStatus } from '../api/orders';
import { IconArrowLeft } from '../assets/icons';
import ChatWidget from '../components/ChatWidget';
import StatusBadge, { statusLabels } from '../components/StatusBadge';
import AdminLayout from '../layout/AdminLayout';
import type { Order, OrderCustomer, OrderStatus } from '../types';

const statusTransitions: Record<OrderStatus, OrderStatus[]> = {
  new: ['accepted', 'rejected'],
  accepted: ['in_progress'],
  rejected: [],
  in_progress: ['ready'],
  ready: ['completed'],
  completed: [],
};

const transitionLabels: Record<OrderStatus, string> = {
  new: 'НОВЫЙ',
  accepted: 'ПРИНЯТЬ',
  rejected: 'ОТКЛОНИТЬ',
  in_progress: 'В РАБОТУ',
  ready: 'ГОТОВ',
  completed: 'ЗАВЕРШИТЬ',
};

function formatOrderNumber(id: number) {
  return `#${String(id).padStart(3, '0')}`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('ru-RU');
}

function formatBudget(value: number) {
  return `до ${value.toLocaleString('ru-RU')} ₽`;
}

function emptyValue(value: string | null | undefined) {
  return value && value.trim() ? value : '—';
}

export default function AdminOrderDetailPage() {
  const { id } = useParams();
  const orderId = useMemo(() => {
    const parsed = Number.parseInt(id ?? '', 10);
    return Number.isNaN(parsed) ? null : parsed;
  }, [id]);

  const [order, setOrder] = useState<Order | null>(null);
  const [customer, setCustomer] = useState<OrderCustomer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState<OrderStatus | null>(null);

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [orderId]);

  const loadOrder = useCallback(async (silent = false) => {
    if (!orderId) {
      setError('Некорректный номер заказа.');
      setLoading(false);
      return;
    }

    if (!silent) {
      setLoading(true);
    }
    setError('');

    try {
      const response = await get(orderId);
      setOrder(response.order);
      setCustomer(response.user);
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        setError('Войдите как мастер, чтобы открыть заказ.');
        return;
      }

      if (requestError instanceof ApiError && requestError.status === 403) {
        setError('Недостаточно прав для просмотра заказа.');
        return;
      }

      if (requestError instanceof ApiError && requestError.status === 404) {
        setError('Заказ не найден.');
        return;
      }

      setError('Не удалось загрузить заказ.');
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [orderId]);

  useEffect(() => {
    void loadOrder();
  }, [loadOrder]);

  const allowedTransitions = order ? statusTransitions[order.status] : [];

  const handleStatusChange = async (nextStatus: OrderStatus) => {
    if (!orderId) {
      return;
    }

    setUpdatingStatus(nextStatus);
    setActionError('');

    try {
      const response = await updateStatus(orderId, nextStatus);
      setOrder(response.order);
      await loadOrder(true);
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.code === 'INVALID_TRANSITION') {
        setActionError('Этот переход статуса недоступен.');
        return;
      }

      setActionError('Не удалось изменить статус.');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const parameterRows = order
    ? [
        { label: 'Механизм', value: order.mechanism },
        { label: 'Корпус', value: order.case_type },
        { label: 'Циферблат', value: order.dial },
        { label: 'Ремешок', value: order.strap },
        { label: 'Текст гравировки', value: emptyValue(order.engraving) },
        { label: 'Бюджет', value: formatBudget(order.budget) },
        { label: 'Особые пожелания', value: emptyValue(order.notes) },
      ]
    : [];

  return (
    <AdminLayout>
      <section className="admin-page admin-detail-page">
        <NavLink className="admin-back-link" to="/admin/orders">
          <IconArrowLeft size={16} /> К СПИСКУ ЗАКАЗОВ
        </NavLink>

        {error ? <p className="admin-message error">{error}</p> : null}
        {loading ? <p className="admin-message">ЗАГРУЗКА ЗАКАЗА...</p> : null}

        {order ? (
          <div className="admin-detail-grid">
            <div className="admin-detail-main">
              <section className="admin-customer-card" aria-label="Контакты клиента">
                <p>КЛИЕНТ</p>
                <strong>{customer?.name ?? 'Клиент'}</strong>
                <span>{customer?.email ?? 'email не указан'}</span>
              </section>

              <header className="admin-order-heading">
                <div>
                  <p>ЗАКАЗ {formatOrderNumber(order.id)}</p>
                  <span>{statusLabels[order.status]}</span>
                </div>
                <time dateTime={order.created_at}>{formatDate(order.created_at)}</time>
              </header>

              <dl className="admin-field-list">
                {parameterRows.map((row) => (
                  <div className="admin-field" key={row.label}>
                    <dt>{row.label}</dt>
                    <dd>{row.value}</dd>
                  </div>
                ))}
              </dl>

              <section className="admin-status-panel" aria-label="Сменить статус">
                <header>
                  <h2>СМЕНИТЬ СТАТУС</h2>
                  <StatusBadge status={order.status} />
                </header>

                {allowedTransitions.length > 0 ? (
                  <div className="admin-status-actions">
                    {allowedTransitions.map((nextStatus) => (
                      <button
                        key={nextStatus}
                        className="admin-status-button"
                        type="button"
                        disabled={updatingStatus !== null}
                        onClick={() => void handleStatusChange(nextStatus)}
                      >
                        {updatingStatus === nextStatus ? 'СОХРАНЕНИЕ...' : transitionLabels[nextStatus]}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="admin-terminal-status">Для текущего статуса нет доступных переходов.</p>
                )}

                {actionError ? <p className="admin-action-error">{actionError}</p> : null}
              </section>
            </div>

            <ChatWidget
              className="admin-chat-panel"
              orderId={order.id}
              title={`ЧАТ ПО ЗАКАЗУ ${formatOrderNumber(order.id)}`}
            />
          </div>
        ) : null}
      </section>
    </AdminLayout>
  );
}
