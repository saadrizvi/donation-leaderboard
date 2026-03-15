import { useState } from 'react'

function IframeEmbed({ url, mode, className }) {
  const [failed, setFailed] = useState(false)

  if (!url) return null

  return (
    <div className={`iframe-panel${className ? ' ' + className : ''}`}>
      {failed ? (
        <div className="iframe-fallback">Content unavailable</div>
      ) : (
        <iframe
          src={url}
          allow="autoplay; fullscreen"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-presentation"
          allowTransparency={true}
          onError={() => setFailed(true)}
          title="Embedded content"
          style={{ background: 'transparent' }}
        />
      )}
    </div>
  )
}

export default IframeEmbed
