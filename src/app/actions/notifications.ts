"use server";

import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";

// No extra permission check beyond being logged in - a notification is
// already scoped to the recipient, this just makes sure you can only mark
// your own as read, not someone else's by guessing an id.
export async function markNotificationRead(notificationId: string) {
  const session = await verifySession();
  await prisma.notification.updateMany({
    where: { id: notificationId, userId: session.userId },
    data: { read: true },
  });
  revalidatePath("/", "layout");
}
