/**
 * Header.tsx — SOFIE app header with branding and local-processing status.
 */
import '../styles/app.css';

export function Header() {
  return (
    <header className="header" role="banner">
      <div className="header__brand" aria-label="SOFIE — PII Sanitization Tool">
        <img
          src="/logo.svg"
          alt="SOFIE penguin"
          className="header__logo"
          width={36}
          height={36}
        />
        <span className="header__wordmark" aria-hidden="true">
          S<span>O</span>FIE
        </span>
      </div>

      <div className="header__status" aria-live="polite" aria-label="Processing status: local">
        <span className="header__dot" aria-hidden="true" />
        LOCAL PROCESSING
      </div>
    </header>
  );
}
