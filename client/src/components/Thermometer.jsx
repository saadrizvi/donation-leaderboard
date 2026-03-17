const DEFAULT_REACHED   = 'Target Reached! Alhumdulillah, {over} over target'
const DEFAULT_REMAINING = '{remaining} left to reach target'

function Thermometer({ current, goal, reachedMessage, remainingMessage }) {
  if (!goal || goal <= 0) return null

  const pct = current / goal
  const displayPct = Math.min(pct, 1.1)
  const fillHeight = `${(displayPct / 1.1) * 100}%`

  const remaining = goal - current
  const isReached = current >= goal
  const over = current - goal

  function fmt(n) {
    return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })
  }

  const statusText = isReached
    ? (reachedMessage || DEFAULT_REACHED).replace('{over}', fmt(over))
    : (remainingMessage || DEFAULT_REMAINING).replace('{remaining}', fmt(remaining))

  const ticks = [0, 0.25, 0.5, 0.75, 1]

  return (
    <div className="thermometer">
      <div className="thermo-tube-wrapper">
        <div className="thermo-labels">
          {ticks.map(t => (
            <span key={t}>{fmt(goal * t)}</span>
          ))}
        </div>
        <div className="thermo-tube">
          <div className="thermo-fill" style={{ height: fillHeight }} />
          <div className="thermo-ticks">
            {ticks.map(t => (
              <div key={t} className="thermo-tick" />
            ))}
          </div>
        </div>
      </div>
      <div className={`thermo-status${isReached ? ' reached' : ''}`}>
        {statusText}
      </div>
    </div>
  )
}

export default Thermometer
