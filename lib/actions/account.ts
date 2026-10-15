"use server";

import { revalidatePath } from "next/cache";
import { requireActor, requireFreshSignIn } from "@/lib/actor";
import { attempt } from "@/lib/errors";
import { deactivateOwnAccount, setMarketingConsent, updateOwnProfile } from "@/lib/services/people/account";
import { bool, opt, str } from "./_form";

export async function updateOwnProfileAction(fd: FormData) {
  return attempt(async () => {
    await updateOwnProfile(await requireActor(), { name: str(fd, "name"), country: opt(fd, "country"), timezone: opt(fd, "timezone"), currentRole: opt(fd, "currentRole"), phone: opt(fd, "phone") });
    revalidatePath("/account");
  });
}

export async function marketingConsentAction(fd: FormData) {
  return attempt(async () => {
    await setMarketingConsent(await requireActor(), bool(fd, "granted"));
    revalidatePath("/account");
  });
}

export async function deactivateAccountAction(fd: FormData) {
  return attempt(async () => {
    await requireFreshSignIn();
    await deactivateOwnAccount(await requireActor(), str(fd, "confirm"));
    return { href: "/" };
  });
}
