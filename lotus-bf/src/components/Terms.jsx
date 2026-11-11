import { useEffect, useState } from 'react'

export function Terms({ onPickTerm }) {
  const [search, setSearch] = useState('')
  const [terms, setTerms] = useState([])
  const [loading, setLoading] = useState(false)
  const cache = window.__termCache || (window.__termCache = new Map())
  const [error, setError] = useState('')

  useEffect(() => {
    const value = search.trim()
    if (!value) { setTerms([]); setError(''); setLoading(false); return }
    const cached = cache.get(value.toLowerCase())
    if (cached) { setTerms(cached); setLoading(false); setError(''); return }
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setLoading(true); setError('')
      try {
        const response = await fetch(`/terms?search=${encodeURIComponent(value)}&limit=40`, { signal: controller.signal })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const data = await response.json()
        if (!controller.signal.aborted) { const suggestions = Array.isArray(data.terms) ? data.terms : []; cache.set(value.toLowerCase(), suggestions); setTerms(suggestions) }
      } catch (e) {
        if (!controller.signal.aborted) { setError('Suggestions unavailable. Try again.'); setTerms([]) }
      } finally { if (!controller.signal.aborted) setLoading(false) }
    }, 90)
    return () => { clearTimeout(timer); controller.abort() }
  }, [search])

  const submit = () => { const value = search.trim(); if (value) { onPickTerm(value); setSearch('') } }

  return <div className="terms">
    <div className="terms__controls">
      <input className="input" value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => { if (e.key === "Enter") submit() }} placeholder="Search any brain function term..." aria-label="Search terms" />
      {search && <button type="button" onClick={submit}>Search</button>}
      {search && <button type="button" onClick={() => setSearch('')}>Clear</button>}
    </div>
    {loading && <p className="terms__hint">Searching...</p>}
    {error && <p role="alert" className="terms__error">{error}</p>}
    {!search.trim() && <p className="terms__hint">Type to see matching terms.</p>}
    {search.trim() && !loading && !error && <div className="terms__list" role="listbox" aria-label="Term suggestions">
      {terms.length === 0 ? <p className="terms__hint">No matching terms</p> : terms.map(term =>
        <button className="terms__suggestion" key={term} role="option" aria-selected="false" onClick={() => { onPickTerm(term); setSearch('') }}>{term}</button>
      )}
    </div>}
  </div>
}
