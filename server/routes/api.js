const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage() });

// In-memory store
const sessions = new Map();

// --- Helpers ---

const SESSION_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateSessionId() {
  let id = '';
  for (let i = 0; i < 6; i++) {
    id += SESSION_CHARS[Math.floor(Math.random() * SESSION_CHARS.length)];
  }
  return id;
}

function computeDisplayName(firstName, lastName, isAnonymous) {
  if (isAnonymous || (!firstName?.trim() && !lastName?.trim())) {
    return 'Anonymous';
  }
  const first = firstName?.trim() || '';
  const last = lastName?.trim() || '';
  return first + (last ? ' ' + last[0].toUpperCase() + '.' : '');
}

// --- Health ---

router.get('/health', (req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

// --- Sessions ---

router.post('/sessions', (req, res) => {
  let id = req.body?.id;

  if (id) {
    id = id.toUpperCase();
    if (!/^[A-Z0-9]{4,20}$/.test(id)) {
      return res.status(400).json({ error: 'Session ID must be alphanumeric and 4–20 characters.' });
    }
    if (sessions.has(id)) {
      return res.status(409).json({ error: 'Session ID already exists.' });
    }
  } else {
    do {
      id = generateSessionId();
    } while (sessions.has(id));
  }

  const session = {
    id,
    goal: null,
    iframeUrl: null,
    iframeMode: null,
    iframePosition: 'right',
    theme: 'dark',
    title: null,
    displayMode: 'live',
    tickerMessage: null,
    thankYouMessage: null,
    targetReachedMessage: null,
    targetRemainingMessage: null,
    createdAt: new Date().toISOString(),
    donors: [],
  };

  sessions.set(id, session);
  return res.status(201).json(session);
});

router.get('/sessions/:id', (req, res) => {
  const session = sessions.get(req.params.id.toUpperCase());
  if (!session) return res.status(404).json({ error: 'Session not found.' });
  res.json(session);
});

// --- Donors ---

router.post('/sessions/:id/donors', (req, res) => {
  const session = sessions.get(req.params.id.toUpperCase());
  if (!session) return res.status(404).json({ error: 'Session not found.' });

  const { firstName = '', lastName = '', amount, isAnonymous = false } = req.body;

  const parsedAmount = parseFloat(amount);
  if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
    return res.status(400).json({ error: 'Amount must be a positive number.' });
  }

  const donor = {
    id: uuidv4(),
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    displayName: computeDisplayName(firstName, lastName, isAnonymous),
    isAnonymous: Boolean(isAnonymous),
    amount: parsedAmount,
    createdAt: new Date().toISOString(),
  };

  session.donors.push(donor);
  return res.status(201).json(session);
});

router.put('/sessions/:id/donors/:donorId', (req, res) => {
  const session = sessions.get(req.params.id.toUpperCase());
  if (!session) return res.status(404).json({ error: 'Session not found.' });

  const donor = session.donors.find(d => d.id === req.params.donorId);
  if (!donor) return res.status(404).json({ error: 'Donor not found.' });

  const { firstName = '', lastName = '', amount, isAnonymous = false } = req.body;

  const parsedAmount = parseFloat(amount);
  if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
    return res.status(400).json({ error: 'Amount must be a positive number.' });
  }

  donor.firstName = firstName.trim();
  donor.lastName = lastName.trim();
  donor.amount = parsedAmount;
  donor.isAnonymous = Boolean(isAnonymous);
  donor.displayName = computeDisplayName(firstName, lastName, isAnonymous);

  res.json(session);
});

router.delete('/sessions/:id/donors/:donorId', (req, res) => {
  const session = sessions.get(req.params.id.toUpperCase());
  if (!session) return res.status(404).json({ error: 'Session not found.' });

  const index = session.donors.findIndex(d => d.id === req.params.donorId);
  if (index === -1) return res.status(404).json({ error: 'Donor not found.' });

  session.donors.splice(index, 1);
  res.json(session);
});

// --- Goal ---

router.put('/sessions/:id/goal', (req, res) => {
  const session = sessions.get(req.params.id.toUpperCase());
  if (!session) return res.status(404).json({ error: 'Session not found.' });

  const { goal } = req.body;

  if (goal === null || goal === undefined || goal === '') {
    session.goal = null;
  } else {
    const parsed = parseFloat(goal);
    if (isNaN(parsed) || parsed <= 0) {
      return res.status(400).json({ error: 'Goal must be a positive number or null.' });
    }
    session.goal = parsed;
  }

  res.json(session);
});

// --- Iframe ---

