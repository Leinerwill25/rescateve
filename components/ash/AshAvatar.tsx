export default function AshAvatar({ size = 48 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="24" cy="24" r="24" fill="#16A34A" />
      <ellipse cx="24" cy="30" rx="14" ry="10" fill="#22C55E" />
      <path
        d="M24 8C18 8 14 14 14 20C14 26 18 28 24 28C30 28 34 26 34 20C34 14 30 8 24 8Z"
        fill="#15803D"
      />
      <path d="M20 18C20 19.1 19.1 20 18 20C16.9 20 16 19.1 16 18C16 16.9 16.9 16 18 16C19.1 16 20 16.9 20 18Z" fill="#DCFCE7" />
      <path d="M32 18C32 19.1 31.1 20 30 20C28.9 20 28 19.1 28 18C28 16.9 28.9 16 30 16C31.1 16 32 16.9 32 18Z" fill="#DCFCE7" />
      <path d="M18 24C20 26 28 26 30 24" stroke="#DCFCE7" strokeWidth="1.5" strokeLinecap="round" />
      <text x="24" y="44" textAnchor="middle" fontSize="8" fill="#fff" fontWeight="bold">
        🌿
      </text>
    </svg>
  );
}
