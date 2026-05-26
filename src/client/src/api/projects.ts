import { ApiError } from './auth';
import type { Project } from '../types';

const API_URL = import.meta.env.VITE_API_URL ?? '';

export type ProjectCreatePayload = {
  title: string;
  description: string;
  image: File;
};

export type ProjectUpdatePayload = {
  title: string;
  description: string;
  image?: File | null;
};

type ProjectResponse = {
  project: Project;
};

function makeFormData(payload: ProjectCreatePayload | ProjectUpdatePayload) {
  const formData = new FormData();
  formData.append('title', payload.title);
  formData.append('description', payload.description);

  if (payload.image) {
    formData.append('image', payload.image);
  }

  return formData;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: 'include',
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(data?.message ?? 'Request failed', response.status, data?.code);
  }

  return data as T;
}

export function getProjectImageUrl(project: Pick<Project, 'image_url'>) {
  if (!project.image_url) {
    return '';
  }

  if (/^https?:\/\//i.test(project.image_url)) {
    return project.image_url;
  }

  return `${API_URL}/${project.image_url.replace(/^\/+/, '')}`;
}

export function list() {
  return request<Project[]>('/api/projects');
}

export function get(projectId: number) {
  return request<ProjectResponse>(`/api/projects/${projectId}`);
}

export function create(payload: ProjectCreatePayload) {
  return request<ProjectResponse>('/api/projects', {
    method: 'POST',
    body: makeFormData(payload),
  });
}

export function update(projectId: number, payload: ProjectUpdatePayload) {
  return request<ProjectResponse>(`/api/projects/${projectId}`, {
    method: 'PUT',
    body: makeFormData(payload),
  });
}

export function remove(projectId: number) {
  return request<{ ok: boolean }>(`/api/projects/${projectId}`, {
    method: 'DELETE',
  });
}
