import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import History from './views/History.tsx'
import LiveRun from './views/LiveRun.tsx'
import NewRun from './views/NewRun.tsx'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<NewRun />} />
          <Route path="/runs/:runId/live" element={<LiveRun />} />
          <Route path="/history" element={<History />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
