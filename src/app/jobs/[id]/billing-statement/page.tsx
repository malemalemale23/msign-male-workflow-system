import { notFound, redirect } from "next/navigation";
import { getAccess } from "@/lib/dal";
import { getLocale } from "@/lib/locale";
import { prisma } from "@/lib/prisma";
import { bahtText } from "@/lib/baht-text";
import { BillingStatementPrintView } from "@/components/BillingStatementPrintView";

function money(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(d: Date) {
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
}

export default async function BillingStatementPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const access = await getAccess();
  const locale = await getLocale();
  if (!access.can("jobs.view_price")) redirect("/home");

  const job = await prisma.job.findUnique({ where: { id }, include: { client: true } });
  if (!job) notFound();

  // A billing statement aggregates every outstanding invoice for this
  // client, not just this one job, that's the actual point of the document.
  const outstandingJobs = await prisma.job.findMany({
    where: {
      clientId: job.clientId,
      billing: { invoiceNumber: { not: null }, paymentStatus: { not: "PAID" } },
    },
    include: { billing: true },
    orderBy: { createdAt: "asc" },
  });

  if (outstandingJobs.length === 0) redirect(`/jobs/${id}`);

  const rows = outstandingJobs.map((j) => ({
    invoiceNo: j.billing!.invoiceNumber!,
    invoiceDate: formatDate(j.deliveryActualDate ?? j.billing!.createdAt),
    dueDate: j.billing!.paymentDueDate
      ? formatDate(j.billing!.paymentDueDate)
      : "......................................",
    amount: money(j.billing!.amountDue ?? 0),
  }));
  const total = outstandingJobs.reduce((sum, j) => sum + (j.billing!.amountDue ?? 0), 0);

  return (
    <BillingStatementPrintView
      locale={locale}
      jobId={id}
      data={{
        statementDate: formatDate(new Date()),
        clientName: job.client.nameTh ?? job.client.name,
        clientAddress: job.client.address,
        clientTaxId: job.client.taxId,
        clientPhone: job.client.contactInfo,
        rows,
        totalAmount: money(total),
        totalInWords: bahtText(total),
      }}
    />
  );
}
