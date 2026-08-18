import { notFound, redirect } from "next/navigation";
import { getAccess } from "@/lib/dal";
import { getLocale } from "@/lib/locale";
import { prisma } from "@/lib/prisma";
import { bahtText } from "@/lib/baht-text";
import { QuotationPrintView } from "@/components/QuotationPrintView";

function money(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(d: Date) {
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
}

export default async function QuotationPrintPage({
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
    include: { client: true, quote: true, createdBy: true },
  });
  if (!job) notFound();
  if (!job.quote) redirect(`/jobs/${id}`);

  const { quote } = job;
  const subtotal = quote.quotePrice;
  const vatAmount = subtotal * (quote.vatRate / 100);
  const total = subtotal + vatAmount;
  const unitPrice = job.quantity > 0 ? subtotal / job.quantity : 0;

  return (
    <QuotationPrintView
      locale={locale}
      jobId={id}
      data={{
        clientName: job.client.nameTh ?? job.client.name,
        quoteDate: formatDate(quote.createdAt),
        jobName: job.jobName,
        quantity: job.quantity.toLocaleString(),
        unitPrice: money(unitPrice),
        subtotal: money(subtotal),
        vatRate: quote.vatRate,
        vatAmount: money(vatAmount),
        total: money(total),
        totalInWords: bahtText(total),
        deliveryDateText: job.deliveryDueDate
          ? formatDate(job.deliveryDueDate)
          : "......................................",
        preparerName: job.createdBy.name,
      }}
    />
  );
}
