import GoalProgress from './GoalProgress.jsx'

function TotalsBar({ session }) {
  if (!session) return null

  const total = session.donors.reduce((sum, d) => sum + d.amount, 0)
  const count = session.donors.length

  const totalFmt = total.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })

  return (
    <div className="totals-bar">
      <div className="totals-stat">
        <span className="totals-stat-value">{count}</span>
        <span className="totals-stat-label">Contributors</span>
      </div>
      <div className="totals-divider" />
      <div className="totals-stat">
        <span className="totals-stat-value">{totalFmt}</span>
        <span className="totals-stat-label">Collected</span>
      </div>
      {session.goal && (
        <>
          <div className="totals-divider" />
          <div className="totals-goal">
            <GoalProgress current={total} goal={session.goal} />
          </div>
        </>
      )}
    </div>
  )
}

export default TotalsBar
