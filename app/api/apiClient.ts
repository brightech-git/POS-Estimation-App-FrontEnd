import { axiosInstance } from './axiosInstance';

// ─── Types ────────────────────────────────────────────────────────────────────

export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';

export interface ApiOptions<T> {
  method:      HttpMethod;
  url:         string;
  data?:       T;
  params?:     Record<string, any>;
  headers?:    Record<string, string>;
  isFormData?: boolean;
}

export interface ApiError {
  status:      'error';
  message:     string;
  errors?:     any;
  statusCode?: number;
}

// ─── Core caller ─────────────────────────────────────────────────────────────

export const callApi = async <T, R>({
  method,
  url,
  data,
  params,
  headers = {},
  isFormData = false,
}: ApiOptions<T>): Promise<R> => {
  try {
    const response = await axiosInstance.request<R>({
      method,
      url,
      params,
      data,
      headers: {
        ...headers,
        ...(isFormData ? { 'Content-Type': 'multipart/form-data' } : {}),
      },
    });

    // Some APIs return { status: 'error' } with HTTP 200
    if ((response.data as any)?.status === 'error') {
      throw {
        status:     'error',
        message:    (response.data as any).message ?? 'Something went wrong',
        errors:     (response.data as any).errors,
        statusCode: response.status,
      } as ApiError;
    }

    return response.data;
  } catch (error: any) {
    const status  = error?.response?.status;
    const resData = error?.response?.data;

    throw {
      status:  'error',
      message:
        resData?.message ||
        resData?.error   ||
        (typeof resData === 'string' ? resData : null) ||
        error?.message   ||
        'Something went wrong',
      errors:     resData?.errors,
      statusCode: status,
    } as ApiError;
  }
};
