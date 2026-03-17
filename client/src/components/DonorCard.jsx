const ANIM_CLASSES = ['anim-slide-up', 'anim-pop-in', 'anim-slide-left']

function DonorCard({ donor, isNewest }) {
  const amount = donor.amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })

  const animClass = isNewest
    ? ANIM_CLASSES[donor.id.charCodeAt(0) % 3]
    : ''

  return (
    <div className={`donor-card${animClass ? ' ' + animClass : ''}`}>
      {isNewest && <span className="donor-card-badge">✨ New</span>}
      <div className="donor-card-name">{donor.displayName}</div>
      <div className="donor-card-amount">{amount}</div>
    </div>
  )
}

export default DonorCard
