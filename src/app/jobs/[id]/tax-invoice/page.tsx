import { notFound, redirect } from "next/navigation";
import { getAccess } from "@/lib/dal";
import { getLocale } from "@/lib/locale";
import { prisma } from "@/lib/prisma";
import { bahtText } from "@/lib/baht-text";
import { TaxInvoicePrintView } from "@/components/TaxInvoicePrintView";

function money(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(d: Date) {
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
}

export default async function TaxInvoicePrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const access = await getAccess();
  const locale = await getLocale();
  if (!access.can("jobs.view_price")) redirect("/home");

  const job = await prisma.job.findUnique({
    where: { id },
    include: { client: true, quote: true, createdBy: true, billing: true },
  });
  if (!job) notFound();
  if (!job.quote) redirect(`/jobs/${id}`);

  const invoiceNumber = job.billing?.invoiceNumber;
  // A tax invoice needs a real invoice number on file, printing one for a
  // job that hasn't been invoiced yet would be a document that doesn't
  // correspond to anything issued.
  if (!invoiceNumber) redirect(`/jobs/${id}`);

  const { quote, client, billing } = job;
  const subtotal = quote.quotePrice;
  const vatAmount = subtotal * (quote.vatRate / 100);
  const total = subtotal + vatAmount;
  const unitPrice = job.quantity > 0 ? subtotal / job.quantity : 0;

  return (
    <TaxInvoicePrintView
      locale={locale}
      jobId={id}
      data={{
        invoiceNo: invoiceNumber,
        invoiceDate: formatDate(job.deliveryActualDate ?? billing!.createdAt),
        clientName: client.nameTh ?? client.name,
        clientAddress: client.address,
        clientTaxId: client.taxId,
        clientPhone: client.contactInfo,
        clientPoNumber: job.poNumber,
        paymentTerms:
          client.creditTermDays != null
            ? `Credit ${client.creditTermDays} days / เครดิต ${client.creditTermDays} วัน`
            : null,
        salesPersonName: job.createdBy.name,
        jobName: job.jobName,
        quantity: job.quantity.toLocaleString(),
        unitPrice: money(unitPrice),
        subtotal: money(subtotal),
        vatRate: quote.vatRate,
        vatAmount: money(vatAmount),
        total: money(total),
        totalInWords: bahtText(total),
      }}
    />
  );
}
