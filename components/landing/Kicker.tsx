type KickerProps = {
  children: React.ReactNode;
  light?: boolean;
  className?: string;
};

export default function Kicker({ children, light, className = "" }: KickerProps) {
  return (
    <p className={`land-kicker${light ? " land-kicker--light" : ""} ${className}`.trim()}>
      {children}
    </p>
  );
}
