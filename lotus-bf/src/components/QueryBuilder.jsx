import { useEffect, useState } from 'react'

export function QueryBuilder({ query, setQuery }) {
  const [first, setFirst] = useState('')
  const [operator, setOperator] = useState('AND')
  const [second, setSecond] = useState('')

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
      <input aria-label="First term or coordinate" value={first} onChange={e => setFirst(e.target.value)} placeholder="First term or [x,y,z]" />
      <select aria-label="Search operator" value={operator} onChange={e => setOperator(e.target.value)}>
        <option value="AND">AND</option>
        <option value="OR">OR</option>
        <option value="NOT">NOT</option>
      </select>
      <input aria-label="Second term or coordinate" value={second} onChange={e => setSecond(e.target.value)} placeholder="Second term (optional)" />
      <button type="submit" className="qb-simple__submit">Search</button>
    </form>
  )
}
