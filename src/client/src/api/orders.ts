import { ApiError } from './auth';
import type { Message, Order, OrderCustomer, OrderFormValues, OrderListItem, OrderStatus } from '../types';

const API_URL = import.meta.env.VITE_API_URL ?? '';

export type NewOrderPayload = Omit<OrderFormValues, 'budget'> & {
  budget: number;
};

type NewOrderResponse = {
  order_id: number;
};

type OrderResponse = {
  order: Order;
  user: OrderCustomer;
  messages?: Message[];
};

type OrdersResponse = {
  orders: OrderListItem[];
};

type UpdateStatusResponse = {
  order: Order;
  systemMessage?: unknown;
};

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
    },
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(data?.message ?? 'Request failed', response.status, data?.code);
  }

  return data as T;
}

export function createOrder(payload: NewOrderPayload) {
  return request<NewOrderResponse>('/api/new-order', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function list() {
  return request<OrdersResponse>('/api/orders');
}

export function get(orderId: number) {
  return request<OrderResponse>(`/api/orders/${orderId}`);
}

export function updateStatus(orderId: number, status: OrderStatus) {
  return request<UpdateStatusResponse>(`/api/orders/${orderId}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
}

export const getOrder = get;
