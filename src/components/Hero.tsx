/**
 * Hero.tsx — SOFIE hero section with product purpose communication.
 */

export function Hero() {
  return (
    <section className="hero" aria-labelledby="hero-headline">
      <div className="hero__inner">
        <h1 className="hero__headline" id="hero-headline">
          SANITIZE YOUR <span>DATA.</span>
        </h1>
        <p className="hero__sub">
          Paste or upload sensitive text. SOFIE detects PII locally — emails,
          phone numbers, IP addresses, PAN, Aadhaar, credit cards — with nothing
          leaving your browser.
        </p>
        <ul className="hero__pills" aria-label="Supported PII types">
          {['EMAIL', 'PHONE', 'IP ADDRESS', 'PAN', 'AADHAAR', 'CREDIT CARD'].map((t) => (
            <li key={t} className="hero__pill hero__pill--active">
              <span className="hero__pill-dot" aria-hidden="true" />
              {t}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
