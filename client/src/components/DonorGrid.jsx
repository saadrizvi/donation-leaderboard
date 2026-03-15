import { useState, useEffect, useRef } from 'react'
import DonorCard from './DonorCard.jsx'

function DonorGrid({ donors, pageSize = 8, firstPage }) {
  const [currentPage, setCurrentPage] = useState(0)
  const sorted = [...(donors || [])].sort((a, b) => b.amount - a.amount)

  const pages = []
  if (firstPage) pages.push(null) // page 0 = firstPage slot
  for (let i = 0; i < sorted.length; i += pageSize) {
    pages.push(sorted.slice(i, i + pageSize))
  }

  const totalPages = pages.length
  const intervalRef = useRef(null)

  useEffect(() => {
    if (totalPages <= 1) return
    intervalRef.current = setInterval(() => {
      setCurrentPage(p => (p + 1) % totalPages)
    }, 8000)
    return () => clearInterval(intervalRef.current)
  }, [totalPages])

  // Find newest donor
  const newestId = sorted.length
    ? sorted.reduce((a, b) => (a.createdAt > b.createdAt ? a : b)).id
    : null

  return (
    <div className="donor-grid-wrapper">
      {pages.map((page, idx) => {
        const isActive = idx === currentPage

        // firstPage slot
        if (page === null) {
          return (
            <div key="firstpage" className={`iframe-rotate-page${isActive ? ' active' : ''}`}>
              {firstPage}
            </div>
          )
        }

        return (
          <div key={idx} className={`donor-grid-page${isActive ? ' active' : ''}`}>
            {page.map(donor => (
              <DonorCard
                key={donor.id}
                donor={donor}
                isNewest={donor.id === newestId}
              />
            ))}
          </div>
        )
      })}
    </div>
  )
}

export default DonorGrid
