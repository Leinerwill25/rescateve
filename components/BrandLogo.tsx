import Image from "next/image";

type BrandLogoProps = {
  size?: number;
  className?: string;
  priority?: boolean;
  alt?: string;
};

export default function BrandLogo({
  size = 36,
  className = "",
  priority = false,
  alt = "Rescate VE",
}: BrandLogoProps) {
  return (
    <Image
      src="/logo.png"
      alt={alt}
      width={size}
      height={size}
      priority={priority}
      className={className}
      style={{ width: size, height: size, objectFit: "contain" }}
    />
  );
}
