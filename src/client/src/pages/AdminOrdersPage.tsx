import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError } from '../api/auth';
import { get, list } from '../api/orders';
import StatusBadge from '../components/StatusBadge';
import { usePolling } from '../hooks/usePolling';
import AdminLayout from '../layout/AdminLayout';
import type { OrderListItem, OrderStatus } from '../types';

const statusFilters: Array<{ value: OrderStatus | 'all'; label: string }> = [
  { value: 'all', label: 'ВСЕ' },
  { value: 'new', label: 'НОВЫЕ' },
  { value: 'accepted', label: 'ПРИНЯТЫЕ' },
  { value: 'in_progress', label: 'В РАБОТЕ' },
  { value: 'ready', label: 'ГОТОВЫ' },
  { value: 'completed', label: 'ЗАВЕРШЁНЫ' },
  { value: 'rejected', label: 'ОТКЛОНЁНЫ' },
];

function formatOrderNumber(id: number) {
  return `#${String(id).padStart(3, '0')}`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('ru-RU');
}

function formatBudget(value: number) {
  return `до ${value.toLocaleString('ru-RU')} ₽`;
}

function getCustomerName(order: OrderListItem) {
  return order.user?.name ?? `Клиент #${order.user_id}`;
}

export default function AdminOrdersPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadOrders = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
    }
    setError('');

    try {
      const response = await list();
      const missingCustomers = response.orders.filter((order) => !order.user);

      if (missingCustomers.length === 0) {
        setOrders(response.orders);
        return;
      }

      const customerEntries = await Promise.all(
        missingCustomers.map(async (order) => {
          try {
            const detail = await get(order.id);
            return [order.id, detail.user] as const;
          } catch {
            return [order.id, null] as const;
          }
        }),
      );
      const customersByOrderId = new Map(customerEntries);

      setOrders(
        response.orders.map((order) => ({
          ...order,
          user: order.user ?? customersByOrderId.get(order.id) ?? null,
        })),
      );
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        setError('Войдите как мастер, чтобы открыть список заказов.');
        return;
      }

      if (requestError instanceof ApiError && requestError.status === 403) {
        setError('Недостаточно прав для просмотра заказов.');
        return;
      }

      setError('Не удалось загрузить заказы.');
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  usePolling({
    interval: 30000,
    enabled: true,
    fn: () => loadOrders(true),
  });

  const filteredOrders = useMemo(() => {
    if (statusFilter === 'all') {
      return orders;
    }

    return orders.filter((order) => order.status === statusFilter);
  }, [orders, statusFilter]);

  return (
    <AdminLayout>
      <section className="admin-page admin-list-page">
        <h1>ВСЕ ЗАКАЗЫ</h1>

        <div className="admin-status-tabs" aria-label="Фильтр заказов по статусу">
          {statusFilters.map((filter) => (
            <button
              key={filter.value}
              className={statusFilter === filter.value ? 'admin-filter-tab active' : 'admin-filter-tab'}
              type="button"
              onClick={() => setStatusFilter(filter.value)}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {error ? <p className="admin-message error">{error}</p> : null}
        {loading ? <p className="admin-message">ЗАГРУЗКА ЗАКАЗОВ...</p> : null}

        {!loading && !error ? (
          <div className="admin-table-scroll">
            <div className="admin-orders-table" role="table" aria-label="Все заказы">
              <div className="admin-orders-header" role="row">
                <span role="columnheader">№</span>
                <span role="columnheader">КЛИЕНТ</span>
                <span role="columnheader">СТАТУС</span>
                <span role="columnheader">ДАТА</span>
                <span role="columnheader">БЮДЖЕТ</span>
                <span role="columnheader">ЧАТ</span>
              </div>

              {filteredOrders.length > 0 ? (
                filteredOrders.map((order) => (
                  <button
                    key={order.id}
                    className={order.unread_count > 0 ? 'admin-orders-row has-unread' : 'admin-orders-row'}
                    type="button"
                    role="row"
                    onClick={() => navigate(`/admin/orders/${order.id}`)}
                    aria-label={`Открыть заказ ${formatOrderNumber(order.id)}`}
                  >
                    <span className="admin-order-number" role="cell">
                      {formatOrderNumber(order.id)}
                    </span>
                    <span className="admin-customer-cell" role="cell">
                      <strong>{getCustomerName(order)}</strong>
                      {order.user?.email ? <small>{order.user.email}</small> : null}
                    </span>
                    <span role="cell">
                      <StatusBadge status={order.status} />
                    </span>
                    <span className="admin-date-cell" role="cell">
                      {formatDate(order.created_at)}
                    </span>
                    <span className="admin-budget-cell" role="cell">
                      {formatBudget(order.budget)}
                    </span>
                    <span role="cell">
                      {order.unread_count > 0 ? (
                        <span className="unread-badge">{order.unread_count}</span>
                      ) : (
                        <span className="admin-empty-dash">—</span>
                      )}
                    </span>
                  </button>
                ))
              ) : (
                <div className="admin-empty-row" role="row">
                  <span role="cell">Заказов с выбранным статусом нет</span>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </section>
    </AdminLayout>
  );
}
