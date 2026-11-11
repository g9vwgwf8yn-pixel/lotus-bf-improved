import { useEffect, useMemo, useRef, useState } from 'react'

// Interactive 3-D point-cloud rendering from the actual MNI template and query NIfTI.
// The transparent gray surface and red activation voxels share the same voxel coordinates.
export function Brain3D({ background, activation, threshold, positiveOnly, absoluteValues, opacity = 0.5 }) {
  const canvasRef = useRef(null)
  const angles = useRef({ yaw: -0.55, pitch: 0.18 })
  const drag = useRef(null)
  const [rotation, setRotation] = useState(0)

  const points = useMemo(() => {
    if (!background) return { shell: [], active: [] }
    const { data, dims: [nx, ny, nz], min, max } = background
    const shell = []
    const active = []
    const range = max - min || 1
    const inside = (x, y, z) => {
      if (x < 0 || y < 0 || z < 0 || x >= nx || y >= ny || z >= nz) return false
      return (data[x + nx * (y + ny * z)] - min) / range > 0.19
    }
    // Sampling the volume, rather than drawing an unrelated decorative brain model.
    for (let z = 2; z < nz - 2; z += 2) {
      for (let y = 2; y < ny - 2; y += 2) {
        for (let x = 2; x < nx - 2; x += 2) {
          if (!inside(x, y, z)) continue
          if (!(inside(x-3,y,z) && inside(x+3,y,z) && inside(x,y-3,z) && inside(x,y+3,z) && inside(x,y,z-3) && inside(x,y,z+3))) {
            shell.push([(x - nx / 2) / nx, (z - nz / 2) / nz, (y - ny / 2) / ny])
          }
        }
      }
    }
    if (activation && activation.dims.join(',') === background.dims.join(',')) {
      const a = activation.data
      const cutoff = threshold ?? 0
      for (let z = 1; z < nz - 1; z += 2) {
        for (let y = 1; y < ny - 1; y += 2) {
          for (let x = 1; x < nx - 1; x += 2) {
            const raw = a[x + nx * (y + ny * z)]
            const value = absoluteValues ? Math.abs(raw) : raw
            if ((!positiveOnly || raw > 0) && raw !== 0 && value >= cutoff) {
              active.push([(x - nx / 2) / nx, (z - nz / 2) / nz, (y - ny / 2) / ny])
            }
          }
        }
      }
    }
    return { shell, active }
  }, [background, activation, threshold, positiveOnly, absoluteValues])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const width = Math.max(320, Math.round(canvas.clientWidth || 600))
    const height = 350
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = width * dpr
    canvas.height = height * dpr
    const ctx = canvas.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.fillStyle = '#05080e'
    ctx.fillRect(0, 0, width, height)
    const { yaw, pitch } = angles.current
    const cy = Math.cos(yaw), sy = Math.sin(yaw)
    const cp = Math.cos(pitch), sp = Math.sin(pitch)
    const scale = Math.min(width * 0.78, height * 0.9)
    const project = ([x,y,z]) => {
      const rx = x*cy + z*sy
      const rz = -x*sy + z*cy
      const ry = y*cp - rz*sp
      const depth = y*sp + rz*cp
      return [width/2 + rx*scale, height/2 - ry*scale, depth]
    }
    // Depth-sort each point cloud; the gray shell remains translucent so interior
    // activation voxels can be seen through it.
    const shell = points.shell.map(project).sort((a,b) => a[2] - b[2])
    ctx.fillStyle = 'rgba(190,207,225,0.19)'
    for (const [x,y] of shell) ctx.fillRect(x, y, 2.1, 2.1)
    const active = points.active.map(project).sort((a,b) => a[2] - b[2])
    ctx.fillStyle = `rgba(255,48,53,${Math.max(0.45, Math.min(1, opacity + 0.25))})`
    for (const [x,y] of active) {
      ctx.beginPath()
      ctx.arc(x, y, 2.25, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.fillStyle = '#9cabbc'
    ctx.font = '12px system-ui, sans-serif'
    ctx.fillText('Drag to rotate · 3D voxel view', 14, height - 14)
    if (!points.active.length) {
      ctx.fillStyle = '#d2dbe5'
      ctx.textAlign = 'center'
      ctx.fillText(activation ? 'No activation at the current threshold' : 'Select a term to show activation', width/2, 28)
    }
  }, [points, rotation, opacity])

  const onPointerDown = (e) => {
    drag.current = { x: e.clientX, y: e.clientY }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e) => {
    if (!drag.current) return
    angles.current.yaw += (e.clientX - drag.current.x) * 0.009
    angles.current.pitch = Math.max(-1.45, Math.min(1.45, angles.current.pitch + (e.clientY - drag.current.y) * 0.009))
    drag.current = { x: e.clientX, y: e.clientY }
    setRotation(n => n + 1)
  }
  return <section className="brain-3d-panel" aria-label="Interactive 3D brain map">
    <div className="brain-3d-heading"><strong>3D brain activation</strong><button type="button" onClick={() => { angles.current = {yaw:-0.55,pitch:0.18}; setRotation(n=>n+1) }}>Reset view</button></div>
    <canvas ref={canvasRef} className="brain-3d-canvas" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={() => { drag.current = null }} onPointerCancel={() => { drag.current = null }} />
    <div className="brain-3d-legend"><span>● Transparent brain surface</span><span className="brain-3d-red">● Activation voxels</span></div>
  </section>
}
