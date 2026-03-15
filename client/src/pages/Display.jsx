import { useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { usePolling } from '../hooks/usePolling.js'
import SessionEntry from '../components/SessionEntry.jsx'
import DonorGrid from '../components/DonorGrid.jsx'
import TotalsBar from '../components/TotalsBar.jsx'
import IframeEmbed from '../components/IframeEmbed.jsx'
import StatusIndicator from '../components/StatusIndicator.jsx'
import '../styles/global.css'
import '../styles/display.css'

const LS_KEY = 'donor_board_kiosk_session'

function Display() {
  const { sessionId: paramId } = useParams()
  const [searchParams] = useSearchParams()
  const [sessionId, setSessionId] = useState(() => {
    const code = paramId || searchParams.get('code')
    return code ? code.toUpperCase() : (localStorage.getItem(LS_KEY) || null)
  })
  const [settingsOpen, setSettingsOpen] = useState(false)
  const { session, loading, error, consecutiveFailures } = usePolling(sessionId)

  function handleSessionSet(id) {
    localStorage.setItem(LS_KEY, id)
    setSessionId(id)
  }

  function handleClearSession() {
    localStorage.removeItem(LS_KEY)
    setSessionId(null)
    setSettingsOpen(false)
  }

  if (!sessionId) {
    return <SessionEntry joinOnly onSessionSet={handleSessionSet} />
  }

  if (loading && !session) {
    return (
      <div className="display-page" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--color-text-muted)' }}>Loading…</p>
      </div>
    )
  }

  if (error && !session) {
    // Stale session ID — clear it and drop back to entry screen
    localStorage.removeItem(LS_KEY)
    return <SessionEntry joinOnly onSessionSet={handleSessionSet} />
  }

  if (!session) return null

  const isSplit = session.iframeMode === 'split' && session.iframeUrl
  const isRotate = session.iframeMode === 'rotate' && session.iframeUrl

  const iframeNode = (isSplit || isRotate) ? (
    <IframeEmbed url={session.iframeUrl} mode={session.iframeMode} />
  ) : null

  return (
    <div className="display-page">
      <div className={`display-body${isSplit ? ' split' : ''}`}>
        <div className="donor-grid-container">
          <DonorGrid
            donors={session.donors}
            pageSize={8}
            firstPage={isRotate ? iframeNode : null}
          />
        </div>
        {isSplit && iframeNode}
      </div>

      <TotalsBar session={session} />

      {/* Settings cog */}
      <button
        className="display-settings-btn"
        onClick={() => setSettingsOpen(o => !o)}
        title="Settings"
      >
        ⚙
      </button>

      {settingsOpen && (
        <div className="display-settings-panel">
          <button onClick={handleClearSession}>Clear Session</button>
        </div>
      )}

      <StatusIndicator consecutiveFailures={consecutiveFailures} error={error} />
    </div>
  )
}

export default Display
