import { useEffect, useMemo, useState } from 'react'
let dictionary = null
let dictionaryPromise = null
function loadDictionary() {
  if (!dictionaryPromise) dictionaryPromise = fetch('/terms').then(r => { if (!r.ok) throw new Error('Dictionary unavailable'); return r.json() }).then(d => {
    dictionary = (d.terms || []).filter(Boolean).sort((a,b)=>a.localeCompare(b)); return dictionary
  }).catch(() => { dictionaryPromise = null; return null })
  return dictionaryPromise
}
export function Terms({ onPickTerm }) {
  const [search, setSearch] = useState('')
  const [dictionaryReady, setDictionaryReady] = useState(Boolean(dictionary))
  const [remote, setRemote] = useState([])
  useEffect(() => { let live=true; loadDictionary().then(d => { if(live && d) setDictionaryReady(true) }); return ()=>{live=false} }, [])
  const matches = useMemo(() => {
    const q=search.trim().toLowerCase(); if (!q) return []
    if (!dictionaryReady || !dictionary) return remote
    const starts=[], contains=[]
    for (const term of dictionary) { const t=term.toLowerCase(); if(t.startsWith(q)) starts.push(term); else if(t.includes(q)) contains.push(term); if(starts.length>=30) break }
    return starts.concat(contains).slice(0,30)
  }, [search, dictionaryReady, remote])
  useEffect(() => {
    if (dictionaryReady || !search.trim()) return
    const ac=new AbortController()
    const timer=setTimeout(()=>fetch(`/terms?search=${encodeURIComponent(search.trim())}&limit=30`,{signal:ac.signal}).then(r=>r.json()).then(d=>{if(!ac.signal.aborted)setRemote(d.terms||[])}).catch(()=>{}),80)
    return ()=>{clearTimeout(timer);ac.abort()}
  },[search,dictionaryReady])
  const choose=t=>{onPickTerm(t);setSearch('');setRemote([])}
  return <div className="terms">
    <div className="terms__controls"><input className="input" value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>{if(e.key==='Enter' && matches.length) choose(matches[0])}} placeholder="Search brain function terms..." aria-label="Search terms" autoComplete="off" />{search && <button type="button" onClick={()=>setSearch('')}>Clear</button>}</div>
    {search.trim() && <div className="terms__list" role="listbox" aria-label="Term suggestions">{matches.length ? matches.map(term=><button className="terms__suggestion" key={term} role="option" onClick={()=>choose(term)}>{term}</button>):<p className="terms__hint">{dictionaryReady?'No matching terms':'Loading term dictionary...'}</p>}</div>}
  </div>
}
