export default function SteamingBowl({ className }: { className: string }) {
  return (
    <svg
      viewBox="0 0 80 80"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M30 18 Q28 14 30 10 Q32 6 30 2" opacity="0.5" />
      <path d="M40 18 Q38 14 40 10 Q42 6 40 2" opacity="0.5" />
      <path d="M50 18 Q48 14 50 10 Q52 6 50 2" opacity="0.5" />
      <path d="M14 30 Q14 58 40 58 Q66 58 66 30 Z" />
      <ellipse cx="40" cy="30" rx="26" ry="4" />
    </svg>
  );
}

