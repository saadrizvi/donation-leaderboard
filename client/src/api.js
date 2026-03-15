const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(BASE + path, options);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export function createSession(customId) {
  return request('/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(customId ? { id: customId } : {}),
  });
}

export function getSession(id) {
  return request(`/sessions/${id}`);
}

export function addDonor(sessionId, { firstName, lastName, amount, isAnonymous }) {
  return request(`/sessions/${sessionId}/donors`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ firstName, lastName, amount, isAnonymous }),
  });
}

export function editDonor(sessionId, donorId, { firstName, lastName, amount, isAnonymous }) {
  return request(`/sessions/${sessionId}/donors/${donorId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ firstName, lastName, amount, isAnonymous }),
  });
}

export function deleteDonor(sessionId, donorId) {
  return request(`/sessions/${sessionId}/donors/${donorId}`, { method: 'DELETE' });
}

export function setGoal(sessionId, goal) {
  return request(`/sessions/${sessionId}/goal`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ goal }),
  });
}

export function setIframe(sessionId, { iframeUrl, iframeMode }) {
  return request(`/sessions/${sessionId}/iframe`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ iframeUrl, iframeMode }),
  });
}

export async function exportCSV(sessionId) {
  const res = await fetch(`${BASE}/sessions/${sessionId}/export`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `donors-${sessionId}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importCSV(sessionId, file) {
  const form = new FormData();
  form.append('file', file);
  return request(`/sessions/${sessionId}/import`, { method: 'POST', body: form });
}
