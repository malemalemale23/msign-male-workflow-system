"use client";

import { useState } from "react";
import type { Locale } from "@/lib/i18n";
import {
  PrintControls,
  DEFAULT_PRINT_SECTIONS,
  type PrintSectionKey,
} from "@/components/PrintControls";
import { PrintLetterhead } from "@/components/PrintLetterhead";

export type ReceiptRow = {
  invoiceNo: string;
  invoiceDate: string;
  amount: string;
};

export type ReceiptData = {
  receiptDate: string;
  clientName: string;
  clientAddress: string | null;
  clientTaxId: string | null;
  clientPhone: string | null;
  rows: ReceiptRow[];
  totalAmount: string;
  totalInWords: string;
};

export function ReceiptPrintView({
  data,
  locale,
  jobId,
}: {
  data: ReceiptData;
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
        documentType="RECEIPT"
        visible={visible}
        onChange={setVisible}
      />

      <div className="mx-auto max-w-3xl bg-white p-10 text-slate-900 shadow-sm print:shadow-none print:p-0">
        {visible.letterhead && <PrintLetterhead />}

        <h1 className="mb-4 text-center text-lg font-semibold">
          ใบเสร็จรับเงิน / RECEIPT
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
            <span className="font-medium">{data.receiptDate}</span>
          </div>
        </div>

        <table className="mb-4 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-t border-slate-400 text-left">
              <th className="py-2">Tax Invoice/Delivery No. / เลขที่ใบกำกับภาษี</th>
              <th className="py-2">Date / ลงวันที่</th>
              <th className="py-2 text-right">Amount / ยอดที่ต้องชำระ</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => (
              <tr key={row.invoiceNo} className="border-b border-slate-200">
                <td className="py-2">{row.invoiceNo}</td>
                <td className="py-2">{row.invoiceDate}</td>
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

        {visible.notes && (
          <div className="mt-6 space-y-1.5 text-xs text-slate-600">
            <p className="font-medium text-slate-700">ชำระโดย / Paid by:</p>
            <p>
              ☐ เงินสด / Cash &nbsp;&nbsp;&nbsp; จำนวนเงิน / Amount: ......................
            </p>
            <p>
              ☐ โอนเข้าธนาคาร / Bank transfer &nbsp;&nbsp;&nbsp; ธนาคาร / Bank: ......................
              &nbsp;&nbsp;&nbsp; วันที่ / Date: ......................
            </p>
            <p>
              ☐ เช็ค / Cheque &nbsp;&nbsp;&nbsp; เลขที่ / No.: ...................... &nbsp;&nbsp;&nbsp;
              วันที่ / Date: ......................
            </p>
            <p className="pt-1 text-[10px] leading-relaxed">
              หมายเหตุ: ใบเสร็จรับเงินฉบับนี้จะสมบูรณ์ต่อเมื่อมีลายเซ็นต์ผู้รับเงิน
              และได้รับเงินเข้าบัญชีของบริษัทฯ เรียบร้อยแล้ว
              <br />
              <span className="italic">
                Note: This receipt is valid only once signed by the payee and
                payment has been confirmed received.
              </span>
            </p>
          </div>
        )}

        {visible.signatures && (
          <div className="mt-8 grid grid-cols-2 gap-8 text-center text-xs">
            <div>
              <p className="border-t border-slate-400 pt-1">
                ผู้มีอำนาจ / Authorized Signature
              </p>
            </div>
            <div>
              <p className="border-t border-slate-400 pt-1">
                ผู้รับเงิน / Bill Collector
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
