import { useState, useEffect } from 'react'
import { usePolling } from '../hooks/usePolling.js'
import { addDonor, editDonor, deleteDonor, setGoal, setIframe, setTheme, exportCSV, importCSV } from '../api.js'
import SessionEntry from '../components/SessionEntry.jsx'
import DonorForm from '../components/DonorForm.jsx'
import DonorList from '../components/DonorList.jsx'
import DuplicateModal from '../components/DuplicateModal.jsx'
import StatusIndicator from '../components/StatusIndicator.jsx'
import '../styles/admin.css'

const LS_KEY = 'donor_board_admin_session'

function formatAmount(amount) {
  return amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

function Admin() {
  const [sessionId, setSessionId] = useState(() => localStorage.getItem(LS_KEY) || null)
  const { session, loading, error, consecutiveFailures, refresh } = usePolling(sessionId)

  // Edit state
  const [editingDonor, setEditingDonor] = useState(null)

  // Duplicate detection
  const [pendingDonor, setPendingDonor] = useState(null)
  const [duplicateMatch, setDuplicateMatch] = useState(null)

  // Goal
  const [goalInput, setGoalInput] = useState('')
  const [goalMsg, setGoalMsg] = useState('')

  // Iframe
  const [iframeUrl, setIframeUrl] = useState('')
  const [iframeMode, setIframeMode] = useState('split')
  const [iframeMsg, setIframeMsg] = useState('')

  // CSV
  const [csvFile, setCsvFile] = useState(null)
  const [csvMsg, setCsvMsg] = useState(null)

  // Sync iframe inputs when session first loads
  useEffect(() => {
    if (session) {
      setIframeUrl(session.iframeUrl || '')
      setIframeMode(session.iframeMode || 'split')
    }
  }, [session?.id])

  function handleSessionSet(id) {
    localStorage.setItem(LS_KEY, id)
    setSessionId(id)
  }

  function handleLeaveSession() {
    localStorage.removeItem(LS_KEY)
    setSessionId(null)
  }

  function handleCopyId() {
    navigator.clipboard.writeText(sessionId).catch(() => {})
  }

  // --- Donor add with duplicate detection ---
  function findDuplicate(data, donors) {
    if (data.isAnonymous || (!data.firstName && !data.lastName)) return null
    const name = (data.firstName + data.lastName).toLowerCase().replace(/\s/g, '')
    return donors.find(d => {
      if (d.isAnonymous) return false
      const dn = (d.firstName + d.lastName).toLowerCase().replace(/\s/g, '')
      return dn === name
    }) || null
  }

  async function handleAddDonor(data) {
    if (data === null) return // cancel from edit mode noop

    const duplicate = findDuplicate(data, session.donors)
    if (duplicate) {
      setPendingDonor(data)
      setDuplicateMatch(duplicate)
      return
    }
    await submitAddDonor(data)
  }

  async function submitAddDonor(data) {
    await addDonor(sessionId, data)
    await refresh()
  }

  async function handleDuplicateConfirm() {
    await submitAddDonor(pendingDonor)
    setPendingDonor(null)
    setDuplicateMatch(null)
  }

  function handleDuplicateCancel() {
    setPendingDonor(null)
    setDuplicateMatch(null)
  }

  // --- Donor edit ---
  async function handleEditSubmit(data) {
    if (data === null) {
      setEditingDonor(null)
      return
    }
    await editDonor(sessionId, editingDonor.id, data)
    setEditingDonor(null)
    await refresh()
  }

  // --- Donor delete ---
  async function handleDelete(donorId) {
    await deleteDonor(sessionId, donorId)
    await refresh()
  }

  // --- Goal ---
  async function handleSetGoal(value) {
    try {
      await setGoal(sessionId, value)
      setGoalMsg('')
      setGoalInput('')
      await refresh()
    } catch (err) {
      setGoalMsg(err.message)
    }
  }

  // --- Theme ---
  async function handleSetTheme(value) {
    await setTheme(sessionId, value)
    await refresh()
  }

  // --- Iframe ---
  async function handleSaveIframe() {
    try {
      await setIframe(sessionId, { iframeUrl: iframeUrl || null, iframeMode: iframeUrl ? iframeMode : null })
      setIframeMsg('Saved.')
      await refresh()
    } catch (err) {
      setIframeMsg(err.message)
    }
  }

  async function handleRemoveIframe() {
    try {
      await setIframe(sessionId, { iframeUrl: null, iframeMode: null })
      setIframeUrl('')
      setIframeMode('split')
      setIframeMsg('')
      await refresh()
    } catch (err) {
      setIframeMsg(err.message)
    }
  }

  // --- CSV ---
  async function handleExport() {
    try {
      await exportCSV(sessionId)
    } catch (err) {
      setCsvMsg({ type: 'error', text: err.message })
    }
  }

  async function handleImport() {
    if (!csvFile) return
    try {
      const result = await importCSV(sessionId, csvFile)
      const before = session.donors.length
      const after = result.donors.length
      setCsvMsg({ type: 'success', text: `Imported ${after - before} donor(s).` })
      setCsvFile(null)
      await refresh()
    } catch (err) {
      setCsvMsg({ type: 'error', text: err.message })
    }
  }

  // --- Render ---

  if (!sessionId) {
    return <SessionEntry onSessionSet={handleSessionSet} />
  }

  if (loading) {
    return (
      <div className="admin-page" style={{ textAlign: 'center', paddingTop: '60px', color: '#aaa' }}>
        Loading session…
      </div>
    )
  }

  if (error && !session) {
    return (
      <div className="admin-page" style={{ textAlign: 'center', paddingTop: '60px' }}>
        <p style={{ color: '#dc3545' }}>Session not found. Check your session ID.</p>
        <button className="btn btn-secondary" onClick={handleLeaveSession}>Back</button>
      </div>
    )
  }

  if (!session) return null

  const total = session.donors.reduce((sum, d) => sum + d.amount, 0)

  return (
    <div className="admin-page">

      {/* Session header */}
      <div className="session-header">
        <span className="session-id-display">{sessionId}</span>
        <button className="btn btn-ghost btn-sm" onClick={handleCopyId}>Copy ID</button>
        <a
          className="btn btn-ghost btn-sm"
          href={`/display?code=${sessionId}`}
          target="_blank"
          rel="noreferrer"
        >
          Open Display ↗
        </a>
        <button className="btn btn-ghost btn-sm" onClick={handleLeaveSession}>Leave</button>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, background: '#f5f5fa', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#1a1a2e' }}>{session.donors.length}</div>
          <div style={{ fontSize: '0.8rem', color: '#888', textTransform: 'uppercase', letterSpacing: '1px' }}>Contributors</div>
        </div>
        <div style={{ flex: 1, background: '#f5f5fa', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--color-accent)' }}>{formatAmount(total)}</div>
          <div style={{ fontSize: '0.8rem', color: '#888', textTransform: 'uppercase', letterSpacing: '1px' }}>Collected</div>
        </div>
        {session.goal && (
          <div style={{ flex: 1, background: '#f5f5fa', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
            <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#1a1a2e' }}>{formatAmount(session.goal)}</div>
            <div style={{ fontSize: '0.8rem', color: '#888', textTransform: 'uppercase', letterSpacing: '1px' }}>Goal</div>
          </div>
        )}
      </div>

      {/* Add / Edit donor */}
      <div className="admin-section">
        <h2>{editingDonor ? 'Edit Donor' : 'Add Donor'}</h2>
        <DonorForm
          onSubmit={editingDonor ? handleEditSubmit : handleAddDonor}
          loading={false}
          defaultValues={editingDonor ? {
            firstName: editingDonor.firstName,
            lastName: editingDonor.lastName,
            amount: editingDonor.amount,
            isAnonymous: editingDonor.isAnonymous,
          } : null}
        />
      </div>

      {/* Donor list */}
      <div className="admin-section">
        <h2>Donors ({session.donors.length})</h2>
        <DonorList
          donors={session.donors}
          onEdit={donor => setEditingDonor(donor)}
          onDelete={handleDelete}
        />
      </div>

      {/* Goal */}
      <div className="admin-section">
        <h2>Fundraising Target</h2>
        {session.goal && (
          <div className="goal-display">
            <span>Current goal:</span>
            <span className="goal-value">{formatAmount(session.goal)}</span>
            <button className="btn btn-ghost btn-sm" onClick={() => handleSetGoal(null)}>Clear</button>
          </div>
        )}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Set Goal ($)</label>
            <input
              type="number"
              value={goalInput}
              onChange={e => setGoalInput(e.target.value)}
              placeholder="e.g. 10000"
              min="1"
            />
          </div>
          <button
            className="btn btn-primary"
            onClick={() => handleSetGoal(parseFloat(goalInput))}
            disabled={!goalInput}
          >
            Set Goal
          </button>
        </div>
        {goalMsg && <p className="form-error">{goalMsg}</p>}
      </div>

      {/* Display theme */}
      <div className="admin-section">
        <h2>Display Theme</h2>
        <div className="mode-options">
          <div
            className={`mode-option${(session.theme || 'dark') === 'dark' ? ' selected' : ''}`}
            onClick={() => handleSetTheme('dark')}
            style={{ background: '#0d1b2a', color: '#f0ede6', borderColor: (session.theme || 'dark') === 'dark' ? '#c9a84c' : '#333' }}
          >
            <strong>🌙 Dark</strong>
            <div style={{ fontSize: '0.8rem', opacity: 0.7, marginTop: '2px' }}>Navy + Gold</div>
          </div>
          <div
            className={`mode-option${session.theme === 'light' ? ' selected' : ''}`}
            onClick={() => handleSetTheme('light')}
            style={{ background: '#f5f0e6', color: '#1a1a2e', borderColor: session.theme === 'light' ? '#1b5e38' : '#ccc' }}
          >
            <strong>☀️ Light</strong>
            <div style={{ fontSize: '0.8rem', opacity: 0.7, marginTop: '2px' }}>Cream + Green</div>
          </div>
        </div>
      </div>

      {/* Iframe config */}
      <div className="admin-section">
        <h2>Embed URL</h2>
        <div className="form-group" style={{ marginBottom: '10px' }}>
          <label>URL or &lt;iframe&gt; embed code</label>
          <textarea
            value={iframeUrl}
            onChange={e => {
              const val = e.target.value
              // If it looks like an iframe snippet, extract the src
              const match = val.match(/src=["']([^"']+)["']/)
              setIframeUrl(match ? match[1] : val)
            }}
            placeholder={'https://example.com\n— or paste an <iframe> embed code —'}
            rows={3}
            style={{ resize: 'vertical', fontFamily: 'monospace', fontSize: '0.85rem' }}
          />
          {iframeUrl && !iframeUrl.startsWith('http') && (
            <p className="form-error">URL must start with http:// or https://</p>
          )}
          {iframeUrl && iframeUrl.startsWith('http') && (
            <p className="helper-note" style={{ color: '#00a87a' }}>✓ {iframeUrl}</p>
          )}
        </div>
        <div className="form-group" style={{ marginBottom: '10px' }}>
          <label>Display Mode</label>
          <div className="mode-options">
            <div
              className={`mode-option${iframeMode === 'split' ? ' selected' : ''}`}
              onClick={() => setIframeMode('split')}
            >
              <strong>Split Screen</strong>
              <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '2px' }}>Side by side</div>
            </div>
            <div
              className={`mode-option${iframeMode === 'rotate' ? ' selected' : ''}`}
              onClick={() => setIframeMode('rotate')}
            >
              <strong>Rotating Page</strong>
              <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '2px' }}>Cycles in rotation</div>
            </div>
          </div>
        </div>
        <p className="helper-note">Split screen works best on wide TV displays. Rotating page works on any screen.</p>
        {iframeMode === 'split' && (
          <p className="helper-note" style={{ color: 'var(--color-warning)' }}>
            ⚠️ Split mode is designed for landscape TV screens (900px+).
          </p>
        )}
        <div className="form-actions">
          <button className="btn btn-primary btn-sm" onClick={handleSaveIframe}>Save Embed</button>
          {session.iframeUrl && (
            <button className="btn btn-ghost btn-sm" onClick={handleRemoveIframe}>Remove Embed</button>
          )}
        </div>
        {iframeMsg && <p style={{ fontSize: '0.85rem', color: '#00a87a', marginTop: '6px' }}>{iframeMsg}</p>}
      </div>

      {/* CSV */}
      <div className="admin-section">
        <h2>CSV</h2>
        <div className="csv-row" style={{ marginBottom: '10px' }}>
          <button className="btn btn-secondary btn-sm" onClick={handleExport}>Export CSV</button>
        </div>
        <div className="csv-row">
          <input
            type="file"
            accept=".csv"
            onChange={e => { setCsvFile(e.target.files[0] || null); setCsvMsg(null) }}
            style={{ flex: 1, fontSize: '0.9rem' }}
          />
          <button className="btn btn-primary btn-sm" onClick={handleImport} disabled={!csvFile}>
            Import CSV
          </button>
        </div>
        {csvMsg && (
          <div className={`status-message ${csvMsg.type}`}>{csvMsg.text}</div>
        )}
      </div>

      {/* Duplicate modal */}
      {duplicateMatch && (
        <DuplicateModal
          existingDonor={duplicateMatch}
          onConfirm={handleDuplicateConfirm}
          onCancel={handleDuplicateCancel}
        />
      )}

      <StatusIndicator consecutiveFailures={consecutiveFailures} error={error} />
    </div>
  )
}

export default Admin
