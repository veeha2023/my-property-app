# Deferred Items — Phase 08 Performance Loading

## Pre-existing ESLint Warnings in ClientView.jsx (Out of Scope)

Found during 08-01 build verification. These existed before this plan and are unrelated to image lazy loading or skeleton component changes.

- **Line 237:** `'displayPrice' was used before it was defined` — `no-use-before-define`
- **Line 244:** `'basePrice' is assigned a value but never used` — `no-unused-vars`
- **Line 286:** `'displayPrice' was used before it was defined` — `no-use-before-define`

These should be fixed in a dedicated refactor pass of ClientView.jsx to clean up variable declaration order and remove unused state.
