import { useEffect, useMemo, useRef, useState } from 'react'

// The cortical surface is extracted from the same MNI 2 mm template used by
// the orthogonal slice viewer. Coordinates match the activation voxel indices.
const INITIAL_ANGLE = { yaw: -0.65, pitch: 0.17 }
const clamp = (value, low, high) => Math.min(high, Math.max(low, value))

export function Brain3D({ background, activation, threshold, positiveOnly, absoluteValues, opacity = 0.5 }) {
  const canvasRef = useRef(null)
  const angles = useRef({ ...INITIAL_ANGLE })
  const zoom = useRef(0.68)
  const drag = useRef(null)
  const [mesh, setMesh] = useState(null)
  const [viewVersion, setViewVersion] = useState(0)
  const [canvasSize, setCanvasSize] = useState(400)

  useEffect(() => {
    const controller = new AbortController()
    fetch('/static/brain_surface_mesh.json', { signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error(`Mesh HTTP ${response.status}`); return response.json() })
      .then(setMesh)
      .catch(error => { if (error.name !== 'AbortError') console.error('Unable to load brain surface', error) })
    return () => controller.abort()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const observer = new ResizeObserver(entries => {
      const width = Math.max(1, Math.round(entries[0].contentRect.width))
      setCanvasSize(width)
    })
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [])

  // Continuous interpolated isosurface (marching tetrahedra) of the actual NIfTI
  // activation field. Unlike voxel faces, interpolated triangles have no block edges.
  const active = useMemo(() => {
    if (!background || !activation || activation.dims.join(',') !== background.dims.join(',')) return []
    const [nx, ny, nz] = background.dims
    const stride = 2
    const sx = Math.ceil(nx / stride) + 1, sy = Math.ceil(ny / stride) + 1, sz = Math.ceil(nz / stride) + 1
    const index = (x,y,z) => x + sx * (y + sy*z)
    const field = new Float32Array(sx*sy*sz)
    const thresholdValue = threshold ?? 0
    for (let z=0;z<sz;z++) for (let y=0;y<sy;y++) for (let x=0;x<sx;x++) {
      const xx=Math.min(nx-1,x*stride), yy=Math.min(ny-1,y*stride), zz=Math.min(nz-1,z*stride)
      const raw=activation.data[xx+nx*(yy+ny*zz)]
      field[index(x,y,z)] = Number.isFinite(raw) && raw!==0 && (!positiveOnly || raw>0) ? (absoluteValues ? Math.abs(raw) : raw) : 0
    }
    // A small 3D blur softens the staircase produced by the 2 mm sampling grid.
    const smooth = new Float32Array(field.length)
    for(let z=1;z<sz-1;z++) for(let y=1;y<sy-1;y++) for(let x=1;x<sx-1;x++) {
      let sum=0, weight=0
      for(let dz=-1;dz<=1;dz++) for(let dy=-1;dy<=1;dy++) for(let dx=-1;dx<=1;dx++) {
        const w=(dx===0?2:1)*(dy===0?2:1)*(dz===0?2:1)
        sum+=field[index(x+dx,y+dy,z+dz)]*w; weight+=w
      }
      smooth[index(x,y,z)]=sum/weight
    }
    const iso=Math.max(0.000001,thresholdValue*0.78)
    const offsets=[[0,0,0],[1,0,0],[1,1,0],[0,1,0],[0,0,1],[1,0,1],[1,1,1],[0,1,1]]
    const tetra=[[0,5,1,6],[0,1,2,6],[0,2,3,6],[0,3,7,6],[0,7,4,6],[0,4,5,6]]
    const coord=(x,y,z)=>[(x*stride-nx/2)/nx,(z*stride-nz/2)/nz,(y*stride-ny/2)/ny]
    const triangles=[]
    const interpolate=(a,b,va,vb)=>{
      const t=clamp((iso-va)/(vb-va||1),0,1)
      return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t]
    }
    for(let z=1;z<sz-2;z++) for(let y=1;y<sy-2;y++) for(let x=1;x<sx-2;x++) {
      const values=offsets.map(([dx,dy,dz])=>smooth[index(x+dx,y+dy,z+dz)])
      if(Math.max(...values)<iso || Math.min(...values)>=iso) continue
      const points=offsets.map(([dx,dy,dz])=>coord(x+dx,y+dy,z+dz))
      for(const tet of tetra){
        const inside=tet.filter(i=>values[i]>=iso),outside=tet.filter(i=>values[i]<iso)
        if(!inside.length||!outside.length)continue
        const edge=(a,b)=>interpolate(points[a],points[b],values[a],values[b])
        if(inside.length===1){const a=inside[0];triangles.push([edge(a,outside[0]),edge(a,outside[1]),edge(a,outside[2])])}
        else if(outside.length===1){const a=outside[0];triangles.push([edge(a,inside[0]),edge(a,inside[2]),edge(a,inside[1])])}
        else {const [a,b]=inside,[c,d]=outside;const p=edge(a,c),q=edge(a,d),r=edge(b,c),t=edge(b,d);triangles.push([p,q,r],[q,t,r])}
      }
    }
    return triangles
  }, [background, activation, threshold, positiveOnly, absoluteValues])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const size = canvasSize
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = Math.round(size * dpr)
    canvas.height = Math.round(size * dpr)
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.fillStyle = '#03090d'
    ctx.fillRect(0, 0, size, size)

    const { yaw, pitch } = angles.current
    const cy = Math.cos(yaw), sy = Math.sin(yaw)
    const cp = Math.cos(pitch), sp = Math.sin(pitch)
    const scale = size * 1.35 * zoom.current
    const project = ([x, y, z]) => {
      const rx = x * cy + z * sy
      const rz = -x * sy + z * cy
      const ry = y * cp - rz * sp
      const depth = y * sp + rz * cp
      return [size / 2 + rx * scale, size / 2 - ry * scale, depth]
    }

    if (mesh) {
      const projected = mesh.vertices.map(project)
      const triangles = mesh.faces.map(face => {
        const a = projected[face[0]], b = projected[face[1]], c = projected[face[2]]
        const ux = b[0] - a[0], uy = b[1] - a[1]
        const vx = c[0] - a[0], vy = c[1] - a[1]
        const cross = ux * vy - uy * vx
        return { a, b, c, depth: (a[2] + b[2] + c[2]) / 3, light: clamp(0.53 + cross / (size * size * 0.006), 0.12, 1) }
      }).sort((a, b) => a.depth - b.depth)

      // Painter's algorithm: filled, connected triangles rather than voxel dots.
      // Transparent teal allows red NIfTI activations to remain visible.
      for (const tri of triangles) {
        const light = tri.light
        ctx.beginPath()
        ctx.moveTo(tri.a[0], tri.a[1])
        ctx.lineTo(tri.b[0], tri.b[1])
        ctx.lineTo(tri.c[0], tri.c[1])
        ctx.closePath()
        ctx.fillStyle = `rgba(${Math.round(16 + light * 25)},${Math.round(99 + light * 73)},${Math.round(113 + light * 76)},${0.37 + opacity * 0.23})`
        ctx.fill()
        // Fine outlines emphasize the sulci without showing individual mesh vertices.
        if (light > 0.82) {
          ctx.strokeStyle = `rgba(104,211,218,${0.015 + light * 0.018})`
          ctx.lineWidth = 0.6
          ctx.stroke()
        }
      }
    }

    // Activation samples come from the selected query's NIfTI volume, not
    // from the decorative brain mesh. They are intentionally visible through it.
    const patches = active.map(tri => {
      const points = tri.map(project)
      return { points, depth: points.reduce((sum, p) => sum + p[2], 0) / 3 }
    }).sort((a,b) => a.depth - b.depth)
    ctx.fillStyle = 'rgba(239,58,72,0.40)'
    for (const patch of patches) {
      ctx.beginPath()
      ctx.moveTo(patch.points[0][0], patch.points[0][1])
      ctx.lineTo(patch.points[1][0], patch.points[1][1])
      ctx.lineTo(patch.points[2][0], patch.points[2][1])
      ctx.closePath()
      ctx.fill()
    }

    ctx.textAlign = 'center'
    ctx.font = `${Math.max(11, Math.round(size * 0.028))}px system-ui, sans-serif`
    ctx.fillStyle = '#a8c4ce'
    if (!mesh) ctx.fillText('Loading brain surface…', size / 2, size / 2)
    else if (!active.length) ctx.fillText(activation ? 'No activation at the current threshold' : 'Select a term to show activation', size / 2, 24)
  }, [mesh, active, canvasSize, viewVersion, opacity, activation])

  const onPointerDown = event => {
    drag.current = { x: event.clientX, y: event.clientY }
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  const onPointerMove = event => {
    if (!drag.current) return
    angles.current.yaw += (event.clientX - drag.current.x) * 0.009
    angles.current.pitch = clamp(angles.current.pitch + (event.clientY - drag.current.y) * 0.009, -1.45, 1.45)
    drag.current = { x: event.clientX, y: event.clientY }
    setViewVersion(version => version + 1)
  }
  const onWheel = event => {
    event.preventDefault()
    zoom.current = clamp(zoom.current * (event.deltaY > 0 ? 0.92 : 1.08), 0.22, 2.5)
    setViewVersion(version => version + 1)
  }
  return <section className="brain-3d-panel" aria-label="Interactive 3D brain map">
    <div className="brain-3d-heading"><strong>3D brain activation</strong><button type="button" onClick={() => { angles.current = { ...INITIAL_ANGLE }; zoom.current = 0.68; setViewVersion(version => version + 1) }}>Reset view</button></div>
    <canvas ref={canvasRef} className="brain-3d-canvas" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={() => { drag.current = null }} onPointerCancel={() => { drag.current = null }} onWheel={onWheel} />
  </section>
}
