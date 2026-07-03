import Image from "next/image";

/** Avatar oficial de Ash (public/) */
export const ASH_AVATAR_SRC = "/ChatGPT Image 11 may 2026, 00_08_55.png";

export default function AshAvatar({ size = 48 }: { size?: number }) {
  return (
    <Image
      src={ASH_AVATAR_SRC}
      alt=""
      width={size}
      height={size}
      aria-hidden
      className="ash-avatar-img"
      style={{
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
      }}
    />
  );
}
