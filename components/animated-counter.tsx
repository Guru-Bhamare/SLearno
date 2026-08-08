import { useEffect, useState } from 'react';

import { ThemedText, type ThemedTextProps } from '@/components/themed-text';

export function AnimatedCounter({ value, ...rest }: { value: number } & ThemedTextProps) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let raf: ReturnType<typeof requestAnimationFrame>;
    const duration = 500;
    const start = performance.now();
    const from = 0;

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      setDisplay(Math.round(from + (value - from) * progress));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return <ThemedText {...rest}>{display}</ThemedText>;
}
