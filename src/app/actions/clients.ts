"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/dal";
import { prisma } from "@/lib/prisma";

function str(formData: FormData, name: string) {
  const v = formData.get(name);
  const s = v ? String(v).trim() : "";
  return s || null;
}

export async function createClient(formData: FormData) {
  await requirePermission("clients.edit");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const client = await prisma.client.create({
    data: {
      name,
      nameTh: str(formData, "nameTh"),
      address: str(formData, "address"),
      taxId: str(formData, "taxId"),
      contactInfo: str(formData, "contactInfo"),
      creditTermDays: formData.get("creditTermDays")
        ? Number(formData.get("creditTermDays"))
        : null,
    },
  });

  revalidatePath("/clients");
  redirect(`/clients/${client.id}`);
}

export async function updateClient(clientId: string, formData: FormData) {
  await requirePermission("clients.edit");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Client name can't be empty.");

  await prisma.client.update({
    where: { id: clientId },
    data: {
      name,
      nameTh: str(formData, "nameTh"),
      address: str(formData, "address"),
      taxId: str(formData, "taxId"),
      contactInfo: str(formData, "contactInfo"),
      creditTermDays: formData.get("creditTermDays")
        ? Number(formData.get("creditTermDays"))
        : null,
    },
  });

  revalidatePath("/clients");
  revalidatePath(`/clients/${clientId}`);
}
