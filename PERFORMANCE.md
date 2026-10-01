# Performance and Rendering Conventions

This document records the production rendering decision for the Next.js application and the measurement protocol for evaluating it. It describes the current implementation without changing application behavior.

## Current production feature

The `/docker` route uses an async React Server Component:

```text
Browser
  -> Next.js route module: src/app/docker/page.tsx
       -> UserRepository.get_user_details()
            -> backend /user endpoint
  <- HTML containing the page and user table
```

The page declares `dynamic = "force-dynamic"`, so the user list is fetched during each request and is not served from a static or cached route result. The repository call runs on the server, which keeps the initial data request out of browser JavaScript and avoids a second browser-to-Next.js fetch for the table.

This is the performance feature already present in production code: server-side rendering of the initial data state through an async Server Component. It is not Partial Prerendering, streaming, or a Server Action. Those features must not be claimed for this route until they are implemented.

## Before and after comparison

The comparison baseline is a client-rendered page that sends the `/user` request from `useEffect` after JavaScript has loaded:

```text
Before: HTML shell -> download/execute JavaScript -> browser fetch -> render table
After:  request -> Next.js fetches data on the server -> HTML already contains table
```

The expected user-visible effect is that the table can appear in the first HTML response instead of waiting for hydration and a second browser request. The exact benefit depends on network distance, database latency, and payload size; do not record a fixed percentage without measuring the deployed stack.

### Measurement procedure

Run both versions in equivalent production environments. Keep the database contents, machine size, region, network conditions, and request path constant. Use at least 10 cold-cache requests and 10 warm-cache requests for each version, then report median and p75 values.

1. Build and start the production server:

   ```bash
   pnpm build
   pnpm start
   ```

2. From another terminal, measure the initial document response. Replace the URL with the deployed route when testing production:

   ```bash
   curl.exe -o NUL -s -w "status=%{http_code} ttfb=%{time_starttransfer}s total=%{time_total}s size=%{size_download}B\n" http://localhost:3000/docker
   ```

3. In a browser performance run, record First Contentful Paint (FCP), Largest Contentful Paint (LCP), and whether the table is present in the initial document response. Use a clean profile for cold-cache runs and a repeated reload for warm-cache runs.

4. Record backend request duration separately in the Node.js service logs or its existing health/observability tooling. This distinguishes Next.js rendering time from database/API time.

### Results

Complete this table from the same environment. The current repository does not contain a client-fetch baseline or an automated browser benchmark, so numeric before/after values must come from a controlled run rather than being inferred from unit tests.

| Metric | Before: client fetch | After: async Server Component | Difference |
| --- | ---: | ---: | ---: |
| Initial document TTFB, median | pending measurement | pending measurement | pending |
| Initial document TTFB, p75 | pending measurement | pending measurement | pending |
| FCP, median | pending measurement | pending measurement | pending |
| LCP, median | pending measurement | pending measurement | pending |
| Table present in initial HTML | no | yes | qualitative improvement |
| Browser request needed for initial table | yes | no | one fewer browser hop |

Use this calculation for the measured change:

```text
improvement (%) = (before - after) / before * 100
```

Do not compare a development server with a production server, or a warm run with a cold run. `pnpm test` validates rendering behavior and repository interaction, but it does not measure network timing or Core Web Vitals.

## Module convention

Use the following module boundaries for new work:

| Location | Convention |
| --- | --- |
| `src/app/**` | App Router route modules, layouts, loading/error boundaries, and page-level composition |
| `src/components/**` | Reusable UI components; add `"use client"` only when browser state, effects, or event handlers require it |
| `src/repositories/**` | Backend data access and response validation |
| `src/actions/**` | Server Actions for mutations invoked by the UI; do not use them as a substitute for read-only page loading |
| `src/type/**` | Shared domain types and validation schemas |
| `src/lib/**` | Shared infrastructure clients and framework-independent helpers |

Use the configured path aliases such as `@components/*`, `@repositories/*`, `@type/*`, and `@lib/*`. Keep route modules thin: they should coordinate rendering and data loading, while repositories own HTTP access and validation.

## Rendering pattern decision

Choose the least client-side rendering needed by the feature:

- **Server Component:** default for read-only pages and initial data. Fetch data in the async route or a server-owned repository, as `/docker` does.
- **Client Component:** use only for interactive islands such as the form button, browser event handlers, local state, or effects. Keep the client boundary as small as possible.
- **Dynamic rendering:** use `dynamic = "force-dynamic"` when every request must observe fresh data. Revisit this choice if the user list can tolerate revalidation or tagging, because dynamic rendering trades cacheability for freshness.
- **Suspense/streaming:** introduce a boundary when independent slow sections can render progressively. A boundary is not present on `/docker` today, so the page waits for its user query before returning the complete route response.
- **Server Actions:** use for mutations such as create, update, or delete operations. Keep read queries in the Server Component or repository unless the interaction specifically requires an action.
- **Partial Prerendering:** use only after the route has an explicit static shell and independently dynamic content. It is not part of the current `/docker` rendering contract.

The team should document any change to this decision with the same benchmark dimensions above, plus the cache/revalidation policy and the user-visible loading behavior.

## Validation checklist

- Confirm the route still renders the data table when the repository succeeds.
- Confirm the error state does not render the table when the repository fails.
- Run `pnpm test` for behavior.
- Run `pnpm build` before collecting production timings.
- Record the deployment URL, date, region, cache state, sample count, and median/p75 values with the results.