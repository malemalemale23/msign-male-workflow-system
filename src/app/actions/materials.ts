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

function num(formData: FormData, name: string) {
  const v = formData.get(name);
  if (v == null || String(v).trim() === "") return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

export async function createMaterial(formData: FormData) {
  await requirePermission("materials.edit");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const material = await prisma.material.create({
    data: {
      name,
      nameTh: str(formData, "nameTh"),
      category: str(formData, "category"),
      supplier: str(formData, "supplier"),
      unit: str(formData, "unit"),
      unitPrice: num(formData, "unitPrice"),
      quantityOnHand: num(formData, "quantityOnHand") ?? 0,
      reorderThreshold: num(formData, "reorderThreshold"),
      notes: str(formData, "notes"),
    },
  });

  revalidatePath("/materials");
  redirect(`/materials/${material.id}`);
}

export async function updateMaterial(materialId: string, formData: FormData) {
  await requirePermission("materials.edit");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Material name can't be empty.");

  await prisma.material.update({
    where: { id: materialId },
    data: {
      name,
      nameTh: str(formData, "nameTh"),
      category: str(formData, "category"),
      supplier: str(formData, "supplier"),
      unit: str(formData, "unit"),
      unitPrice: num(formData, "unitPrice"),
      quantityOnHand: num(formData, "quantityOnHand") ?? 0,
      reorderThreshold: num(formData, "reorderThreshold"),
      notes: str(formData, "notes"),
    },
  });

  revalidatePath("/materials");
  revalidatePath(`/materials/${materialId}`);
}
