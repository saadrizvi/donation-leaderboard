import { useState, useEffect } from 'react'

const EMPTY = { firstName: '', lastName: '', amount: '', isAnonymous: false }

function DonorForm({ onSubmit, loading, defaultValues }) {
  const [form, setForm] = useState(defaultValues || EMPTY)
  const [error, setError] = useState('')

  useEffect(() => {
    setForm(defaultValues || EMPTY)
    setError('')
  }, [defaultValues])

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const amount = parseFloat(form.amount)
    if (!form.amount || isNaN(amount) || amount <= 0) {
      setError('Amount is required and must be greater than 0.')
      return
    }
    setError('')
    try {
      await onSubmit({
        firstName: form.isAnonymous ? '' : form.firstName.trim(),
        lastName: form.isAnonymous ? '' : form.lastName.trim(),
        amount,
        isAnonymous: form.isAnonymous,
      })
      setForm(EMPTY)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="toggle-row" style={{ marginBottom: '10px' }}>
        <input
          id="anon-toggle"
          type="checkbox"
          checked={form.isAnonymous}
          onChange={e => set('isAnonymous', e.target.checked)}
        />
        <label htmlFor="anon-toggle">Anonymous donor</label>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>First Name</label>
          <input
            type="text"
            value={form.firstName}
            onChange={e => set('firstName', e.target.value)}
            disabled={form.isAnonymous}
            placeholder="Jane"
          />
        </div>
        <div className="form-group">
          <label>Last Name</label>
          <input
            type="text"
            value={form.lastName}
            onChange={e => set('lastName', e.target.value)}
            disabled={form.isAnonymous}
            placeholder="Doe"
          />
        </div>
      </div>

      <div className="form-group" style={{ marginBottom: '10px' }}>
        <label>Amount ($) *</label>
        <input
          type="number"
          value={form.amount}
          onChange={e => set('amount', e.target.value)}
          placeholder="0.00"
          min="0.01"
          step="0.01"
        />
      </div>

      {error && <p className="form-error">{error}</p>}

      <div className="form-actions">
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {defaultValues ? 'Save Changes' : 'Add Donor'}
        </button>
        {defaultValues && (
          <button className="btn btn-ghost" type="button" onClick={() => onSubmit(null)}>
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}

export default DonorForm
