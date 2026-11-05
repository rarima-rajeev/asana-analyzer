// "More projects" card, matching the one on the other portfolio sites (same links and wording).
// Icons are inline SVG versions of Lucide icons (ISC license).

const LI = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };

const PROFILE_LINKS = [
  {
    label: "Portfolio", href: "https://rarima-rajeev.my.canva.site/",
    icon: <svg {...LI}><circle cx="12" cy="12" r="10" /><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20M2 12h20" /></svg>,
  },
  {
    label: "LinkedIn", href: "https://www.linkedin.com/in/rarima-rajeev",
    icon: <svg {...LI}><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z" /><rect x="2" y="9" width="4" height="12" /><circle cx="4" cy="4" r="2" /></svg>,
  },
  {
    label: "GitHub", href: "https://github.com/rarima-rajeev",
    icon: <svg {...LI}><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.4 5.4 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" /><path d="M9 18c-4.51 2-5-2-7-2" /></svg>,
  },
];

export default function MoreProjects() {
  return (
    <section className="more-projects">
      <h2>More projects and the full case study</h2>
      <p>The write-up, code and other AI product projects live here.</p>
      <div className="more-links">
        {PROFILE_LINKS.map((l) => (
          <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer">
            {l.icon}
            <span>{l.label}</span>
            <svg {...LI} className="more-arrow"><path d="M7 17L17 7M7 7h10v10" /></svg>
          </a>
        ))}
      </div>
    </section>
  );
}
