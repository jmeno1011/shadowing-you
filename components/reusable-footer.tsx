type ReusableFooterProps = {
  name?: string;
  email?: string;
  linkedinUrl?: string;
  productName?: string;
  year?: number;
};

const DEFAULT_PROFILE = {
  name: "Do Hyoung Kim",
  email: "whltn8282@gmail.com",
  linkedinUrl: "https://www.linkedin.com/in/dohyoungkim1011",
  productName: "Shadowing You",
  year: 2026,
};

export function ReusableFooter({
  name = DEFAULT_PROFILE.name,
  email = DEFAULT_PROFILE.email,
  linkedinUrl = DEFAULT_PROFILE.linkedinUrl,
  productName = DEFAULT_PROFILE.productName,
  year = DEFAULT_PROFILE.year,
}: ReusableFooterProps) {
  return (
    <footer className="reusable-footer">
      <div className="reusable-footer-inner">
        <nav className="reusable-footer-links" aria-label="Footer links">
          <span className="reusable-footer-brand">{productName}</span>
          <a href={`mailto:${email}`}>{email}</a>
          <a href={linkedinUrl} target="_blank" rel="noreferrer">
            LinkedIn
          </a>
        </nav>
        <p className="reusable-footer-copy">
          © {year} {name}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
