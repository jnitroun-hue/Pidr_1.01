'use client';

type CryptoIconProps = {
  src: string;
  alt?: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
};

/** SVG/PNG иконка токена или кошелька; emoji — fallback текстом */
export default function CryptoIcon({ src, alt = '', size = 22, className, style }: CryptoIconProps) {
  if (src.startsWith('/')) {
    return (
      <img
        src={src}
        alt={alt}
        width={size}
        height={size}
        className={className}
        style={{ display: 'block', borderRadius: '50%', objectFit: 'contain', ...style }}
      />
    );
  }

  return (
    <span
      className={className}
      style={{ fontSize: size, lineHeight: 1, display: 'inline-block', ...style }}
      aria-hidden={!alt}
      title={alt || undefined}
    >
      {src}
    </span>
  );
}
