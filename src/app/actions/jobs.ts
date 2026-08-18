"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { logActivity, notifyByPermission } from "@/lib/activity";
import type { ProductType } from "@/generated/prisma/client";

const DEFAULT_DUE_DAYS = 14;

function defaultDueDate() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + DEFAULT_DUE_DAYS);
  return d;
}

async function nextJobCode() {
  const last = await prisma.job.findFirst({
    orderBy: { createdAt: "desc" },
    select: { jobCode: true },
  });
  const lastNumber = last ? parseInt(last.jobCode.replace(/\D/g, ""), 10) : 0;
  const next = (isNaN(lastNumber) ? 0 : lastNumber) + 1;
  return `MS-${String(next).padStart(4, "0")}`;
}

export async function createJob(formData: FormData) {
  const session = await requirePermission("jobs.create");

  const newClientName = String(formData.get("newClientName") ?? "").trim();
  const newClientNameTh = String(formData.get("newClientNameTh") ?? "").trim();
  const existingClientId = String(formData.get("clientId") ?? "");

  const num = (name: string) => Number(formData.get(name) ?? 0) || 0;
  const str = (name: string) => {
    const v = formData.get(name);
    return v ? String(v).trim() : null;
  };

  // Address/tax ID/contact/credit terms are optional here - same fields
  // available on the Client edit page, just filled in now if known instead
  // of leaving them for later.
  const clientId = newClientName
    ? (
        await prisma.client.create({
          data: {
            name: newClientName,
            nameTh: newClientNameTh || null,
            address: str("newClientAddress"),
            taxId: str("newClientTaxId"),
            contactInfo: str("newClientContactInfo"),
            creditTermDays: formData.get("newClientCreditTermDays")
              ? Number(formData.get("newClientCreditTermDays"))
              : null,
          },
        })
      ).id
    : existingClientId;

  // Neither an existing client was picked nor a new one typed - failing
  // silently here would leave the user on a form that looks like it did
  // nothing, send them back with a visible reason instead.
  if (!clientId) redirect("/jobs/new?error=missing_client");

  const jobCode = await nextJobCode();
  const quantity = num("quantity");
  const estimatedDM = num("estimatedDM");
  const estimatedDL = num("estimatedDL");
  const estimatedMOH = num("estimatedMOH");
  const quotePrice = num("quotePrice");
  const vatRateRaw = formData.get("vatRate");
  const vatRate = vatRateRaw === null || vatRateRaw === "" ? 7 : Number(vatRateRaw);

  const job = await prisma.job.create({
    data: {
      jobCode,
      clientId,
      jobName: String(formData.get("jobName") ?? "").trim(),
      shortName: str("shortName"),
      productType: formData.get("productType") as ProductType,
      quantity,
      paperType: str("paperType"),
      paperWeight: str("paperWeight"),
      paperSize: str("paperSize"),
      hasDesign: formData.get("hasDesign") === "on",
      hasMock: formData.get("hasMock") === "on",
      hasPlate: formData.get("hasPlate") === "on",
      hasEmboss: formData.get("hasEmboss") === "on",
      hasVarnish: formData.get("hasVarnish") === "on",
      hasGlue: formData.get("hasGlue") === "on",
      hasDieCut: formData.get("hasDieCut") === "on",
      hasHotStamp: formData.get("hasHotStamp") === "on",
      hasKCoating: formData.get("hasKCoating") === "on",
      hasFolding: formData.get("hasFolding") === "on",
      // Left blank on the form: default to a standard 14 days out rather
      // than leaving it empty, every job now always has a due date.
      deliveryDueDate: str("deliveryDueDate")
        ? new Date(str("deliveryDueDate")!)
        : defaultDueDate(),
      poNumber: str("poNumber"),
      poDate: str("poDate") ? new Date(str("poDate")!) : null,
      createdById: session.userId,
      quote: {
        create: { estimatedDM, estimatedDL, estimatedMOH, quotePrice, vatRate },
      },
    },
  });

  revalidatePath("/jobs");
  redirect(`/jobs/${job.id}`);
}

export async function confirmPO(jobId: string, formData: FormData) {
  const session = await requirePermission("jobs.edit_logistics");
  const poNumber = String(formData.get("poNumber") ?? "").trim();
  const poDateRaw = String(formData.get("poDate") ?? "");

  await prisma.job.update({
    where: { id: jobId },
    data: {
      poNumber: poNumber || null,
      poDate: poDateRaw ? new Date(poDateRaw) : null,
      stage: "PURCHASE_ORDER",
    },
  });
  await logActivity(jobId, session.userId, "STAGE_CHANGE", "PURCHASE_ORDER");
  revalidatePath(`/jobs/${jobId}`);
}

