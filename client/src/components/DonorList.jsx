function DonorList({ donors, onEdit, onDelete }) {
  if (!donors || donors.length === 0) {
    return <p style={{ color: '#aaa', textAlign: 'center', padding: '16px 0' }}>No donors yet.</p>
  }

  const sorted = [...donors].sort((a, b) => b.amount - a.amount)

  function isDuplicate(donor) {
    if (donor.isAnonymous) return false
    const name = (donor.firstName + donor.lastName).toLowerCase().replace(/\s/g, '')
    return donors.filter(d => {
      if (d.id === donor.id || d.isAnonymous) return false
      const dName = (d.firstName + d.lastName).toLowerCase().replace(/\s/g, '')
      return dName === name
    }).length > 0
  }

  function formatAmount(amount) {
    return amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
  }

  function handleDelete(donor) {
    if (window.confirm(`Delete ${donor.displayName}?`)) {
      onDelete(donor.id)
    }
  }

  return (
    <div className="donor-list">
      {sorted.map(donor => (
        <div key={donor.id} className="donor-row">
          <span className="donor-row-name">
            {donor.displayName}
            {isDuplicate(donor) && (
              <span className="duplicate-icon" title="Possible duplicate">⚠️</span>
            )}
          </span>
          <span className="donor-row-amount">{formatAmount(donor.amount)}</span>
          <div className="donor-row-actions">
            <button className="btn btn-secondary btn-sm" onClick={() => onEdit(donor)}>Edit</button>
            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(donor)}>Delete</button>
          </div>
        </div>
      ))}
    </div>
  )
}

export default DonorList
