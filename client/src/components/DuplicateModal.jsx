function DuplicateModal({ existingDonor, onConfirm, onCancel }) {
  const amount = existingDonor.amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  })

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <h2>Duplicate Donor?</h2>
        <p>
          A donor named <strong>{existingDonor.displayName}</strong> already exists
          with a {amount} donation. Are you sure you want to add another?
        </p>
        <div className="modal-actions">
          <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
          <button className="btn btn-primary btn-sm" onClick={onConfirm}>Add Anyway</button>
        </div>
      </div>
    </div>
  )
}

export default DuplicateModal
