type RouteThreadProps = {
  variant?: "vertical" | "horizontal" | "footer";
  className?: string;
};

export default function RouteThread({ variant = "vertical", className = "" }: RouteThreadProps) {
  if (variant === "horizontal") {
    return (
      <svg
        className={`route-thread route-thread--horizontal ${className}`.trim()}
        viewBox="0 0 800 24"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          d="M0 12 H180 Q200 12 210 12 L230 12 Q250 4 270 12 T310 12 H490 Q510 20 530 12 T570 12 H800"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeDasharray="4 6"
        />
        <circle cx="180" cy="12" r="3" fill="currentColor" />
        <circle cx="400" cy="12" r="3" fill="currentColor" />
        <circle cx="620" cy="12" r="3" fill="currentColor" />
      </svg>
    );
  }

  if (variant === "footer") {
    return (
      <svg
        className={`route-thread route-thread--footer ${className}`.trim()}
        viewBox="0 0 1200 40"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          d="M0 20 H400 Q420 20 440 12 T480 20 H720 Q740 28 760 20 T800 20 H1200"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.5"
        />
        <circle cx="400" cy="20" r="3" fill="currentColor" opacity="0.7" />
        <circle cx="600" cy="20" r="3" fill="currentColor" opacity="0.7" />
        <circle cx="800" cy="20" r="3" fill="currentColor" opacity="0.7" />
      </svg>
    );
  }

  return (
    <svg
      className={`route-thread route-thread--vertical ${className}`.trim()}
      viewBox="0 0 24 400"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        d="M12 0 V120 Q12 140 12 160 T12 200 V280 Q12 300 12 320 T12 400"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray="4 8"
      />
      <circle cx="12" cy="80" r="3" fill="currentColor" />
      <circle cx="12" cy="200" r="4" fill="currentColor" />
      <circle cx="12" cy="320" r="3" fill="currentColor" />
    </svg>
  );
}
