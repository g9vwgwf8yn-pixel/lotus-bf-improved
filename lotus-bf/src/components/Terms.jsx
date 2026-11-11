import { useEffect, useState } from 'react'

export function Terms({ onPickTerm }) {
  const [search, setSearch] = useState('')
  const [terms, setTerms] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const value = search.trim()
    if (!value) { setTerms([]); setError(''); setLoading(false); return }
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setLoading(true); setError('')
      try {
        const response = await fetch(`/terms?search=${encodeURIComponent(value)}&limit=40`, { signal: controller.signal })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const data = await response.json()
        if (!controller.signal.aborted) setTerms(Array.isArray(data.terms) ? data.terms : [])
      } catch (e) {
        if (!controller.signal.aborted) { setError('無法載入術語建議，請稍後重試'); setTerms([]) }
      } finally { if (!controller.signal.aborted) setLoading(false) }
    }, 250)
    return () => { clearTimeout(timer); controller.abort() }
  }, [search])

  const submit = () => { const value = search.trim(); if (value) { onPickTerm(value); setSearch('') } }

  return <div className="terms">
    <div className="terms__controls">
      <input className="input" value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => { if (e.key === "Enter") submit() }} placeholder="輸入任意腦功能術語…" aria-label="搜尋術語" />
      {search && <button type="button" onClick={submit}>查詢</button>}
      {search && <button type="button" onClick={() => setSearch('')}>清除</button>}
    </div>
    {loading && <p className="terms__hint">正在搜尋…</p>}
    {error && <p role="alert" className="terms__error">{error}</p>}
    {!search.trim() && <p className="terms__hint">輸入關鍵字，即可查看資料庫中的相關術語。</p>}
    {search.trim() && !loading && !error && <div className="terms__list" role="listbox" aria-label="術語建議">
      {terms.length === 0 ? <p className="terms__hint">找不到符合的術語</p> : terms.map(term =>
        <button className="terms__suggestion" key={term} role="option" aria-selected="false" onClick={() => { onPickTerm(term); setSearch('') }}>{term}</button>
      )}
    </div>}
  </div>
}
