import { useCallback, useState } from 'react'
import { Terms } from './components/Terms'
import { QueryBuilder } from './components/QueryBuilder'
import { Studies } from './components/Studies'
import { NiiViewer } from './components/NiiViewer'
import { useUrlQueryState } from './hooks/useUrlQueryState'
import './App.css'

const examples = [
  { name: 'Memory', query: 'memory' },
  { name: 'Emotion', query: 'emotion' },
  { name: 'Memory AND Attention', query: 'memory AND attention' },
  { name: '座標 [0,0,0]', query: '[0,0,0]' },
]

export default function App () {
  const [query, setQuery] = useUrlQueryState('q')
  const [helpOpen, setHelpOpen] = useState(false)
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
          <button className="help-toggle" onClick={() => setHelpOpen(o => !o)} aria-expanded={helpOpen}>{helpOpen ? '收起使用說明' : '使用說明'}</button>
        </div>
        {helpOpen && <div className="help-panel">
          <strong>如何使用</strong>
          <p>① 在左側選擇術語，或直接輸入查詢條件。② 使用 AND、OR、NOT 組合條件。③ 查看符合的研究與右側腦部影像。</p>
          <p>座標格式：<code>[0,0,0]</code>。範例：<code>memory AND attention</code>。研究數量與影像依後端查詢結果產生。</p>
        </div>}
      </header>

      <div className="examples" aria-label="範例查詢">
        <span>快速查詢</span>
        {examples.map(ex => <button key={ex.name} onClick={() => setQuery(ex.query)} className={query === ex.query ? 'example active' : 'example'}>{ex.name}</button>)}
        {query && <button className="share-link" onClick={() => navigator.clipboard?.writeText(window.location.href)}>複製目前查詢連結</button>}
      </div>

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
