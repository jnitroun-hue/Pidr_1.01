'use client';

import Image from 'next/image';
import styles from './PidrCoinIcon.module.css';

export const PIDR_COIN_SRC = '/img/pidr-coin.png';

type PidrCoinIconProps = {
  size?: number;
  /** 3D-вращение монеты */
  spin?: boolean;
  spinSlow?: boolean;
  className?: string;
  alt?: string;
};

export default function PidrCoinIcon({
  size = 22,
  spin = false,
  spinSlow = false,
  className = '',
  alt = 'Монета P.I.D.R.',
}: PidrCoinIconProps) {
  const spinClass = spin ? styles.spin : spinSlow ? styles.spinSlow : '';

  return (
    <span
      className={`${styles.wrap} ${className}`.trim()}
      style={{ width: size, height: size }}
      aria-hidden={alt === ''}
    >
      <Image
        src={PIDR_COIN_SRC}
        alt={alt}
        width={size}
        height={size}
        className={`${styles.img} ${spinClass}`.trim()}
        priority={spin}
      />
    </span>
  );
}

type PidrCoinAmountProps = {
  value: number | string;
  size?: number;
  showLabel?: boolean;
  spin?: boolean;
  className?: string;
  amountClassName?: string;
};

/** Число + иконка монеты (для цен и балансов). */
export function PidrCoinAmount({
  value,
  size = 18,
  showLabel = false,
  spin = false,
  className = '',
  amountClassName = '',
}: PidrCoinAmountProps) {
  const formatted =
    typeof value === 'number' ? value.toLocaleString('ru-RU') : value;

  return (
    <span className={`${styles.inline} ${className}`.trim()}>
      <PidrCoinIcon size={size} spin={spin} alt="" />
      <span className={`${styles.inlineAmount} ${amountClassName}`.trim()}>{formatted}</span>
      {showLabel && <span className={styles.inlineLabel}>монет</span>}
    </span>
  );
}
