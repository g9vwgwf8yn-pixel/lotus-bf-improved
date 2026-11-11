import { useCallback } from 'react'
import { Terms } from './components/Terms'
import { QueryBuilder } from './components/QueryBuilder'
import { Studies } from './components/Studies'
import { NiiViewer } from './components/NiiViewer'
import { useUrlQueryState } from './hooks/useUrlQueryState'
import './App.css'

export default function App() {
  const [query, setQuery] = useUrlQueryState('q')
  const handlePickTerm = useCallback((term) => setQuery(term), [setQuery])
  return <div className="app">
    <header className="app__header"><h1 className="app__title">LoTUS-BF</h1></header>
    <div className="search-panel">
      <Terms onPickTerm={handlePickTerm} />
      <details className="advanced-query"><summary>Advanced search</summary>
        <p className="advanced-help">Combine two terms or brain coordinates. AND = both, OR = either, NOT = exclude the second.</p>
        <QueryBuilder query={query} setQuery={setQuery} />
      </details>
    </div>
    <div className="results-title"><h2>{query || 'Explore brain function'}</h2></div>
    <main className="results-grid">
      <section className="result-card brain-card" aria-label="Brain maps"><h3>Brain maps</h3><NiiViewer query={query} /></section>
      <section className="result-card studies-card" aria-label="Research papers"><Studies query={query} /></section>
    </main>
  </div>
}
