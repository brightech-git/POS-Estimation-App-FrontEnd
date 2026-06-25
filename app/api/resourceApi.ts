// ─── Generic CRUD factory ─────────────────────────────────────────────────────
// Usage:  const estimationApi = createResourceApi<Estimation>('estimation');
//         await estimationApi.getAll({ branch: 1 });

import { callApi } from './apiClient';

export const createResourceApi = <T>(resource: string) => ({
  getAll: (params?: Record<string, any>) =>
    callApi<null, T[]>({ method: 'get', url: `/${resource}`, params }),

  getById: (id: number | string) =>
    callApi<null, T>({ method: 'get', url: `/${resource}/${id}` }),

  create: (data: T | FormData, isFormData = false) =>
    callApi<T | FormData, T>({ method: 'post', url: `/${resource}`, data, isFormData }),

  update: (id: number | string, data: Partial<T> | FormData, isFormData = false) =>
    callApi<Partial<T> | FormData, T>({ method: 'put', url: `/${resource}/${id}`, data, isFormData }),

  patch: (id: number | string, data: Partial<T>) =>
    callApi<Partial<T>, T>({ method: 'patch', url: `/${resource}/${id}`, data }),

  delete: (id: number | string) =>
    callApi<null, { success: boolean }>({ method: 'delete', url: `/${resource}/${id}` }),
});
