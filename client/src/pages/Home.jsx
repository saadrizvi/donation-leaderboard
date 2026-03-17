import { Link } from 'react-router-dom'

function Home() {
  return (
    <main>
      <h1>Donor Board - Main </h1>
      <nav>
        <Link to="/admin">Admin</Link> <br></br>
        <Link to="/display">Display</Link>
      </nav>
    </main>
  )
}

export default Home
