import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { ApiError } from '../api/auth';
import { getOrder, list as listOrders } from '../api/orders';
import { IconArrowRight } from '../assets/icons';
import ChatWidget from '../components/ChatWidget';
import PageShell from '../components/PageShell';
import { statusLabels } from '../components/StatusBadge';
import { usePolling } from '../hooks/usePolling';
import type { Message, Order, OrderListItem, OrderStatus } from '../types';

type StatusStep = {
  key: OrderStatus | 'created';
  label: string;
};

const STATUS_FLOW: StatusStep[] = [
  { key: 'created', label: 'ОФОРМЛЕН' },
  { key: 'accepted', label: 'ПРИНЯТ' },
  { key: 'in_progress', label: 'В РАБОТЕ' },
  { key: 'ready', label: 'ГОТОВ' },
  { key: 'completed', label: 'ЗАВЕРШЁН' },
];

const REJECTED_FLOW: StatusStep[] = [
  { key: 'created', label: 'ОФОРМЛЕН' },
  { key: 'rejected', label: 'ОТКЛОНЁН' },
];

const STATUS_RANK: Record<OrderStatus, number> = {
  new: 0,
  accepted: 1,
  rejected: 1,
  in_progress: 2,
  ready: 3,
  completed: 4,
};

function formatOrderNumber(id: number) {
  return `#${String(id).padStart(3, '0')}`;
}

function formatBudget(value: number) {
  return `${value.toLocaleString('ru-RU')} ₽`;
}

function formatChipDate(value: string) {
  return new Date(value).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });
}

function formatShortDate(value: string) {
  return new Date(value).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
  });
}

function formatOptionalText(value: string | null) {
  return value?.trim() ? value.trim() : '—';
}

function getStatusDates(order: Order, messages: Message[]) {
  const dates: Partial<Record<OrderStatus | 'created', string>> = {
    created: order.created_at,
  };

  messages.forEach((message) => {
    const match = message.text?.match(/→(new|accepted|rejected|in_progress|ready|completed)$/);
    if (message.type === 'system' && match) {
      dates[match[1] as OrderStatus] = message.created_at;
    }
  });

  return dates;
}

function getStatusHistory(order: Order, messages: Message[]) {
  const flow = order.status === 'rejected' ? REJECTED_FLOW : STATUS_FLOW;
  const dates = getStatusDates(order, messages);
  const currentRank = STATUS_RANK[order.status];

  return flow.map((step, index) => {
    const isReached = step.key === 'created' || index <= currentRank;
    return {
      ...step,
      date: dates[step.key],
      reached: isReached,
    };
  });
}

