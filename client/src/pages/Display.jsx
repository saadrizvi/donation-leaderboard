import { useState, useEffect, useRef } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { usePolling } from '../hooks/usePolling.js'
import SessionEntry from '../components/SessionEntry.jsx'
import DonorGrid from '../components/DonorGrid.jsx'
import TotalsBar from '../components/TotalsBar.jsx'
import IframeEmbed from '../components/IframeEmbed.jsx'
import StatusIndicator from '../components/StatusIndicator.jsx'
import TickerBar from '../components/TickerBar.jsx'
import Thermometer from '../components/Thermometer.jsx'
import MilestoneOverlay from '../components/MilestoneOverlay.jsx'
import '../styles/display.css'

const LS_KEY = 'donor_board_kiosk_session'

// Milestones to watch for
const GOAL_MILESTONES = [25, 50, 75, 100]
const COUNT_MILESTONES = [10, 25, 50, 100]

function Display() {
  const { sessionId: paramId } = useParams()
  const [searchParams] = useSearchParams()
  const [sessionId, setSessionId] = useState(() => {
    const code = paramId || searchParams.get('code')
    return code ? code.toUpperCase() : (localStorage.getItem(LS_KEY) || null)
  })
  const { session, loading, error, consecutiveFailures } = usePolling(sessionId)

  // Milestone tracking
  const prevTotalRef = useRef(null)
  const prevCountRef = useRef(null)
  const shownMilestonesRef = useRef(new Set())
  const [activeOverlay, setActiveOverlay] = useState(null)

  useEffect(() => {
    if (!session || session.milestonesEnabled === false) return

    const total = session.donors.reduce((sum, d) => sum + d.amount, 0)
    const count = session.donors.length

    // Goal % milestones
    if (session.goal && prevTotalRef.current !== null) {
      const prevPct = (prevTotalRef.current / session.goal) * 100
      const pct = (total / session.goal) * 100
      let toShow = null
      for (const m of GOAL_MILESTONES) {
        if (prevPct < m && pct >= m && !shownMilestonesRef.current.has(`goal_${m}`)) {
          shownMilestonesRef.current.add(`goal_${m}`)
          toShow = m
        }
      }
      if (toShow !== null) {
        setActiveOverlay({ type: 'goal', milestone: toShow })
        setTimeout(() => setActiveOverlay(null), 4000)
      }
    }

    // Donor count milestones (only if no goal overlay is about to fire)
    if (prevCountRef.current !== null) {
      let toShow = null
      for (const m of COUNT_MILESTONES) {
        if (prevCountRef.current < m && count >= m && !shownMilestonesRef.current.has(`count_${m}`)) {
          shownMilestonesRef.current.add(`count_${m}`)
          toShow = m
        }
      }
      if (toShow !== null) {
        setActiveOverlay({ type: 'count', count: toShow })
        setTimeout(() => setActiveOverlay(null), 4000)
      }
    }

    prevTotalRef.current = total
    prevCountRef.current = count
  }, [session])

  function handleSessionSet(id) {
    localStorage.setItem(LS_KEY, id)
    setSessionId(id)
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
    localStorage.removeItem(LS_KEY)
    return <SessionEntry joinOnly onSessionSet={handleSessionSet} />
  }

  if (!session) return null

  const theme = session.theme || 'dark'
  const isSplit = session.iframeMode === 'split' && session.iframeUrl
  const isRotate = session.iframeMode === 'rotate' && session.iframeUrl
  const iframePosition = session.iframePosition ?? 'right'
  const isSummaryMode = (session.displayMode ?? 'live') === 'summary'

  const iframeNode = (isSplit || isRotate) ? (
    <IframeEmbed url={session.iframeUrl} mode={session.iframeMode} />
  ) : null

  const totalAmount = session.donors.reduce((sum, d) => sum + d.amount, 0)

  const summaryContent = (
    <>
      <div className="thank-you">{session.thankYouMessage || 'Thank you for your generosity!'}</div>
      <div className="summary-stats">
        <div className="summary-stat">
          <div className="summary-stat-value">{session.donors.length}</div>
          <div className="summary-stat-label">Donors</div>
        </div>
        <div className="summary-stat">
          <div className="summary-stat-value">
            {totalAmount.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })}
          </div>
          <div className="summary-stat-label">Collected</div>
        </div>
      </div>
      {session.goal && (
        <Thermometer
          current={totalAmount}
          goal={session.goal}
          reachedMessage={session.targetReachedMessage}
          remainingMessage={session.targetRemainingMessage}
        />
      )}
    </>
  )

  return (
    <div className="display-page" data-theme={theme}>
      {session.title && (
        <div className="display-title-bar">
          <h1 className="display-org-title">{session.title}</h1>
        </div>
      )}

      {isSummaryMode ? (
        <div className="display-body">
          <div className={`donor-grid-container${iframeNode ? ` summary-with-iframe${iframePosition === 'left' ? ' iframe-left' : ''}` : ''}`}>
            <div className="summary-display">
              {summaryContent}
            </div>
            {iframeNode && (
              <div className="summary-iframe-side">
                {iframeNode}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className={`display-body${isSplit ? ` split${iframePosition === 'left' ? ' iframe-left' : ''}` : ''}`}>
          <div className="donor-grid-container">
            <DonorGrid
              donors={session.donors}
              pageSize={8}
              firstPage={isRotate ? iframeNode : null}
            />
          </div>
          {isSplit && iframeNode}
        </div>
      )}

      {!isSummaryMode && <TotalsBar session={session} />}

      <TickerBar message={session.tickerMessage} />

      {/* QR Code corner */}
      {session.qrEnabled && session.qrUrl && (
        <div className="qr-corner">
          <QRCodeSVG value={session.qrUrl} size={96} />
          <div className="qr-label">Scan to visit</div>
        </div>
      )}

      {/* Milestone overlays */}
      <MilestoneOverlay overlay={activeOverlay} />

      <StatusIndicator consecutiveFailures={consecutiveFailures} error={error} />
    </div>
  )
}

export default Display