router.put('/sessions/:id/iframe', (req, res) => {
  const session = sessions.get(req.params.id.toUpperCase());
  if (!session) return res.status(404).json({ error: 'Session not found.' });

  const { iframeUrl, iframeMode, iframePosition } = req.body;

  if (iframeUrl === null || iframeUrl === undefined || iframeUrl === '') {
    session.iframeUrl = null;
    session.iframeMode = null;
  } else {
    try {
      const parsed = new URL(iframeUrl);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return res.status(400).json({ error: 'iframeUrl must be an http or https URL.' });
      }
    } catch {
      return res.status(400).json({ error: 'iframeUrl is not a valid URL.' });
    }

    if (iframeMode !== 'split' && iframeMode !== 'rotate') {
      return res.status(400).json({ error: 'iframeMode must be "split" or "rotate" when iframeUrl is set.' });
    }

    session.iframeUrl = iframeUrl;
    session.iframeMode = iframeMode;
  }

  session.iframePosition = (iframePosition === 'left') ? 'left' : 'right';

  res.json(session);
});

// --- Title ---

router.put('/sessions/:id/title', (req, res) => {
  const session = sessions.get(req.params.id.toUpperCase());
  if (!session) return res.status(404).json({ error: 'Session not found.' });

  const { title } = req.body;
  const trimmed = typeof title === 'string' ? title.trim() : '';
  session.title = trimmed || null;

  res.json(session);
});

// --- Display Mode ---

router.put('/sessions/:id/display-mode', (req, res) => {
  const session = sessions.get(req.params.id.toUpperCase());
  if (!session) return res.status(404).json({ error: 'Session not found.' });

  const { displayMode } = req.body;
  if (displayMode !== 'live' && displayMode !== 'summary') {
    return res.status(400).json({ error: 'displayMode must be "live" or "summary".' });
  }

  session.displayMode = displayMode;
  res.json(session);
});

// --- Summary Messages ---

router.put('/sessions/:id/summary-messages', (req, res) => {
  const session = sessions.get(req.params.id.toUpperCase());
  if (!session) return res.status(404).json({ error: 'Session not found.' });

  const { thankYouMessage, targetReachedMessage, targetRemainingMessage } = req.body;
  session.thankYouMessage = (typeof thankYouMessage === 'string' && thankYouMessage.trim()) ? thankYouMessage.trim() : null;
  session.targetReachedMessage = (typeof targetReachedMessage === 'string' && targetReachedMessage.trim()) ? targetReachedMessage.trim() : null;
  session.targetRemainingMessage = (typeof targetRemainingMessage === 'string' && targetRemainingMessage.trim()) ? targetRemainingMessage.trim() : null;

  res.json(session);
});

// --- Ticker ---

router.put('/sessions/:id/ticker', (req, res) => {
  const session = sessions.get(req.params.id.toUpperCase());
  if (!session) return res.status(404).json({ error: 'Session not found.' });

  const { tickerMessage } = req.body;
  const trimmed = typeof tickerMessage === 'string' ? tickerMessage.trim() : '';
  session.tickerMessage = trimmed || null;

  res.json(session);
});

// --- Theme ---

router.put('/sessions/:id/theme', (req, res) => {
  const session = sessions.get(req.params.id.toUpperCase());
  if (!session) return res.status(404).json({ error: 'Session not found.' });

  const { theme } = req.body;
  if (theme !== 'light' && theme !== 'dark') {
    return res.status(400).json({ error: 'theme must be "light" or "dark".' });
  }

  session.theme = theme;
  res.json(session);
});

// --- CSV Export ---

router.get('/sessions/:id/export', (req, res) => {
  const session = sessions.get(req.params.id.toUpperCase());
  if (!session) return res.status(404).json({ error: 'Session not found.' });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="donors-${session.id}.csv"`);

  const headers = ['id', 'firstName', 'lastName', 'displayName', 'isAnonymous', 'amount', 'createdAt'];
  const rows = session.donors.map(d =>
    [d.id, d.firstName, d.lastName, d.displayName, d.isAnonymous, d.amount, d.createdAt]
      .map(v => `"${String(v).replace(/"/g, '""')}"`)
      .join(',')
  );

  res.send([headers.join(','), ...rows].join('\n'));
});

// --- CSV Import ---

router.post('/sessions/:id/import', upload.single('file'), (req, res) => {
  const session = sessions.get(req.params.id.toUpperCase());
  if (!session) return res.status(404).json({ error: 'Session not found.' });

  if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });

  const text = req.file.buffer.toString('utf-8');
  const lines = text.split(/\r?\n/).filter(l => l.trim());

  // Skip header row
  const dataLines = lines.slice(1);

  for (const line of dataLines) {
    // Simple CSV parse: split on comma, strip surrounding quotes
    const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
    const [firstName, lastName, amountStr, isAnonymousStr] = cols;

    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) continue;

    const isAnonymous = isAnonymousStr === 'true' || isAnonymousStr === '1';

    session.donors.push({
      id: uuidv4(),
      firstName: (firstName || '').trim(),
      lastName: (lastName || '').trim(),
      displayName: computeDisplayName(firstName, lastName, isAnonymous),
      isAnonymous,
      amount,
      createdAt: new Date().toISOString(),
    });
  }

  res.json(session);
});

module.exports = router;
