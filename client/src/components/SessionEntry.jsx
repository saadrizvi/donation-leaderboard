import { useState } from 'react'
import { createSession, getSession } from '../api.js'

function SessionEntry({ onSessionSet, joinOnly = false }) {
  const [customId, setCustomId] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleCreate() {
    setError('')
    setLoading(true)
    try {
      const session = await createSession()
      onSessionSet(session.id)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleJoin(e) {
    e.preventDefault()
    if (!customId.trim()) return
    setError('')
    setLoading(true)
    try {
      const session = await getSession(customId.trim().toUpperCase())
      onSessionSet(session.id)
    } catch (err) {
      setError('Session not found. Check the ID and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="session-entry-overlay">
      <div className="session-entry-card">
        <h1>Donor Board</h1>

        <form onSubmit={handleJoin}>
          <div className="form-group" style={{ marginBottom: '10px' }}>
            <label htmlFor="session-id-input">Session ID</label>
            <input
              id="session-id-input"
              type="text"
              placeholder="e.g. ABC123"
              value={customId}
              onChange={e => setCustomId(e.target.value.toUpperCase())}
              maxLength={20}
              autoCapitalize="characters"
              autoFocus
            />
          </div>
          <button
            className="btn btn-primary"
            style={{ width: '100%' }}
            type="submit"
            disabled={loading || !customId.trim()}
          >
            {loading ? 'Connecting…' : 'Join Session'}
          </button>
        </form>

        {!joinOnly && (
          <>
            <div className="session-entry-divider">— or —</div>
            <button
              className="btn btn-secondary"
              style={{ width: '100%' }}
              onClick={handleCreate}
              disabled={loading}
            >
              Create New Session
            </button>
          </>
        )}

        {error && <p className="form-error" style={{ marginTop: '10px', textAlign: 'center' }}>{error}</p>}
      </div>
    </div>
  )
}

export default SessionEntry
