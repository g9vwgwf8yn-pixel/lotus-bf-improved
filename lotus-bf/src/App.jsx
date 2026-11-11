import { useCallback, useEffect, useState } from 'react'
import { Terms } from './components/Terms'
import { QueryBuilder } from './components/QueryBuilder'
import { Studies } from './components/Studies'
import { NiiViewer } from './components/NiiViewer'
import { useUrlQueryState } from './hooks/useUrlQueryState'
import './App.css'

export default function App() {
  const [query, setQuery] = useUrlQueryState('q')
  const [mapLoading, setMapLoading] = useState(Boolean(query))
  const [papersLoading, setPapersLoading] = useState(Boolean(query))
  const [showLoading, setShowLoading] = useState(Boolean(query))
  useEffect(() => { if(query) {setMapLoading(true);setPapersLoading(true);setShowLoading(true)} else setShowLoading(false) },[query])
  useEffect(() => {if(!mapLoading && !papersLoading) setShowLoading(false)},[mapLoading,papersLoading])
  const handlePickTerm = useCallback((term) => setQuery(term), [setQuery])
  return <div className="app">
    <header className="app__header"><h1 className="app__title">NeuroScope</h1></header>
    <div className="search-panel">
      <Terms onPickTerm={handlePickTerm} />
      <details className="advanced-query"><summary>Advanced search</summary>
        <p className="advanced-help">Combine two terms or brain coordinates. AND = both, OR = either, NOT = exclude the second.</p>
        <QueryBuilder query={query} setQuery={setQuery} />
      </details>
    </div>
    <div className="results-title"><h2>{query || 'Explore brain function'}</h2></div>
    {showLoading && <div className="global-loading" role="status"><span className="loading-spinner"/> Loading brain maps and research papers...</div>}
    <main className={`results-grid ${showLoading ? "results-pending" : ""}`}>
      <section className="result-card brain-card" aria-label="Brain maps"><h3>Brain maps</h3><NiiViewer query={query} onStatusChange={setMapLoading} /></section>
      <section className="result-card studies-card" aria-label="Research papers"><Studies query={query} onStatusChange={setPapersLoading} /></section>
    </main>
  </div>
}
