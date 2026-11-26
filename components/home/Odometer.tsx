'use client';
import { useEffect, useRef } from 'react';
import { rollTo } from '@/lib/odometer';

/** Nombre qui roule depuis 0 jusqu'à `value` au chargement (compteur à rouleaux). */
export default function Odometer({ value, delay = 0, duration = 1.4 }: { value: string; delay?: number; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const tl = rollTo(el, value, { grow: true, duration }).delay(delay);
    return () => { tl.progress(1).kill(); };
  }, [value, delay, duration]);
  return <span ref={ref} data-odometer-element="">{value}</span>;
}
