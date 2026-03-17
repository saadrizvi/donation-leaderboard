// overlay: { type: 'goal', milestone: 25|50|75|100 }
//         | { type: 'count', count: 10|25|50|100 }
//         | null

const GOAL_MESSAGES = {
  25:  { title: '25% There! 🎉',      sub: 'Keep the momentum going!' },
  50:  { title: 'Halfway There! 🌟',  sub: 'Amazing generosity, JazakAllah Khayran!' },
  75:  { title: '75% Reached! ✨',    sub: 'Almost at the goal!' },
  100: { title: 'Target Reached! 🏆', sub: 'Alhumdulillah! Goal met!' },
}

function MilestoneOverlay({ overlay }) {
  if (!overlay) return null

  if (overlay.type === 'goal') {
    const msg = GOAL_MESSAGES[overlay.milestone] || { title: `${overlay.milestone}%!`, sub: '' }
    return (
      <div className="milestone-overlay">
        <div className="milestone-overlay-content">
          <div className="milestone-overlay-title">{msg.title}</div>
          <div className="milestone-overlay-sub">{msg.sub}</div>
        </div>
      </div>
    )
  }

  if (overlay.type === 'count') {
    return (
      <div className="milestone-banner">
        <span className="milestone-banner-text">
          {overlay.count} Donors! JazakAllah Khayran 🤲
        </span>
      </div>
    )
  }

  return null
}

export default MilestoneOverlay
