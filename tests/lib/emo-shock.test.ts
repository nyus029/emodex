import {
  calculateShockMultiplier,
  isInDecline,
  SHOCK_MULTIPLIER,
  DEFAULT_RECOVERY_DAYS,
  type ShockEvent,
} from '@/lib/emo-shock';

describe('emo-shock', () => {
  describe('constants', () => {
    it('SHOCK_MULTIPLIER is 0.5', () => {
      expect(SHOCK_MULTIPLIER).toBe(0.5);
    });

    it('DEFAULT_RECOVERY_DAYS is 7', () => {
      expect(DEFAULT_RECOVERY_DAYS).toBe(7);
    });
  });

  describe('calculateShockMultiplier', () => {
    it('returns 1.0 when no events', () => {
      expect(calculateShockMultiplier([])).toBe(1.0);
    });

    it('returns (1 - shockRate) immediately after shock', () => {
      const now = new Date();
      const events: ShockEvent[] = [
        { shockRate: 0.25, shockedAt: now, recoveryDays: 7 },
      ];
      const result = calculateShockMultiplier(events, now);
      expect(result).toBeCloseTo(0.75, 4);
    });

    it('recovers linearly over recovery period', () => {
      const shockedAt = new Date('2026-01-01T00:00:00Z');
      const halfRecovery = new Date('2026-01-04T12:00:00Z'); // 3.5 days into 7-day recovery
      const events: ShockEvent[] = [
        { shockRate: 0.5, shockedAt, recoveryDays: 7 },
      ];
      const result = calculateShockMultiplier(events, halfRecovery);
      // At 3.5/7 = 50% recovery, impact = 0.5 * (1 - 0.5) = 0.25
      // multiplier = 1 - 0.25 = 0.75
      expect(result).toBeCloseTo(0.75, 2);
    });

    it('returns 1.0 after full recovery', () => {
      const shockedAt = new Date('2026-01-01T00:00:00Z');
      const afterRecovery = new Date('2026-01-08T00:00:00Z'); // 7 days later
      const events: ShockEvent[] = [
        { shockRate: 0.5, shockedAt, recoveryDays: 7 },
      ];
      expect(calculateShockMultiplier(events, afterRecovery)).toBe(1.0);
    });

    it('stacks multiple shocks multiplicatively', () => {
      const now = new Date();
      const events: ShockEvent[] = [
        { shockRate: 0.2, shockedAt: now, recoveryDays: 7 },
        { shockRate: 0.3, shockedAt: now, recoveryDays: 7 },
      ];
      const result = calculateShockMultiplier(events, now);
      // (1 - 0.2) * (1 - 0.3) = 0.8 * 0.7 = 0.56
      expect(result).toBeCloseTo(0.56, 4);
    });

    it('ignores future events (asOfDate before shockedAt)', () => {
      const shockedAt = new Date('2026-01-10T00:00:00Z');
      const before = new Date('2026-01-09T00:00:00Z');
      const events: ShockEvent[] = [
        { shockRate: 0.5, shockedAt, recoveryDays: 7 },
      ];
      expect(calculateShockMultiplier(events, before)).toBe(1.0);
    });

    it('ignores recovered events when stacking', () => {
      const old = new Date('2026-01-01T00:00:00Z');
      const recent = new Date('2026-01-10T00:00:00Z');
      const now = new Date('2026-01-10T00:00:00Z');
      const events: ShockEvent[] = [
        { shockRate: 0.5, shockedAt: old, recoveryDays: 7 }, // recovered
        { shockRate: 0.3, shockedAt: recent, recoveryDays: 7 }, // active
      ];
      const result = calculateShockMultiplier(events, now);
      expect(result).toBeCloseTo(0.7, 4);
    });

    it('never returns negative', () => {
      const now = new Date();
      const events: ShockEvent[] = [
        { shockRate: 0.5, shockedAt: now, recoveryDays: 7 },
        { shockRate: 0.5, shockedAt: now, recoveryDays: 7 },
        { shockRate: 0.5, shockedAt: now, recoveryDays: 7 },
        { shockRate: 0.5, shockedAt: now, recoveryDays: 7 },
      ];
      const result = calculateShockMultiplier(events, now);
      expect(result).toBeGreaterThanOrEqual(0);
      // 0.5^4 = 0.0625
      expect(result).toBeCloseTo(0.0625, 4);
    });
  });

  describe('isInDecline', () => {
    it('returns false when no events', () => {
      expect(isInDecline([], new Date())).toBe(false);
    });

    it('returns true during recovery window', () => {
      const shockedAt = new Date('2026-01-01T00:00:00Z');
      const during = new Date('2026-01-04T00:00:00Z'); // day 3 of 7
      const events: ShockEvent[] = [
        { shockRate: 0.3, shockedAt, recoveryDays: 7 },
      ];
      expect(isInDecline(events, during)).toBe(true);
    });

    it('returns false after recovery window', () => {
      const shockedAt = new Date('2026-01-01T00:00:00Z');
      const after = new Date('2026-01-08T00:00:00Z'); // day 7
      const events: ShockEvent[] = [
        { shockRate: 0.3, shockedAt, recoveryDays: 7 },
      ];
      expect(isInDecline(events, after)).toBe(false);
    });

    it('returns false before shock date', () => {
      const shockedAt = new Date('2026-01-10T00:00:00Z');
      const before = new Date('2026-01-05T00:00:00Z');
      const events: ShockEvent[] = [
        { shockRate: 0.3, shockedAt, recoveryDays: 7 },
      ];
      expect(isInDecline(events, before)).toBe(false);
    });

    it('returns true if any event is in recovery window', () => {
      const old = new Date('2026-01-01T00:00:00Z');
      const recent = new Date('2026-01-10T00:00:00Z');
      const now = new Date('2026-01-12T00:00:00Z');
      const events: ShockEvent[] = [
        { shockRate: 0.3, shockedAt: old, recoveryDays: 7 }, // recovered
        { shockRate: 0.3, shockedAt: recent, recoveryDays: 7 }, // active
      ];
      expect(isInDecline(events, now)).toBe(true);
    });
  });
});
