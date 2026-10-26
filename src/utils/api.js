const API_BASE = window.appConfig?.apiBase || 'http://localhost:3456';

export async function uploadFile(file) {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(API_BASE + '/api/upload', { method: 'POST', body: form });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || '上传失败');
  return data.file;
}

export async function getStatus() {
  const res = await fetch(API_BASE + '/api/status');
  return res.json();
}

export async function pollConversion(jobId, onProgress) {
  return new Promise((resolve, reject) => {
    const poll = async () => {
      try {
        const res = await fetch(API_BASE + '/api/convert/' + jobId);
        const data = await res.json();
        if (data.error) return reject(new Error(data.error));
        onProgress?.(data);
        if (data.status === 'done') return resolve(data);
        if (data.status === 'error') return reject(new Error(data.error || '转换失败'));
        setTimeout(poll, 500);
      } catch (e) {
        reject(e);
      }
    };
    poll();
  });
}

export function getImageUrl(jobId, path) {
  return API_BASE + path;
}

export function getExportUrl(jobId) {
  return API_BASE + '/api/export/' + jobId;
}

export { API_BASE };
