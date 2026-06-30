type PillProps = {
  children: React.ReactNode;
  variant?: "default" | "brand" | "verified" | "accent";
};

export default function Pill({ children, variant = "default" }: PillProps) {
  return (
    <span className={`land-pill land-pill--${variant}`}>
      {children}
    </span>
  );
}