export default function MyOrdersPage() {
  const location = useLocation();
  const urlOrderId = useMemo(() => {
    const value = new URLSearchParams(location.search).get('order');
    const parsed = value ? Number.parseInt(value, 10) : Number.NaN;
    return Number.isNaN(parsed) ? null : parsed;
  }, [location.search]);

  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [order, setOrder] = useState<Order | null>(null);
  const [orderMessages, setOrderMessages] = useState<Message[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(Boolean(urlOrderId));
  const [listError, setListError] = useState('');
  const [detailError, setDetailError] = useState('');

  const selectedOrderId = urlOrderId ?? orders[0]?.id ?? null;
  const hasMultipleOrders = orders.length > 1;
  const selectedListItem = useMemo(
    () => orders.find((item) => item.id === selectedOrderId) ?? null,
    [orders, selectedOrderId],
  );

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [location.search]);

  const loadOrders = useCallback(async (silent = false) => {
    if (!silent) {
      setListLoading(true);
    }
    setListError('');

    try {
      const response = await listOrders();
      setOrders(response.orders);
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        setListError('Войдите, чтобы посмотреть заказы.');
        return;
      }

      setListError('Не удалось загрузить заказы.');
    } finally {
      if (!silent) {
        setListLoading(false);
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

  useEffect(() => {
    if (!selectedOrderId) {
      setOrder(null);
      setOrderMessages([]);
      setDetailLoading(false);
      setDetailError('');
      return undefined;
    }

    let cancelled = false;
    setDetailLoading(true);
    setDetailError('');
    setOrder(null);
    setOrderMessages([]);

    void getOrder(selectedOrderId)
      .then((response) => {
        if (cancelled) {
          return;
        }

        setOrder(response.order);
        setOrderMessages(response.messages ?? []);
      })
      .catch((requestError) => {
        if (cancelled) {
          return;
        }

        if (requestError instanceof ApiError && requestError.status === 401) {
          setDetailError('Войдите, чтобы посмотреть заказ.');
          return;
        }

        if (requestError instanceof ApiError && requestError.status === 403) {
          setDetailError('Этот заказ недоступен.');
          return;
        }

        if (requestError instanceof ApiError && requestError.status === 404) {
          setDetailError('Заказ не найден.');
          return;
        }

        setDetailError('Не удалось загрузить заказ.');
      })
      .finally(() => {
        if (!cancelled) {
          setDetailLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedOrderId, selectedListItem?.status]);

  const handleMessagesRead = useCallback(async () => {
    if (!selectedOrderId) {
      return;
    }

    setOrders((currentOrders) =>
      currentOrders.map((currentOrder) =>
        currentOrder.id === selectedOrderId ? { ...currentOrder, unread_count: 0 } : currentOrder,
      ),
    );
    await loadOrders(true);
  }, [loadOrders, selectedOrderId]);

  useEffect(() => {
    if (!selectedListItem) {
      return;
    }

    setOrder((currentOrder) => {
      if (!currentOrder || currentOrder.id !== selectedListItem.id) {
        return currentOrder;
      }

      return { ...currentOrder, ...selectedListItem };
    });
  }, [selectedListItem]);

  const statusHistory = useMemo(
    () => (order ? getStatusHistory(order, orderMessages) : []),
    [order, orderMessages],
  );

  return (
    <PageShell className="orders-page" eyebrow="/my-orders" title="МОИ ЗАКАЗЫ">
      <section className="client-orders-workspace" aria-label="Мои заказы">
        {listLoading ? <p className="orders-message">ЗАГРУЗКА ЗАКАЗОВ...</p> : null}
        {listError ? <p className="form-error">{listError}</p> : null}

        {!listLoading && !listError && orders.length === 0 ? (
          <div className="empty-orders">
            <p>У вас пока нет заказов.</p>
            <NavLink className="button-primary" to="/#wizard">
              ОФОРМИТЬ ЗАКАЗ <IconArrowRight size={16} />
            </NavLink>
          </div>
        ) : null}

        {!listLoading && !listError && hasMultipleOrders ? (
          <nav className="client-order-tabs" aria-label="Переключение между заказами">
            {orders.map((item) => {
              const isActive = item.id === selectedOrderId;
              const isTerminal = item.status === 'completed' || item.status === 'rejected';

              return (
                <Link
                  className={[
                    'client-order-tab',
                    isActive ? 'active' : '',
                    isTerminal && !isActive ? 'muted' : '',
                  ].filter(Boolean).join(' ')}
                  key={item.id}
                  to={`/my-orders?order=${item.id}`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <span className="client-order-tab-main">
                    {formatOrderNumber(item.id)} / {statusLabels[item.status]}
                    {item.unread_count > 0 ? <span className="client-order-unread">{item.unread_count}</span> : null}
                  </span>
                  <time dateTime={item.created_at}>{formatChipDate(item.created_at)}</time>
                </Link>
              );
            })}
          </nav>
        ) : null}

        {!listLoading && !listError && selectedOrderId ? (
          <section className="client-order-detail" aria-label="Карточка заказа">
            {detailLoading ? <p className="orders-message">ЗАГРУЗКА ЗАКАЗА...</p> : null}
            {detailError ? <p className="form-error">{detailError}</p> : null}

            {order ? (
              <div className="client-order-detail-layout">
                <article className="client-order-card">
                  <header>
                    <p>ЗАКАЗ {formatOrderNumber(order.id)}</p>
                    <span>{statusLabels[order.status]}</span>
                  </header>

                  <dl className="order-specs">
                    <div>
                      <dt>Механизм</dt>
                      <dd>{order.mechanism}</dd>
                    </div>
                    <div>
                      <dt>Корпус</dt>
                      <dd>{order.case_type}</dd>
                    </div>
                    <div>
                      <dt>Циферблат</dt>
                      <dd>{order.dial}</dd>
                    </div>
                    <div>
                      <dt>Ремешок</dt>
                      <dd>{order.strap}</dd>
                    </div>
                    <div>
                      <dt>Текст гравировки</dt>
                      <dd>{formatOptionalText(order.engraving)}</dd>
                    </div>
                    <div>
                      <dt>Бюджет</dt>
                      <dd>до {formatBudget(order.budget)}</dd>
                    </div>
                    <div>
                      <dt>Особые пожелания</dt>
                      <dd>{formatOptionalText(order.notes)}</dd>
                    </div>
                  </dl>

                  <section className="client-status-history" aria-label="История статусов">
                    <h2>ИСТОРИЯ СТАТУСОВ</h2>
                    <ol>
                      {statusHistory.map((step) => (
                        <li className={step.reached ? 'reached' : ''} key={step.key}>
                          <span>{step.label}</span>
                          <time dateTime={step.date ?? undefined}>
                            {step.reached && step.date ? formatShortDate(step.date) : '—'}
                          </time>
                        </li>
                      ))}
                    </ol>
                  </section>
                </article>

                <ChatWidget
                  className="client-chat-panel"
                  orderId={order.id}
                  title={`ЧАТ ПО ЗАКАЗУ ${formatOrderNumber(order.id)}`}
                  onMessagesRead={handleMessagesRead}
                  onMessageSent={() => loadOrders(true)}
                />
              </div>
            ) : null}

            {!order && !detailLoading && !detailError && selectedListItem ? (
              <p className="orders-message">ЗАКАЗ {formatOrderNumber(selectedListItem.id)} ЗАГРУЖАЕТСЯ...</p>
            ) : null}
          </section>
        ) : null}
      </section>
    </PageShell>
  );
}
