// Props: message (string)
// Renders a scrolling marquee bar at the bottom of the screen
function TickerBar({ message }) {
  if (!message) return null

  return (
    <div className="ticker-bar">
      <div className="ticker-content">
        {message}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{message}
      </div>
    </div>
  )
}

export default TickerBar
