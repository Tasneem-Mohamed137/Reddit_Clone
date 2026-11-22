import axios from 'axios';

export const api = axios.create({ baseURL: '/api/v1', withCredentials: true });

// Every backend error has the shape { error: { code, message } }.
export const getErrorMessage = (err) =>
  err.response?.data?.error?.message ?? 'Something went wrong. Please try again.';