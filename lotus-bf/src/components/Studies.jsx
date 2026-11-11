import { useEffect, useMemo, useState } from 'react'

function classNames (...xs) { return xs.filter(Boolean).join(' ') }
function pubmedUrl(row) {
  const pmid = String(row.pmid || row.pubmed_id || '').trim()
  if (/^\d+$/.test(pmid)) return `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`
  const title = String(row.title || '').trim()
  return title ? `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(title + '[Title]')}` : null
}
function rowKey(row) { return String(row.study_id || row.doi || row.title || '') }

export function Studies ({ query, onStatusChange }) {
  const [rows, setRows] = useState([])
  useEffect(() => { onStatusChange?.(Boolean(query) && loading) }, [query, loading, onStatusChange])
  const [citations, setCitations] = useState({})
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [sortKey, setSortKey] = useState('year')
  const [sortDir, setSortDir] = useState('desc') // 'asc' | 'desc'
  const [page, setPage] = useState(1)
  const pageSize = 20

  useEffect(() => { setPage(1) }, [query])

  useEffect(() => {
    if (!query) { setRows([]); setErr(''); setLoading(false); return }
    let alive = true
    const ac = new AbortController()
    ;(async () => {
      setLoading(true)
      setErr('')
      try {
        const url = `/query/${encodeURIComponent(query)}/studies`
        const res = await fetch(url, { signal: ac.signal })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`)
        if (!alive) return
        const list = Array.isArray(data?.results) ? data.results : []
        setRows(list)
      } catch (e) {
        if (!alive) return
        setErr(`Unable to fetch studies: ${e?.message || e}`)
        setRows([])
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false; ac.abort() }
  }, [query])

  const changeSort = (key) => {
    if (key === sortKey) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('asc') }
  }

  const sorted = useMemo(() => {
    const arr = [...rows]
    const dir = sortDir === 'asc' ? 1 : -1
    arr.sort((a, b) => {
      const A = a?.[sortKey]
      const B = b?.[sortKey]
      // Numeric comparison for year; string comparison for other fields
      if (sortKey === 'citations') return ((citations[rowKey(a)] ?? -1) - (citations[rowKey(b)] ?? -1)) * dir
      if (sortKey === 'year') return (Number(A || 0) - Number(B || 0)) * dir
      return String(A || '').localeCompare(String(B || ''), 'en') * dir
    })
    return arr
  }, [rows, sortKey, sortDir, citations])

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const pageRows = sorted.slice((page - 1) * pageSize, page * pageSize)
  const pageSignature = pageRows.map(rowKey).join('|')
  useEffect(() => {
    if (!pageSignature) return
    const ac = new AbortController()
    const batch = pageRows.filter(r => citations[rowKey(r)] === undefined).map(r => ({id: rowKey(r), doi: r.doi || '', title: r.title || ''}))
    if (!batch.length) return
    fetch('/api/citations', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({papers:batch}), signal:ac.signal})
      .then(r => r.ok ? r.json() : null).then(data => {if (data?.counts && !ac.signal.aborted) setCitations(old => ({...old, ...data.counts}))}).catch(() => {})
    return () => ac.abort()
  // Citation retrieval is intentionally non-blocking; results appear as they arrive.
  }, [pageSignature])

  return (
    <div className='flex flex-col rounded-2xl border'>
      <div className='flex items-center justify-between p-3'>
        <div className='card__title'>Research papers <span className='citation-note'>(citation counts: OpenAlex, when available)</span></div>
        <div className='text-sm text-gray-500'>
           {/* {query ? `Query: ${query}` : 'Query: (empty)'} */}
        </div>
      </div>


      {query && loading && (
        <div className='grid gap-3 p-3'>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className='h-10 animate-pulse rounded-lg bg-gray-100' />
          ))}
        </div>
      )}

      {query && err && (
        <div className='mx-3 mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700'>
          {err}
        </div>
      )}

      {query && !loading && !err && (
        <div className='overflow-auto'>
          <table className='min-w-full text-sm'>
            <thead className='sticky top-0 bg-gray-50 text-left'>
              <tr>
                {[
                  { key: 'year', label: 'Year' },
                  { key: 'journal', label: 'Journal' },
                  { key: 'title', label: 'Title' },
                  { key: 'authors', label: 'Authors' },
                  { key: 'citations', label: 'Citations' }
                ].map(({ key, label }) => (
                  <th key={key} className='cursor-pointer px-3 py-2 font-semibold' onClick={() => changeSort(key)}>
                    <span className='inline-flex items-center gap-2'>
                      {label}
                      <span className='text-xs text-gray-500'>{sortKey === key ? (sortDir === 'asc' ? '▲' : '▼') : ''}</span>
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 ? (
                <tr><td colSpan={5} className='px-3 py-4 text-gray-500'>No data</td></tr>
              ) : (
                pageRows.map((r, i) => (
                  <tr key={i} className={classNames(i % 2 ? 'bg-white' : 'bg-gray-50')}>
                    <td className='whitespace-nowrap px-3 py-2 align-top'>{r.year ?? ''}</td>
                    <td className='px-3 py-2 align-top'>{pubmedUrl(r) ? <a className='journal-link' href={pubmedUrl(r)} target='_blank' rel='noopener noreferrer' title='Open paper on PubMed'>{r.journal || 'PubMed'}</a> : (r.journal || '')}</td>
                    <td className='max-w-[540px] px-3 py-2 align-top'><a className='paper-link' href={pubmedUrl(r) || '#'} target='_blank' rel='noopener noreferrer'>{r.title || ''}</a></td>
                    <td className='px-3 py-2 align-top'>{r.authors || ''}</td>
                    <td className='px-3 py-2 align-top'>{citations[rowKey(r)] ?? <span className='citation-muted'>—</span>}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {query && !loading && !err && (
        <div className='flex items-center justify-between border-t p-3 text-sm'>
          <div>Total <b>{sorted.length}</b> records, page <b>{page}</b>/<b>{totalPages}</b></div>
          <div className='flex items-center gap-2'>
            <button disabled={page <= 1} onClick={() => setPage(1)} className='rounded-lg border px-2 py-1 disabled:opacity-40'>⏮</button>
            <button disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} className='rounded-lg border px-2 py-1 disabled:opacity-40'>Previous</button>
            <button disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))} className='rounded-lg border px-2 py-1 disabled:opacity-40'>Next</button>
            <button disabled={page >= totalPages} onClick={() => setPage(totalPages)} className='rounded-lg border px-2 py-1 disabled:opacity-40'>⏭</button>
          </div>
        </div>
      )}
    </div>
  )
}

