import { useEffect, useMemo, useState } from 'react'

export function QueryBuilder({ query, setQuery }) {
  const [first, setFirst] = useState('')
  const [operator, setOperator] = useState('AND')
  const [second, setSecond] = useState('')
  const [dictionary, setDictionary] = useState([])
  const [focused, setFocused] = useState(null)
  useEffect(() => { const ac=new AbortController(); fetch('/terms',{signal:ac.signal}).then(r=>r.json()).then(d=>setDictionary(d.terms||[])).catch(()=>{}); return ()=>ac.abort() }, [])
  const suggestions = useMemo(() => { const q=(focused===1?first:second).trim().toLowerCase(); if(!q || /^[-+\d\[\],. ]+$/.test(q))return []; const starts=[],contains=[]; for(const term of dictionary){const v=term.toLowerCase();if(v.startsWith(q))starts.push(term);else if(v.includes(q))contains.push(term);if(starts.length>=12)break}return starts.concat(contains).slice(0,12) },[dictionary,first,second,focused])
  const choose=(term)=>{(focused===1?setFirst:setSecond)(term);setFocused(null)}

  useEffect(() => {
    const match = query.match(/^(.+?)\s+(AND|OR|NOT)\s+(.+)$/i)
    if (match) {
      setFirst(match[1]); setOperator(match[2].toUpperCase()); setSecond(match[3])
    } else {
      setFirst(query); setSecond('')
    }
  }, [query])

  function submit(event) {
    event.preventDefault()
    const a = first.trim()
    const b = second.trim()
    if (!a) return
    setQuery(b ? `${a} ${operator} ${b}` : a)
  }

  return (
    <form className="qb-simple" onSubmit={submit} aria-label="Advanced search">
      <div className="qb-term-wrap"><input aria-label="First term or coordinate" value={first} onFocus={()=>setFocused(1)} onChange={e => setFirst(e.target.value)} onKeyDown={e=>{if(e.key==='Escape')setFocused(null);if(e.key==='Enter'&&suggestions.length&&focused===1){e.preventDefault();choose(suggestions[0])}}} placeholder="First term or [x,y,z]" autoComplete="off" />{focused===1&&suggestions.length>0&&<div className="qb-suggestions">{suggestions.map(term=><button type="button" key={term} onMouseDown={e=>e.preventDefault()} onClick={()=>choose(term)}>{term}</button>)}</div>}</div>
      <select aria-label="Search operator" value={operator} onChange={e => setOperator(e.target.value)}>
        <option value="AND">AND</option>
        <option value="OR">OR</option>
        <option value="NOT">NOT</option>
      </select>
      <div className="qb-term-wrap"><input aria-label="Second term or coordinate" value={second} onFocus={()=>setFocused(2)} onChange={e => setSecond(e.target.value)} onKeyDown={e=>{if(e.key==='Escape')setFocused(null);if(e.key==='Enter'&&suggestions.length&&focused===2){e.preventDefault();choose(suggestions[0])}}} placeholder="Second term (optional)" autoComplete="off" />{focused===2&&suggestions.length>0&&<div className="qb-suggestions">{suggestions.map(term=><button type="button" key={term} onMouseDown={e=>e.preventDefault()} onClick={()=>choose(term)}>{term}</button>)}</div>}</div>
      <button type="submit" className="qb-simple__submit">Search</button>
    </form>
  )
}
