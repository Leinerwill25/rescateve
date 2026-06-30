"use client";

type ProblemRouteAnimatedProps = {
  className?: string;
};

const ROUTE_PATH = "M0 20 H400 Q420 20 440 12 T480 20 H720 Q740 28 760 20 T800 20 H1200";

export default function ProblemRouteAnimated({ className = "" }: ProblemRouteAnimatedProps) {
  return (
    <div className={`problem-band__route-live ${className}`.trim()} aria-hidden="true">
      <svg
        className="problem-band__route-svg"
        viewBox="0 0 1200 40"
        preserveAspectRatio="none"
      >
        <path
          d={ROUTE_PATH}
          className="problem-band__route-track"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d={ROUTE_PATH}
          className="problem-band__route-glow"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="400" cy="20" r="3" className="problem-band__route-node" />
        <circle cx="600" cy="20" r="3" className="problem-band__route-node" />
        <circle cx="800" cy="20" r="3" className="problem-band__route-node" />
      </svg>
      <span className="problem-band__route-traveler" />
    </div>
  );
}
