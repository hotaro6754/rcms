"use server";

import { revalidatePath } from "next/cache";
import { requireActor } from "@/lib/actor";
import { attempt } from "@/lib/errors";
import * as lib from "@/lib/services/cms/library";
import { str } from "./_form";

const input = (fd: FormData) => ({ kind: str(fd, "kind"), title: str(fd, "title"), summary: str(fd, "summary"), body: str(fd, "body"), tags: str(fd, "tags"), sources: str(fd, "sources"), levelId: str(fd, "levelId") });
const refresh = (id?: string) => {
  revalidatePath("/admin/content/library");
  if (id) revalidatePath(`/admin/content/library/${id}`);
  revalidatePath("/resources", "layout");
};

export async function createEntryAction(fd: FormData) {
  return attempt(async () => {
    const e = await lib.createEntry(await requireActor(), input(fd));
    refresh();
    return { id: e.id, href: `/admin/content/library/${e.id}` };
  });
}

export async function updateEntryAction(fd: FormData) {
  return attempt(async () => {
    await lib.updateEntry(await requireActor(), str(fd, "id"), input(fd), Number(str(fd, "lockVersion")));
    refresh(str(fd, "id"));
  });
}

export async function entryWorkflowAction(fd: FormData) {
  return attempt(async () => {
    const actor = await requireActor();
    const id = str(fd, "id");
    switch (str(fd, "op")) {
      case "submit":
        await lib.submitEntry(actor, id);
        break;
      case "withdraw":
        await lib.withdrawEntry(actor, id);
        break;
      case "approve":
        await lib.reviewEntry(actor, id, true, str(fd, "note"));
        break;
      case "reject":
        await lib.reviewEntry(actor, id, false, str(fd, "note"));
        break;
      case "archive":
        await lib.setEntryArchived(actor, id, true);
        break;
      case "restore":
        await lib.setEntryArchived(actor, id, false);
        break;
    }
    refresh(id);
  });
}
