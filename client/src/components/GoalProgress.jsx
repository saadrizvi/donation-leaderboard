function GoalProgress({ current, goal }) {
  const pct = Math.min((current / goal) * 100, 100)

  const ticks = [25, 50, 75, 100]

  function fmt(n) {
    return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })
  }

  return (
    <div className="goal-progress" aria-label="Goal progress">
      <div
        className="goal-progress-track"
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="goal-progress-fill" style={{ width: `${pct}%` }} />
        <div className="goal-progress-ticks">
          {ticks.map(t => (
            <div key={t} className="goal-tick" style={{ left: `${t}%` }} />
          ))}
        </div>
      </div>
      <div className="goal-progress-labels">
        <span>{fmt(current)}</span>
        <span>{Math.round(pct)}% of {fmt(goal)}</span>
      </div>
    </div>
  )
}

export default GoalProgress