export async function updateSaleOrder(jobId: string, formData: FormData) {
  const session = await requirePermission("jobs.edit_logistics");
  const paperSupplier = String(formData.get("paperSupplier") ?? "").trim();
  const materialsReady = formData.get("materialsReady") === "on";

  await prisma.job.update({
    where: { id: jobId },
    data: {
      paperSupplier: paperSupplier || null,
      materialsReady,
      materialsOrderedAt: new Date(),
      stage: materialsReady ? "PRODUCTION" : "SALE_ORDER",
    },
  });
  // Only a real transition when materials are actually ready - otherwise
  // the stage doesn't change (stays SALE_ORDER), nothing to log.
  if (materialsReady) {
    await logActivity(jobId, session.userId, "STAGE_CHANGE", "PRODUCTION");
  }
  revalidatePath(`/jobs/${jobId}`);
}

// Spec (paper + which finishing steps this job needs) was never editable
// after job creation - a client changing their mind about spec mid-job had
// no way to be reflected. Available at any stage, not gated to one, since
// this can come up any time before the job's actually finished.
export async function updateJobSpec(jobId: string, formData: FormData) {
  await requirePermission("jobs.edit_production");
  const str = (name: string) => {
    const v = formData.get(name);
    return v ? String(v).trim() || null : null;
  };
  const flag = (name: string) => formData.get(name) === "on";

  await prisma.job.update({
    where: { id: jobId },
    data: {
      paperType: str("paperType"),
      paperWeight: str("paperWeight"),
      paperSize: str("paperSize"),
      hasDesign: flag("hasDesign"),
      hasMock: flag("hasMock"),
      hasPlate: flag("hasPlate"),
      hasEmboss: flag("hasEmboss"),
      hasVarnish: flag("hasVarnish"),
      hasGlue: flag("hasGlue"),
      hasDieCut: flag("hasDieCut"),
      hasHotStamp: flag("hasHotStamp"),
      hasKCoating: flag("hasKCoating"),
      hasFolding: flag("hasFolding"),
    },
  });
  revalidatePath(`/jobs/${jobId}`);
}

export async function toggleProductionStep(
  jobId: string,
  field:
    | "designDone"
    | "mockDone"
    | "plateDone"
    | "printDone"
    | "embossDone"
    | "varnishDone"
    | "glueDone"
    | "dieCutDone"
    | "hotStampDone"
    | "kCoatingDone"
    | "foldingDone",
  value: boolean
) {
  const session = await requirePermission("jobs.edit_production");
  await prisma.job.update({ where: { id: jobId }, data: { [field]: value } });
  await logActivity(
    jobId,
    session.userId,
    value ? "STEP_COMPLETED" : "STEP_REOPENED",
    field
  );
  revalidatePath(`/jobs/${jobId}`);
}

// Was missing entirely: toggling every production step never actually moved
// the job's stage, there was no button anywhere that set it. This is that
// button's action.
export async function advanceToQC(jobId: string) {
  const session = await requirePermission("jobs.edit_production");
  await prisma.job.update({ where: { id: jobId }, data: { stage: "QC" } });
  await logActivity(jobId, session.userId, "STAGE_CHANGE", "QC");
  // Production is handing off to the next step - the closest match to the
  // user's own "manager tracking DM gets notified" example.
  await notifyByPermission(jobId, "QC", "jobs.view_cost");
  revalidatePath(`/jobs/${jobId}`);
}

export async function submitQC(jobId: string, formData: FormData) {
  const session = await requirePermission("jobs.edit_production");
  const passed = formData.get("result") === "pass";
  const qcNote = String(formData.get("qcNote") ?? "").trim();
  const nextStage = passed ? "DELIVERY" : "PRODUCTION";

  await prisma.job.update({
    where: { id: jobId },
    data: {
      qcPassed: passed,
      qcNote: qcNote || null,
      // Fail loops back to Production for rework, matches how a small shop
      // actually reprints rather than tracking a separate rework stage.
      stage: nextStage,
    },
  });
  await logActivity(jobId, session.userId, "STAGE_CHANGE", nextStage);
  revalidatePath(`/jobs/${jobId}`);
}

// General delivery/transportation instructions for the job as a whole -
// separate from the per-shipment notes recordDelivery below collects.
// Editable any time a job is at/past PURCHASE_ORDER, not tied to logging
// an actual shipment.
export async function updateDeliveryInstructions(jobId: string, formData: FormData) {
  await requirePermission("jobs.edit_logistics");
  const deliveryInstructions = String(formData.get("deliveryInstructions") ?? "").trim() || null;
  await prisma.job.update({ where: { id: jobId }, data: { deliveryInstructions } });
  revalidatePath(`/jobs/${jobId}`);
}

