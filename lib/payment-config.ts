export const TEST_MODE = true; // Set to false to revert back to production pricing

export const ORIGINAL_PRICES = {
  monthly: 100,     // ₹1 in paise
  quarterly: 319900,   // ₹3,199 in paise (6-Month Plan)
  yearly: 649900      // ₹6,499 in paise (Annual Plan)
};

export const PLAN_PRICES: Record<string, number> = TEST_MODE
  ? {
      ...ORIGINAL_PRICES,
      monthly: 100 // ₹1 in paise for testing
    }
  : ORIGINAL_PRICES;
