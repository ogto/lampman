import Link from "next/link";

export function Brand() {
  return (
    <Link className="brand" href="/" aria-label="램프맨 홈">
      <span className="brand-bulb" aria-hidden="true">
        <span className="brand-filament" />
      </span>
      <span className="brand-copy">
        <strong>램프맨</strong>
      </span>
    </Link>
  );
}
