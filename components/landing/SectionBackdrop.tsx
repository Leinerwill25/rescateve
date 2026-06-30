type SectionBackdropProps = {
  variant: "flow" | "warm" | "pulse" | "network";
};

export default function SectionBackdrop({ variant }: SectionBackdropProps) {
  return (
    <div className="section-backdrop" aria-hidden="true">
      <div className={`section-backdrop__base section-backdrop__base--${variant}`} />

      {variant === "flow" && (
        <>
          <span className="section-backdrop__orb section-backdrop__orb--a" />
          <span className="section-backdrop__orb section-backdrop__orb--b" />
          <svg className="section-backdrop__routes" viewBox="0 0 1200 400" preserveAspectRatio="none">
            <path className="section-backdrop__route-line" d="M0 280 C200 200 350 320 520 240 S880 180 1200 260" />
            <path className="section-backdrop__route-line section-backdrop__route-line--delay" d="M0 340 C300 260 500 380 720 300 S1000 220 1200 320" />
          </svg>
        </>
      )}

      {variant === "warm" && (
        <>
          <span className="section-backdrop__orb section-backdrop__orb--c" />
          <span className="section-backdrop__orb section-backdrop__orb--d" />
          <div className="section-backdrop__grid section-backdrop__grid--soft" />
        </>
      )}

      {variant === "pulse" && (
        <>
          <span className="section-backdrop__ring section-backdrop__ring--1" />
          <span className="section-backdrop__ring section-backdrop__ring--2" />
          <div className="section-backdrop__grid section-backdrop__grid--dots" />
        </>
      )}

      {variant === "network" && (
        <>
          <span className="section-backdrop__orb section-backdrop__orb--e" />
          <span className="section-backdrop__orb section-backdrop__orb--f" />
          <svg className="section-backdrop__mesh" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice">
            <circle className="section-backdrop__node" cx="120" cy="140" r="4" />
            <circle className="section-backdrop__node" cx="320" cy="80" r="4" />
            <circle className="section-backdrop__node" cx="520" cy="200" r="4" />
            <circle className="section-backdrop__node" cx="680" cy="120" r="4" />
            <circle className="section-backdrop__node" cx="200" cy="380" r="4" />
            <circle className="section-backdrop__node" cx="600" cy="420" r="4" />
            <path className="section-backdrop__mesh-line" d="M120 140 L320 80 L520 200 L680 120" />
            <path className="section-backdrop__mesh-line" d="M120 140 L200 380 L600 420" />
            <path className="section-backdrop__mesh-line section-backdrop__mesh-line--delay" d="M520 200 L600 420" />
          </svg>
        </>
      )}
    </div>
  );
}