export async function recordDelivery(jobId: string, formData: FormData) {
  const session = await requirePermission("jobs.edit_logistics");
  const quantity = Number(formData.get("quantity") ?? 0);
  const notes = String(formData.get("notes") ?? "").trim();
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error("Delivery quantity must be a positive number.");
  }

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: { deliveries: true },
  });
  if (!job) throw new Error("Job not found.");

  const deliveredSoFar = job.deliveries.reduce((sum, d) => sum + d.quantity, 0);
  const remaining = job.quantity - deliveredSoFar;
  if (quantity > remaining) {
    throw new Error(
      `Delivery of ${quantity} exceeds the ${remaining} still remaining on this job.`
    );
  }

  const nowFullyDelivered = deliveredSoFar + quantity >= job.quantity;

  await prisma.job.update({
    where: { id: jobId },
    data: {
      // Only set on the first delivery, later partial shipments don't
      // overwrite it - it's just an invoice-date fallback, not a log.
      deliveryActualDate: job.deliveryActualDate ?? new Date(),
      stage: nowFullyDelivered ? "BILLING" : "DELIVERY",
      // On-hold only means anything while there's finished stock still
      // sitting here (see the Delivery-stage-only UI for it) - once
      // everything's shipped, clear it, there's nothing left to hold, and
      // the control that could otherwise un-check it disappears with the
      // stage change.
      ...(nowFullyDelivered ? { onHold: false, holdReason: null } : {}),
      deliveries: {
        create: { quantity, notes: notes || null },
      },
    },
  });
  if (nowFullyDelivered) {
    await logActivity(jobId, session.userId, "STAGE_CHANGE", "BILLING");
  }
  revalidatePath(`/jobs/${jobId}`);
}

export async function updateBilling(jobId: string, formData: FormData) {
  const session = await requirePermission("jobs.edit_logistics");
  const invoiceNumber = String(formData.get("invoiceNumber") ?? "").trim();
  const amountDue = Number(formData.get("amountDue") ?? 0) || null;
  const paymentDueDateStr = String(formData.get("paymentDueDate") ?? "");
  const paymentDueDate = paymentDueDateStr ? new Date(paymentDueDateStr) : null;
  const paymentStatus = String(formData.get("paymentStatus") ?? "PENDING") as
    | "PENDING"
    | "PARTIAL"
    | "PAID";
  const notes = String(formData.get("notes") ?? "").trim() || null;

  // Only stamp the received date once, the first time a job is marked PAID,
  // don't keep overwriting it on later unrelated edits to this form.
  const existing = await prisma.billing.findUnique({ where: { jobId } });
  const paymentReceivedDate =
    paymentStatus === "PAID"
      ? (existing?.paymentReceivedDate ?? new Date())
      : null;

  await prisma.job.update({
    where: { id: jobId },
    data: {
      closed: paymentStatus === "PAID",
      stage: paymentStatus === "PAID" ? "ARCHIVED" : "BILLING",
      billing: {
        upsert: {
          create: { invoiceNumber, amountDue, paymentDueDate, paymentStatus, paymentReceivedDate, notes },
          update: { invoiceNumber, amountDue, paymentDueDate, paymentStatus, paymentReceivedDate, notes },
        },
      },
    },
  });
  if (paymentStatus === "PAID") {
    await logActivity(jobId, session.userId, "STAGE_CHANGE", "ARCHIVED");
  }
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/jobs");
  revalidatePath("/jobs/archive");

  // Closing a job (marking it PAID) archives it - nothing more to do on its
  // detail page, so head back to the active Job Board rather than leaving
  // the user looking at a job that just left the active list.
  if (paymentStatus === "PAID") {
    redirect("/jobs");
  }
}

// Reuses jobs.view_cost as the gate rather than adding a separate edit key:
// by default only Admin has that permission, so this stays Admin-only
// without inventing a new toggle that would just mirror the same default.
export async function saveActualCost(jobId: string, formData: FormData) {
  const session = await requirePermission("jobs.view_cost");

  const actualDM = Number(formData.get("actualDM") ?? 0) || 0;
  const actualDL = Number(formData.get("actualDL") ?? 0) || 0;
  const actualMOH = Number(formData.get("actualMOH") ?? 0) || 0;

  const job = await prisma.job.findUniqueOrThrow({
    where: { id: jobId },
    include: { quote: true },
  });
  const actualProfit = job.quote
    ? job.quote.quotePrice - (actualDM + actualDL + actualMOH)
    : null;

  await prisma.actualCost.upsert({
    where: { jobId },
    create: {
      jobId,
      actualDM,
      actualDL,
      actualMOH,
      actualProfit,
      closedById: session.userId,
      closedAt: new Date(),
    },
    update: { actualDM, actualDL, actualMOH, actualProfit },
  });
  revalidatePath(`/jobs/${jobId}`);
}

// Display-layer override, not a schedule change - see the on-hold design
// doc. Clearing the checkbox drops the reason too, no point keeping a
// stale explanation for a job that's no longer held.
export async function setJobHold(jobId: string, formData: FormData) {
  await requirePermission("jobs.edit_logistics");
  const onHold = formData.get("onHold") === "on";
  const holdReason = onHold ? String(formData.get("holdReason") ?? "").trim() || null : null;

  await prisma.job.update({ where: { id: jobId }, data: { onHold, holdReason } });
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/jobs");
}
