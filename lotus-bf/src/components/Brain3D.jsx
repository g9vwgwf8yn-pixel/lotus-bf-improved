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

  // Build an exposed-face surface from thresholded NIfTI voxels, not point markers.
  // Neighboring active voxels share faces and therefore form solid red regions.
  const active = useMemo(() => {
    if (!background || !activation || activation.dims.join(',') !== background.dims.join(',')) return []
    const [nx, ny, nz] = background.dims
    const step = 2
    const sx = Math.ceil(nx / step), sy = Math.ceil(ny / step), sz = Math.ceil(nz / step)
    const occupied = new Uint8Array(sx * sy * sz)
    const idx = (x, y, z) => x + sx * (y + sy * z)
    const cutoff = threshold ?? 0
    for (let z = 0; z < sz; z++) for (let y = 0; y < sy; y++) for (let x = 0; x < sx; x++) {
      const xx = Math.min(nx - 1, x * step), yy = Math.min(ny - 1, y * step), zz = Math.min(nz - 1, z * step)
      const raw = activation.data[xx + nx * (yy + ny * zz)]
      const value = absoluteValues ? Math.abs(raw) : raw
      if (Number.isFinite(raw) && raw !== 0 && (!positiveOnly || raw > 0) && value >= cutoff) occupied[idx(x,y,z)] = 1
    }
    const quads = []
    const norm = (x,y,z) => [(x * step - nx/2)/nx, (z * step - nz/2)/nz, (y * step - ny/2)/ny]
    const dirs = [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]]
    for (let z = 0; z < sz; z++) for (let y = 0; y < sy; y++) for (let x = 0; x < sx; x++) {
      if (!occupied[idx(x,y,z)]) continue
      for (const [dx,dy,dz] of dirs) {
        const xx=x+dx,yy=y+dy,zz=z+dz
        if (xx>=0 && xx<sx && yy>=0 && yy<sy && zz>=0 && zz<sz && occupied[idx(xx,yy,zz)]) continue
        const a=x+(dx>0?1:0),b=y+(dy>0?1:0),c=z+(dz>0?1:0)
        let corners
        if (dx) corners=[[a,y,z],[a,y+1,z],[a,y+1,z+1],[a,y,z+1]]
        else if (dy) corners=[[x,b,z],[x+1,b,z],[x+1,b,z+1],[x,b,z+1]]
        else corners=[[x,y,c],[x+1,y,c],[x+1,y+1,c],[x,y+1,c]]
        quads.push(corners.map(q => norm(...q)))
      }
    }
    return quads
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
        return { a, b, c, depth: (a[2] + b[2] + c[2]) / 3, light: clamp(0.50 + cross / (size * size * 0.014), 0.15, 1) }
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
        if (light > 0.68) {
          ctx.strokeStyle = `rgba(104,211,218,${0.025 + light * 0.045})`
          ctx.lineWidth = 0.6
          ctx.stroke()
        }
      }
    }

    // Activation samples come from the selected query's NIfTI volume, not
    // from the decorative brain mesh. They are intentionally visible through it.
    const patches = active.map(quad => {
      const points = quad.map(project)
      return { points, depth: points.reduce((sum, p) => sum + p[2], 0) / 4 }
    }).sort((a,b) => a.depth - b.depth)
    ctx.fillStyle = 'rgba(245,45,57,0.91)'
    for (const patch of patches) {
      ctx.beginPath()
      ctx.moveTo(patch.points[0][0], patch.points[0][1])
      for (let j=1;j<4;j++) ctx.lineTo(patch.points[j][0],patch.points[j][1])
      ctx.closePath()
      ctx.fill()
    }

    ctx.textAlign = 'center'
    ctx.font = `${Math.max(11, Math.round(size * 0.028))}px system-ui, sans-serif`
    ctx.fillStyle = '#a8c4ce'
    if (!mesh) ctx.fillText('Loading brain surface…', size / 2, size / 2)
    else if (!active.length) ctx.fillText(activation ? 'No activation at the current threshold' : 'Select a term to show activation', size / 2, 24)
    ctx.textAlign = 'left'
    ctx.fillStyle = '#91aab4'
    ctx.fillText('Drag to rotate · Scroll to zoom', 14, size - 15)
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
    <div className="brain-3d-legend"><span>● Translucent cortical surface</span><span className="brain-3d-red">● Activation regions</span></div>
  </section>
}
