# Veeha Travels — Client View UX Overhaul

## What This Is

A travel itinerary quoting tool where an admin (Veeha Travels) builds customizable trip packages and shares them with clients via unique links. Clients browse properties, activities, flights, and transportation options, make selections, and see their total price update in real-time. Built with React + Tailwind + Supabase.

## Core Value

Clients can understand and customize their travel quote without needing a video walkthrough — the interface is self-explanatory.

## Requirements

### Validated

- ✓ Admin can build multi-location travel itineraries with properties, activities, flights, and transport — existing
- ✓ Admin can generate share links for clients with token-based access — existing
- ✓ Client can view and select options across tabs (Properties, Activities, Flights, Transport, Summary) — existing
- ✓ Delta-based pricing: finalQuote = baseQuote + sum(all deltas) — existing
- ✓ Currency conversion across 32 currencies with 2% markup — existing
- ✓ Admin can finalize quotes (locks client view to read-only with selected items only) — existing
- ✓ Auto-save with debouncing and visibility detection — existing
- ✓ CSV export/import for activities — existing
- ✓ Image management with scraping for properties — existing
- ✓ Pax count adjustable per activity — existing

### Active

- [ ] Sticky price summary panel (desktop sidebar + mobile bottom bar)
- [ ] Itemized price breakdown modal/drawer
- [ ] "Included" vs "Optional" badges on activities
- [ ] Per-person math display on activity cards
- [ ] Contextual price labels replacing raw deltas
- [ ] Welcome banner for first-time orientation
- [ ] Agent's Pick badge (admin toggle + client display)
- [ ] Accessibility fixes (ARIA roles, keyboard nav, touch targets)
- [ ] Image lazy loading for performance
- [ ] Skeleton loading state
- [ ] Summary tab enhancement with itinerary timeline

### Out of Scope

- Admin dashboard redesign — focus is client-facing UX only
- New backend/API changes — all data already exists in JSONB blob
- Authentication changes — token-based share links work fine
- Mobile native app — web-first, responsive design sufficient
- Payment integration — this is a quoting tool, not booking

## Context

- **Real data analysis:** Janvi's NZ$25,993 quote with 31 properties across 10 locations, 23 activities, 1 flight, 9 transport options. Final: NZ$28,786.
- **Key UX problem:** Delta-based pricing ("-NZ$150", "+NZ$256") is meaningless without context. Clients don't know what's included in the base quote.
- **Research finding:** 53% of travel customers abandon when confused by final price. Sticky price summaries boost conversions ~4.17%.
- **Current pain:** Every client needs a video walkthrough to understand the interface.
- **Codebase:** ClientView.jsx is 1,151 lines. Component extraction needed to prevent bloat.
- **Existing codebase map:** `.planning/codebase/` has full architecture, structure, concerns, and testing docs.

## Constraints

- **Tech stack**: React 18 + Tailwind CSS + Lucide React icons + Supabase — no new dependencies
- **Deployment**: Vercel auto-deploys from main branch
- **Build**: ESLint runs on build — zero warnings required
- **Data model**: Minimal changes — only `recommended: boolean` field addition for Agent's Pick
- **Backward compatibility**: Existing share links and finalized quotes must continue working
- **Performance**: ~100+ images currently load eagerly — lazy loading critical for mobile

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Sidebar at lg: (1024px+) not md: (768px) | 300px sidebar eats 40% of iPad portrait width | — Pending |
| Modal for breakdown, not inline sidebar | 31 properties + 23 activities can't fit in 320px panel | — Pending |
| sessionStorage over localStorage for banner | Survives refresh, reappears on new visits, no stale data | — Pending |
| Extract 4 new components from ClientView | Prevent 1,151 → 1,500+ line bloat | — Pending |
| Color + short label over verbose descriptions | "Saves NZ$150" > "NZ$150 less than base option" for mobile | — Pending |

---
*Last updated: 2026-02-24 after initialization*
