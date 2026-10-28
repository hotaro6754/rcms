/**
 * Points every Prisma client created in a test process at the test database, and gives
 * Better Auth a throwaway secret. Runs before any test module is imported.
 */
const url = process.env.TEST_DATABASE_URL ?? "mysql://rcms:rcms@127.0.0.1:3306/rcms_test";
process.env.DATABASE_URL = url;
process.env.DATABASE_POOL_MAX = process.env.DATABASE_POOL_MAX ?? "4";
process.env.BETTER_AUTH_SECRET = "test-secret-test-secret-test-secret-0123456789";
process.env.BETTER_AUTH_URL = "http://localhost:3000";
process.env.AUTH_RATE_LIMIT = "off";
process.env.ADMIN_MFA_REQUIRED = "false";
process.env.RAZORPAY_KEY_ID = "rzp_test_dummykey";
process.env.RAZORPAY_KEY_SECRET = "test_key_secret";
process.env.RAZORPAY_WEBHOOK_SECRET = "test_webhook_secret";
delete process.env.RESEND_API_KEY;
