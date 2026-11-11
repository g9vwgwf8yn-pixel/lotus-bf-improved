# LoTUS-BF update notes (2026-11-11)

## Implemented in source
- English-only single-page layout; brain maps left, research papers right; no tabs/footer.
- Autocomplete 90 ms debounce plus client/server repeated-prefix caches.
- Compact advanced query: first term + AND/OR/NOT + optional second term.
- Existing linked crosshair behavior retained in the NIfTI viewer.
- Completed NIfTI maps cached in the service instance temporary directory; first-time computations still take time.
- Research papers have an asynchronously populated citation count column from OpenAlex. Unknown/unavailable counts show a dash; counts may differ from other bibliographic sources.
- Journal and title links lead to PubMed by PMID if present, otherwise to a PubMed title search. This does not guarantee that the article is indexed by PubMed.

## Deployment
The zip contains source files, not node_modules or compiled dist. Commit all project files and redeploy the existing Render Docker service. The Dockerfile runs `npm ci` and `npm run build` in its frontend stage. Keep the existing DB_URL environment variable. Do not put DB passwords into source control.

## Validation status
Python syntax compiled and ZIP archive verified. A full npm production build and live database/API integration test were not possible in this environment; deployment should be tested in Render. Check `/terms?search=mem&limit=10`, `/query/memory/studies`, `/query/memory/nii`, and the `/api/citations` POST endpoint after deployment.
