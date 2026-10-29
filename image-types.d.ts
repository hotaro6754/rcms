// Types for importing images (`import logo from "@/public/brand/…png"`). next-env.d.ts carries the
// same reference, but Next generates it during dev/build and it is not committed, so
// `npm run typecheck` on a fresh checkout (CI runs it before building) would not see it.
/// <reference types="next/image-types/global" />
