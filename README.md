# SOFIE

SOFIE is a browser-based tool for detecting and sanitizing common personal and financial identifiers in pasted text or local `.txt` and `.csv` files. It shows detected entities, lets users choose a redaction strategy, and provides a side-by-side comparison and downloadable sanitized output.

## Problem

Sensitive text is often copied into tools that process it on remote servers. SOFIE keeps document scanning and deterministic sanitization in the browser so users can review and mask supported identifiers before sharing a document elsewhere.

## Core features

- Detects email addresses, Indian phone numbers, IPv4 addresses, Indian PANs, Aadhaar numbers, and credit-card candidates.
- Validates credit-card candidates with the Luhn checksum before reporting them.
- Supports **Full Mask**, **Partial Mask**, and **Consistent Pseudonymization**.
- Displays detected categories and counts, a side-by-side original/sanitized view, and an audit summary.
- Exports sanitized `.txt` or `.csv` content locally and includes a noisy sample text loader.

Detectors use practical patterns for the supported formats; they are not a guarantee that every sensitive value or identifier in a document will be found.

## Screenshots

### Main interface

<img src="https://github.com/user-attachments/assets/bd6589b9-7a33-4516-8f3c-d23f1d13fccd" alt="SOFIE main interface" width="100%" />

### Detection and sanitization

<img src="https://github.com/user-attachments/assets/a39d18b0-4916-455b-87bb-bee011e4fe7b" alt="SOFIE detection and sanitization view" width="100%" />

### Local AI and prompt log

<img src="https://github.com/user-attachments/assets/0c96399d-86c2-4b05-b793-68f74b9524ca" alt="SOFIE local AI privacy insight and prompt log" width="100%" />

## Privacy architecture

PII detection and redaction run in the browser. SOFIE does not send raw document content or matched PII to a backend, use a remote DLP service, or call a remote Gemini API. Sensitive document content is not written to local storage, session storage, or IndexedDB. Export creates a browser download from the sanitized result.

The interface imports fonts from Google Fonts, which may make a normal asset request to Google. That request does not include the document content. The optional Chrome Built-in AI integration uses the browser's local Prompt API; preparing the local model may download model weights, but SOFIE sends it aggregate metadata only.

## Local AI

When available, Chrome Built-in AI / Gemini Nano can generate an advisory privacy insight from aggregate counts, the selected redaction mode, and document length. It does not perform authoritative PII detection, change redaction results, or generate replacement identifiers. The core detection and sanitization workflow works without AI. Availability depends on a compatible Chrome version, device, browser settings, and local model availability; other browsers may report the feature as unsupported.

## Setup

Requires Node.js and npm.

```bash
npm install
npm run dev
```

Vite prints the local development URL in the terminal.

## Testing

```bash
npm test
```

The Vitest suite covers detector patterns and validators, redaction modes and audit calculations, AI metadata/prompt/session behavior, and React UI flows including file input and export controls.

## Production build

```bash
npm run build
```

This runs the TypeScript compiler and creates the production site in `dist/`.

## Deployment

SOFIE is a static Vite application. In Vercel, import the repository and use the detected Vite settings, or set the build command to `npm run build` and the output directory to `dist`. No backend or project-specific Vercel configuration is required for the current single-page app.

## Security notes

Sanitization is deterministic and client-side, but only recognized supported patterns are replaced. Review the sanitized output before sharing it; unrecognized identifiers and contextual clues may remain. Pasted text has no explicit size limit, while file uploads are limited to 10 MB. Local AI is optional and advisory, not a security boundary.

## Project structure

- `src/core/pii/` — PII types, deterministic detectors, and validators.
- `src/core/redaction/` — redaction modes, pseudonymization, and audit results.
- `src/core/ai/` — safe aggregate prompt construction and Chrome Built-in AI adapter.
- `src/components/` — React interface components.
- `src/hooks/` — debounced current-document detection.
- `src/styles/` — global design tokens and application styles.
- `src/__tests__/` — Vitest unit and UI integration tests.
