import { ExternalLink } from "lucide-react";
import Pill from "./Pill";

type LandCardTone = "blue" | "green" | "amber" | "slate" | "rose";

type LandCardProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
  tone?: LandCardTone;
  pills?: string[];
  pillVariant?: "default" | "brand" | "verified";
  badge?: string;
  footer?: React.ReactNode;
  external?: boolean;
};

export default function LandCard({
  icon,
  title,
  description,
  tone = "blue",
  pills = [],
  pillVariant = "default",
  badge,
  footer,
  external,
}: LandCardProps) {
  return (
    <article className="land-card">
      <div className="land-card__top">
        <div className={`land-card__icon land-card__icon--${tone}`} aria-hidden="true">
          {icon}
        </div>
        {external && (
          <ExternalLink size={16} className="land-card__external" aria-hidden="true" />
        )}
        {badge && <Pill variant="brand">{badge}</Pill>}
      </div>
      <h3 className="land-card__title">{title}</h3>
      <p className="land-card__desc">{description}</p>
      {pills.length > 0 && (
        <div className="land-card__pills">
          {pills.map((p) => (
            <Pill key={p} variant={pillVariant}>{p}</Pill>
          ))}
        </div>
      )}
      {footer && <div className="land-card__footer">{footer}</div>}
    </article>
  );
}
