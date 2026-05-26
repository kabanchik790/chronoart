import { ApiError } from './auth';
import type { Message } from '../types';

const API_URL = import.meta.env.VITE_API_URL ?? '';

type SendMessagePayload = {
  text?: string;
  image?: File | null;
};

type SendMessageResponse = {
  message: Message;
};

type MarkReadResponse = {
  updated: number;
};

async function parseJsonError(response: Response): Promise<never> {
  const data = await response.json().catch(() => null);
  throw new ApiError(data?.message ?? 'Request failed', response.status, data?.code);
}

export async function list(orderId: number) {
  const response = await fetch(`${API_URL}/api/orders/${orderId}/messages`, {
    credentials: 'include',
  });

  if (!response.ok) {
    await parseJsonError(response);
  }

  return response.json() as Promise<Message[]>;
}

export async function send(orderId: number, payload: SendMessagePayload) {
  const formData = new FormData();
  const text = payload.text?.trim();

  if (text) {
    formData.append('text', text);
  }

  if (payload.image) {
    formData.append('image', payload.image);
  }

  const response = await fetch(`${API_URL}/api/orders/${orderId}/messages`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });

  if (!response.ok) {
    await parseJsonError(response);
  }

  return response.json() as Promise<SendMessageResponse>;
}

export async function markRead(orderId: number) {
  const response = await fetch(`${API_URL}/api/orders/${orderId}/messages/mark-read`, {
    method: 'POST',
    credentials: 'include',
  });

  if (!response.ok) {
    await parseJsonError(response);
  }

  return response.json() as Promise<MarkReadResponse>;
}

export function imageUrl(orderId: number, messageId: number) {
  return `${API_URL}/api/orders/${orderId}/messages/${messageId}/image`;
}

export async function fetchImage(orderId: number, messageId: number) {
  const response = await fetch(imageUrl(orderId, messageId), {
    credentials: 'include',
  });

  if (!response.ok) {
    await parseJsonError(response);
  }

  return response.blob();
}
