import { BALANCE, MINUTES_PER_DAY } from './balance';
import {
  LEDGER_CATEGORIES,
  type Finance,
  type GameState,
  type LedgerCategory,
  type Money,
} from './types';

export function emptyAmounts(): Record<LedgerCategory, Money> {
  return Object.fromEntries(LEDGER_CATEGORIES.map((c) => [c, 0])) as Record<LedgerCategory, Money>;
}

export function createFinance(): Finance {
  return { days: [], totals: emptyAmounts(), deliveries: 0, lateDeliveries: 0 };
}

/** Gelir (+) veya gideri (−) nakde ve günlük dökümüne işler. */
export function book(state: GameState, category: LedgerCategory, amount: Money): void {
  if (amount === 0) return;
  const day = Math.floor(state.time / MINUTES_PER_DAY);
  const days = state.finance.days;
  let entry = days[days.length - 1];
  if (!entry || entry.day !== day) {
    entry = { day, amounts: emptyAmounts() };
    days.push(entry);
    if (days.length > BALANCE.ledgerDays) days.splice(0, days.length - BALANCE.ledgerDays);
  }
  entry.amounts[category] += amount;
  state.finance.totals[category] += amount;
  state.money += amount;
}
