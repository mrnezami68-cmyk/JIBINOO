import { defineConfig } from 'vitest/config';

/**
 * پیکربندی تست اجرایی جیبینو (فاز ۱۴).
 * منطقه زمانی روی تهران قفل شده تا باگ‌های UTC (P0 شماره ۱) به‌صورت
 * قطعی در تست‌ها آشکار شوند — همان منطقه‌ای که کاربران اصلی اپ در آن هستند.
 */
export default defineConfig({
  esbuild: { jsx: 'automatic' },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    env: {
      TZ: 'Asia/Tehran',
    },
  },
});
