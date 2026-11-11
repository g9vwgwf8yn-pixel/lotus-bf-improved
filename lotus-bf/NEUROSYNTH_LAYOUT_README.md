# LoTUS-BF Neurosynth-style layout update

- Maps and Studies are now separate tabs.
- Search term suggestions appear as a dropdown below the search box. Click a suggestion to select it.
- Advanced Boolean query builder remains available under the expandable panel.
- Clicking any of the three brain canvases updates shared voxel indices and crosshairs in all views.
- Canvas uses its intrinsic aspect ratio so mouse position corresponds to the displayed voxel coordinate.
- Journal links remain in Studies.

This archive includes the backend from the prior autocomplete repair and the front-end updates. Keep your existing Render database configuration and Docker root directory (`lotus-bf`).

**Verification:** Test live `/terms?search=mem&limit=10` and `/query/memory/studies` endpoints after deploying. No remote database verification is included in this package.
