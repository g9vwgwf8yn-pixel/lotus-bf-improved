import { useCallback } from 'react'
import { Terms } from './components/Terms'
import { QueryBuilder } from './components/QueryBuilder'
import { Studies } from './components/Studies'
import { NiiViewer } from './components/NiiViewer'
import { useUrlQueryState } from './hooks/useUrlQueryState'
import './App.css'

export default function App () {
  const [query, setQuery] = useUrlQueryState('q')
  const handlePickTerm = useCallback((term) => {
    setQuery(q => q ? `${q} ${term}` : term)
  }, [setQuery])
  return (
    <div className="app">
      <header className="app__header">
        <div className="app__eyebrow">NEUROINFORMATICS · RESEARCH TOOL</div>
        <div className="app__header-row">
          <div>
            <h1 className="app__title">LoTUS-BF <span>研究資料查詢</span></h1>
            <p className="app__subtitle">Location-or-Term Unified Search for Brain Functions</p>
          </div>
        </div>
      </header>

      <main className="app__grid">
        <section className="card card--terms" aria-label="術語搜尋">
          <div className="section-label">01 <span>術語搜尋</span></div>
          <Terms onPickTerm={handlePickTerm} />
        </section>
        <section className="card card--results" aria-label="查詢與研究結果">
          <div className="section-label">02 <span>查詢條件與研究列表</span></div>
          <QueryBuilder query={query} setQuery={setQuery} />
          <div className="divider" />
          <Studies query={query} />
        </section>
        <section className="card card--viewer" aria-label="腦部影像">
          <div className="section-label">03 <span>腦部影像</span></div>
          <NiiViewer query={query} />
        </section>
      </main>
      <footer className="app__footer">LoTUS-BF · Neurosynth-based research exploration · 查詢結果僅供研究與教學使用</footer>
    </div>
  )
}
