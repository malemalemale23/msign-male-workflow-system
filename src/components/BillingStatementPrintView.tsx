"use client";

import { useState } from "react";
import type { Locale } from "@/lib/i18n";
import {
  PrintControls,
  DEFAULT_PRINT_SECTIONS,
  type PrintSectionKey,
} from "@/components/PrintControls";
import { PrintLetterhead } from "@/components/PrintLetterhead";

// This document has no notes/payment-terms block (unlike the other four
// print views), so the "Show on printout" panel only offers the two
// sections that actually exist here.
const BILLING_STATEMENT_SECTIONS: PrintSectionKey[] = ["letterhead", "signatures"];

export type BillingStatementRow = {
  invoiceNo: string;
  invoiceDate: string;
  dueDate: string;
  amount: string;
};

export type BillingStatementData = {
  statementDate: string;
  clientName: string;
  clientAddress: string | null;
  clientTaxId: string | null;
  clientPhone: string | null;
  rows: BillingStatementRow[];
  totalAmount: string;
  totalInWords: string;
};

export function BillingStatementPrintView({
  data,
  locale,
  jobId,
}: {
  data: BillingStatementData;
  locale: Locale;
  jobId: string;
}) {
  const [visible, setVisible] = useState<Record<PrintSectionKey, boolean>>(
    DEFAULT_PRINT_SECTIONS
  );

  return (
    <div className="min-h-screen bg-slate-100 p-6 print:bg-white print:p-0">
      <PrintControls
        locale={locale}
        jobId={jobId}
        documentType="BILLING_STATEMENT"
        visible={visible}
        onChange={setVisible}
        sections={BILLING_STATEMENT_SECTIONS}
      />

      <div className="mx-auto max-w-3xl bg-white p-10 text-slate-900 shadow-sm print:shadow-none print:p-0">
        {visible.letterhead && <PrintLetterhead />}

        <h1 className="mb-4 text-center text-lg font-semibold">
          ใบวางบิล / BILLING STATEMENT
        </h1>

        <div className="mb-4 flex justify-between text-sm">
          <div>
            <p>
              <span className="text-slate-500">Customer / ลูกค้า: </span>
              <span className="font-medium">{data.clientName}</span>
            </p>
            {data.clientAddress && (
              <p className="text-xs text-slate-600">{data.clientAddress}</p>
            )}
            <p className="text-xs text-slate-600">
              {data.clientTaxId && <>Tax ID {data.clientTaxId}</>}
              {data.clientTaxId && data.clientPhone && " · "}
              {data.clientPhone && <>Tel. {data.clientPhone}</>}
            </p>
          </div>
          <div className="text-right">
            <span className="text-slate-500">Date / วันที่: </span>
            <span className="font-medium">{data.statementDate}</span>
          </div>
        </div>

        <table className="mb-4 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-t border-slate-400 text-left">
              <th className="py-2">Delivery/Invoice No. / เลขที่ใบส่งสินค้า</th>
              <th className="py-2">Date / ลงวันที่</th>
              <th className="py-2">Due Date / วันครบกำหนด</th>
              <th className="py-2 text-right">Amount / ยอดที่ต้องชำระ</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => (
              <tr key={row.invoiceNo} className="border-b border-slate-200">
                <td className="py-2">{row.invoiceNo}</td>
                <td className="py-2">{row.invoiceDate}</td>
                <td className="py-2">{row.dueDate}</td>
                <td className="py-2 text-right">{row.amount}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="ml-auto w-64 space-y-1 text-sm">
          <div className="flex justify-between border-t border-slate-400 pt-1 font-semibold">
            <span>Total / รวมเป็นเงิน</span>
            <span>{data.totalAmount}</span>
          </div>
        </div>

        <p className="mt-4 text-right text-xs text-slate-600">
          ({data.totalInWords})
        </p>

        {visible.signatures && (
          <div className="mt-16 grid grid-cols-4 gap-4 text-center text-[11px]">
            <div>
              <p className="border-t border-slate-400 pt-1">
                แผนกการเงิน
                <br />
                Finance Dept.
              </p>
            </div>
            <div>
              <p className="border-t border-slate-400 pt-1">
                ผู้วางบิล
                <br />
                Biller
              </p>
            </div>
            <div>
              <p className="border-t border-slate-400 pt-1">
                ลูกค้า
                <br />
                Customer
              </p>
            </div>
            <div>
              <p className="border-t border-slate-400 pt-1">
                ผู้รับวางบิล
                <br />
                Received By
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
