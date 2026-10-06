import { useEffect } from 'react';
import { SPEEDS } from '../core/types';
import { useGameStore } from '../store/gameStore';

/** Boşluk: duraklat/devam · 1–5: hız. Form alanlarında devre dışı. */
export function useKeyboardShortcuts(): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('input, select, textarea, [contenteditable]')) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const { send } = useGameStore.getState();
      // Odaktaki düğmede boşluk, düğmenin kendisine basar; çakışmasın.
      if (e.code === 'Space' && !target?.closest('button')) {
        e.preventDefault();
        send({ type: 'togglePause' });
        return;
      }
      const index = Number(e.key) - 1;
      const speed = SPEEDS[index];
      if (speed !== undefined) send({ type: 'setSpeed', speed });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
