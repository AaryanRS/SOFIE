# Security

## Data handling

SOFIE detects and sanitizes text in the browser. It has no application backend and does not send document text, detected values, or sanitized output to a remote DLP or Gemini service. Document text is held in page memory while the app is open; SOFIE does not write it to local storage, session storage, IndexedDB, or cookies.

The optional Chrome Built-in AI integration is user-triggered and advisory. Its prompt is constructed from aggregate entity counts, the selected redaction mode, and document length. It does not receive the original document, matched values, or sanitized output. SOFIE uses the browser's on-device Prompt API; compatible Chrome/device support is required. The browser may download local model weights during model preparation.

The page loads font assets from Google Fonts. This is a normal external asset request and does not include document content. Users who need to avoid all third-party asset requests can block that request or use the app in an environment that blocks external fonts; the system font fallback remains available.

## Important limitations

- Detection uses deterministic patterns for supported formats and can miss sensitive values or produce false positives. It is not a complete DLP system.
- Review the sanitized result before sharing it. Contextual clues or unsupported identifiers may remain.
- The optional AI insight is generated locally when available, but it is not a security control and must not be treated as a detection or compliance guarantee.
- Browser extensions, a compromised device, browser developer tools, or other software running in the same browser profile are outside SOFIE's protection boundary.
- Export and copy actions are explicit user actions. Export creates a local browser download; copy writes sanitized output to the clipboard when permitted by the browser.

## Reporting a vulnerability

Please avoid posting real personal data or exploit details in a public issue. If private vulnerability reporting is enabled for the repository, use that channel. Otherwise contact the repository maintainer privately with a concise description and steps to reproduce, using synthetic data only.
