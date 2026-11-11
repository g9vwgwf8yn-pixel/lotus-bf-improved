# NeuroScope update

- Renamed visible website heading to **NeuroScope**.
- Gaussian smoothing FWHM fixed at **10 mm**; removed editable FWHM control.
- Paper titles are plain text. Journal names alone link to PubMed (direct PMID where available, otherwise title search).
- Citation lookup uses OpenAlex, caches successful responses, waits up to 9 seconds per request, and checks exact title matches. Displays `Loading…` during lookup and `N/A` when a reliable count is unavailable. Counts are not fabricated.

**Note:** External OpenAlex access is required for citation counts. This version has not been tested against your live Render database.
