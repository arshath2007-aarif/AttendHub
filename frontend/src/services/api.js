import axios from 'axios';
import { supabase } from './supabaseClient';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL });

// Attach the logged-in user's JWT to every request
api.interceptors.request.use(async (config) => {
  const { data } = await supabase.auth.getSession();
  if (data.session) config.headers.Authorization = `Bearer ${data.session.access_token}`;
  return config;
});

// Turn backend errors into a readable error.message
api.interceptors.response.use(
  (res) => res,
  (err) => {
    err.message = err.response?.data?.message || err.message || 'Something went wrong';
    return Promise.reject(err);
  }
);

export default api;
