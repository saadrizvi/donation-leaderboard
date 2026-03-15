import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { getSession } from '../api.js'
import GoalProgress from '../components/GoalProgress.jsx'
import '../styles/display.css'
import '../styles/summary.css'

const RANK_EMOJI = { 1: '🥇', 2: '🥈', 3: '🥉', 4: '4th', 5: '5th' }

function Summary() {
  const { sessionId } = useParams()
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    getSession(sessionId)
      .then(setSession)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [sessionId])

  if (loading) {
    return (
      <div className="summary-page" style={{ textAlign: 'center', paddingTop: '80px', color: '#aaa' }}>
        Loading…
      </div>
    )
  }

  if (error || !session) {
    return (
      <div className="summary-page" style={{ textAlign: 'center', paddingTop: '80px' }}>
        <p style={{ color: '#dc3545' }}>Session not found.</p>
      </div>
    )
  }

  const sorted = [...session.donors].sort((a, b) => b.amount - a.amount)
  const top5 = sorted.slice(0, 5)
  const total = session.donors.reduce((sum, d) => sum + d.amount, 0)

  function fmt(n) {
    return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })
  }

  return (
    <div className="summary-page">
      <div className="summary-header">
        <h1>Thank You! 🎉</h1>
        <div className="summary-session-id">Session {sessionId}</div>
      </div>

      <button className="print-btn" onClick={() => window.print()}>
        Print / Save as PDF
      </button>

      {/* Top donors */}
      {top5.length > 0 && (
        <div style={{ marginBottom: 'var(--spacing-lg)' }}>
          <div className="summary-section-title">Top Donors</div>
          <div className="top-donors">
            {top5.map((donor, i) => {
              const rank = i + 1
              return (
                <div key={donor.id} className={`top-donor-card rank-${rank}`}>
                  <div className="top-donor-rank">{RANK_EMOJI[rank]}</div>
                  <div className="top-donor-name">{donor.displayName}</div>
                  <div className="top-donor-amount">{fmt(donor.amount)}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Totals */}
      <div className="summary-section-title">Final Totals</div>
      <div className="summary-totals">
        <div className="summary-total-stat">
          <span className="summary-total-value">{session.donors.length}</span>
          <span className="summary-total-label">Donors</span>
        </div>
        <div className="summary-total-stat">
          <span className="summary-total-value">{fmt(total)}</span>
          <span className="summary-total-label">Raised</span>
        </div>
        {session.goal && (
          <div className="summary-total-stat">
            <span className="summary-total-value">{fmt(session.goal)}</span>
            <span className="summary-total-label">Goal</span>
          </div>
        )}
      </div>

      {session.goal && (
        <div className="summary-goal-section">
          <GoalProgress current={total} goal={session.goal} />
        </div>
      )}
    </div>
  )
}

export default Summary
