import { notFound, redirect } from "next/navigation";
import { getAccess } from "@/lib/dal";
import { getLocale } from "@/lib/locale";
import { prisma } from "@/lib/prisma";
import { bahtText } from "@/lib/baht-text";
import { ReceiptPrintView } from "@/components/ReceiptPrintView";

function money(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(d: Date) {
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
}

export default async function ReceiptPrintPage({
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

  // Same aggregation idea as the billing statement, but for invoices this
  // client has actually paid, a receipt proves payment was received.
  const paidJobs = await prisma.job.findMany({
    where: {
      clientId: job.clientId,
      billing: { invoiceNumber: { not: null }, paymentStatus: "PAID" },
    },
    include: { billing: true },
    orderBy: { createdAt: "asc" },
  });

  if (paidJobs.length === 0) redirect(`/jobs/${id}`);

  const rows = paidJobs.map((j) => ({
    invoiceNo: j.billing!.invoiceNumber!,
    invoiceDate: formatDate(j.billing!.paymentReceivedDate ?? j.billing!.createdAt),
    amount: money(j.billing!.amountDue ?? 0),
  }));
  const total = paidJobs.reduce((sum, j) => sum + (j.billing!.amountDue ?? 0), 0);

  return (
    <ReceiptPrintView
      locale={locale}
      jobId={id}
      data={{
        receiptDate: formatDate(new Date()),
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
