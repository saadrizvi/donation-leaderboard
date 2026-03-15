function StatusIndicator({ error, consecutiveFailures = 0 }) {
  let color = 'green'
  let label = ''

  if (consecutiveFailures >= 3) {
    color = 'red'
    label = 'Connection lost — retrying'
  } else if (consecutiveFailures >= 1) {
    color = 'yellow'
    label = 'Reconnecting…'
  }

  if (!label) return (
    <div className="status-indicator">
      <div className={`status-dot ${color}`} />
    </div>
  )

  return (
    <div className="status-indicator">
      <div className={`status-dot ${color}`} />
      <span>{label}</span>
    </div>
  )
}

export default StatusIndicator
