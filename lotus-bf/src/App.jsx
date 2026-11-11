import { useCallback, useState } from 'react'
import { Terms } from './components/Terms'
import { QueryBuilder } from './components/QueryBuilder'
import { Studies } from './components/Studies'
import { NiiViewer } from './components/NiiViewer'
import { useUrlQueryState } from './hooks/useUrlQueryState'
import './App.css'

export default function App () {
  const [query, setQuery] = useUrlQueryState('q')
  const [tab, setTab] = useState('maps')
  const handlePickTerm = useCallback((term) => {
    setQuery(term)
    setTab('maps')
  }, [setQuery])
  return (
    <div className="app">
      <header className="app__header">
        <div className="app__eyebrow">NEUROINFORMATICS · RESEARCH TOOL</div>
        <h1 className="app__title">LoTUS-BF <span>研究資料查詢</span></h1>
        <p className="app__subtitle">Location-or-Term Unified Search for Brain Functions</p>
      </header>
      <div className="search-panel">
        <div className="search-panel__heading">搜尋腦功能術語</div>
        <Terms onPickTerm={handlePickTerm} />
        <details className="advanced-query">
          <summary>進階查詢（AND / OR / NOT / 座標）</summary>
          <QueryBuilder query={query} setQuery={setQuery} />
        </details>
      </div>
      <main className="research-panel">
        <div className="research-panel__heading">
          <div>
            <h2>{query || '腦功能研究資料'}</h2>
            <p>搜尋術語後可切換腦圖與研究列表；在腦圖上點擊可同步更新三個切面。</p>
          </div>
        </div>
        <nav className="research-tabs" aria-label="研究結果檢視模式">
          <button type="button" role="tab" aria-selected={tab === 'maps'} className={tab === 'maps' ? 'active' : ''} onClick={() => setTab('maps')}>Maps 腦部影像</button>
          <button type="button" role="tab" aria-selected={tab === 'studies'} className={tab === 'studies' ? 'active' : ''} onClick={() => setTab('studies')}>Studies 研究列表</button>
        </nav>
        <section className="research-content" hidden={tab !== 'maps'} aria-label="腦部影像"><NiiViewer query={query} /></section>
        <section className="research-content" hidden={tab !== 'studies'} aria-label="研究列表"><Studies query={query} /></section>
      </main>
      <footer className="app__footer">LoTUS-BF · Neurosynth-based research exploration · 查詢結果僅供研究與教學使用</footer>
    </div>
  )
}
