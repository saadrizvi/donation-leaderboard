const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(BASE + path, options);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export function createSession(customId, pin) {
  const body = {};
  if (customId) body.id = customId;
  if (pin) body.pin = pin;
  return request('/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export function getSession(id) {
  return request(`/sessions/${id}`);
}

export function verifyPin(sessionId, pin) {
  return request(`/sessions/${sessionId}/verify-pin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin }),
  });
}

export function undoAction(sessionId) {
  return request(`/sessions/${sessionId}/undo`, { method: 'POST' });
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

export function setIframe(sessionId, { iframeUrl, iframeMode, iframePosition }) {
  return request(`/sessions/${sessionId}/iframe`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ iframeUrl, iframeMode, iframePosition }),
  });
}

export function setTitle(sessionId, title) {
  return request(`/sessions/${sessionId}/title`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });
}

export function setDisplayMode(sessionId, displayMode) {
  return request(`/sessions/${sessionId}/display-mode`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ displayMode }),
  });
}

export function setSummaryMessages(sessionId, { thankYouMessage, targetReachedMessage, targetRemainingMessage }) {
  return request(`/sessions/${sessionId}/summary-messages`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ thankYouMessage, targetReachedMessage, targetRemainingMessage }),
  });
}

export function setTicker(sessionId, tickerMessage) {
  return request(`/sessions/${sessionId}/ticker`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tickerMessage }),
  });
}

export function setTheme(sessionId, theme) {
  return request(`/sessions/${sessionId}/theme`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ theme }),
  });
}

export function setMilestones(sessionId, milestonesEnabled) {
  return request(`/sessions/${sessionId}/milestones`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ milestonesEnabled }),
  });
}

export function setQr(sessionId, { qrUrl, qrEnabled }) {
  return request(`/sessions/${sessionId}/qr`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ qrUrl, qrEnabled }),
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
