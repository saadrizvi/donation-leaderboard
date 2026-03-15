import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home.jsx'
import Admin from './pages/Admin.jsx'
import Display from './pages/Display.jsx'
import Summary from './pages/Summary.jsx'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/display" element={<Display />} />
      <Route path="/display/:sessionId" element={<Display />} />
      <Route path="/summary/:sessionId" element={<Summary />} />
    </Routes>
  )
}

export default App
