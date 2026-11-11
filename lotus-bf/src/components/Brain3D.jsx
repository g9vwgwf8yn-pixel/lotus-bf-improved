import { useEffect, useMemo, useRef, useState } from 'react'

// The cortical surface is extracted from the same MNI 2 mm template used by
// the orthogonal slice viewer. Coordinates match the activation voxel indices.
const INITIAL_ANGLE = { yaw: -0.65, pitch: 0.17 }
const clamp = (value, low, high) => Math.min(high, Math.max(low, value))

export function Brain3D({ background, activation, threshold, positiveOnly, absoluteValues, opacity = 0.5 }) {
  const canvasRef = useRef(null)
  const angles = useRef({ ...INITIAL_ANGLE })
  const zoom = useRef(1)
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

  const active = useMemo(() => {
    if (!background || !activation || activation.dims.join(',') !== background.dims.join(',')) return []
    const [nx, ny, nz] = background.dims
    const result = []
    const cutoff = threshold ?? 0
    for (let z = 1; z < nz - 1; z += 2) {
      for (let y = 1; y < ny - 1; y += 2) {
        for (let x = 1; x < nx - 1; x += 2) {
          const raw = activation.data[x + nx * (y + ny * z)]
          const value = absoluteValues ? Math.abs(raw) : raw
          if (Number.isFinite(raw) && raw !== 0 && (!positiveOnly || raw > 0) && value >= cutoff) {
            result.push([(x - nx / 2) / nx, (z - nz / 2) / nz, (y - ny / 2) / ny])
          }
        }
      }
    }
    return result
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
    const scale = size * 1.50 * zoom.current
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
        ctx.fillStyle = `rgba(${Math.round(16 + light * 25)},${Math.round(99 + light * 73)},${Math.round(113 + light * 76)},${0.13 + opacity * 0.16})`
        ctx.fill()
        // Fine outlines emphasize the sulci without showing individual mesh vertices.
        if (light > 0.68) {
          ctx.strokeStyle = `rgba(104,211,218,${0.018 + light * 0.026})`
          ctx.lineWidth = 0.6
          ctx.stroke()
        }
      }
    }

    // Activation samples come from the selected query's NIfTI volume, not
    // from the decorative brain mesh. They are intentionally visible through it.
    const dots = active.map(project).sort((a, b) => a[2] - b[2])
    for (const [x, y, depth] of dots) {
      const radius = clamp(size * 0.0045 * zoom.current * (1 + depth * 0.5), 1.2, 4.6)
      ctx.beginPath()
      ctx.arc(x, y, radius, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(255,${Math.round(45 + depth * 15)},62,${clamp(0.60 + opacity * 0.32, 0, 1)})`
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
    zoom.current = clamp(zoom.current * (event.deltaY > 0 ? 0.92 : 1.08), 0.65, 1.9)
    setViewVersion(version => version + 1)
  }
  return <section className="brain-3d-panel" aria-label="Interactive 3D brain map">
    <div className="brain-3d-heading"><strong>3D brain activation</strong><button type="button" onClick={() => { angles.current = { ...INITIAL_ANGLE }; zoom.current = 1; setViewVersion(version => version + 1) }}>Reset view</button></div>
    <canvas ref={canvasRef} className="brain-3d-canvas" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={() => { drag.current = null }} onPointerCancel={() => { drag.current = null }} onWheel={onWheel} />
    <div className="brain-3d-legend"><span>● Translucent cortical surface</span><span className="brain-3d-red">● Activation voxels</span></div>
  </section>
}
