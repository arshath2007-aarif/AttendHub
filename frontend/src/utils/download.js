import api from '../services/api';

// Download a CSV from the backend (needs the auth header, so a plain <a href> won't work)
export async function downloadCsv(url, filename) {
  const res = await api.get(url, { responseType: 'blob' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(res.data);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}
