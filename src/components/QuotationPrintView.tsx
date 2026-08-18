"use client";

import { useState } from "react";
import type { Locale } from "@/lib/i18n";
import {
  PrintControls,
  DEFAULT_PRINT_SECTIONS,
  type PrintSectionKey,
} from "@/components/PrintControls";
import { PrintLetterhead } from "@/components/PrintLetterhead";

export type QuotationData = {
  clientName: string;
  quoteDate: string;
  jobName: string;
  quantity: string;
  unitPrice: string;
  subtotal: string;
  vatRate: number;
  vatAmount: string;
  total: string;
  totalInWords: string;
  deliveryDateText: string;
  preparerName: string;
};

export function QuotationPrintView({
  data,
  locale,
  jobId,
}: {
  data: QuotationData;
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
        documentType="QUOTATION"
        visible={visible}
        onChange={setVisible}
      />

      <div className="mx-auto max-w-3xl bg-white p-10 text-slate-900 shadow-sm print:shadow-none print:p-0">
        {visible.letterhead && <PrintLetterhead />}

        <h1 className="mb-4 text-center text-lg font-semibold">
          ใบเสนอราคา / QUOTATION
        </h1>

        <div className="mb-4 flex justify-between text-sm">
          <div>
            <span className="text-slate-500">Customer / ลูกค้า: </span>
            <span className="font-medium">{data.clientName}</span>
          </div>
          <div>
            <span className="text-slate-500">Date / วันที่: </span>
            <span className="font-medium">{data.quoteDate}</span>
          </div>
        </div>

        <table className="mb-4 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-t border-slate-400 text-left">
              <th className="py-2">Description / รายการ</th>
              <th className="py-2 text-right">Qty / จำนวน</th>
              <th className="py-2 text-right">Unit Price</th>
              <th className="py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-200">
              <td className="py-3">{data.jobName}</td>
              <td className="py-3 text-right">{data.quantity}</td>
              <td className="py-3 text-right">{data.unitPrice}</td>
              <td className="py-3 text-right">{data.subtotal}</td>
            </tr>
          </tbody>
        </table>

        <div className="ml-auto w-64 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Subtotal / รวมเป็นเงิน</span>
            <span>{data.subtotal}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">
              VAT {data.vatRate}% / ภาษีมูลค่าเพิ่ม
            </span>
            <span>{data.vatAmount}</span>
          </div>
          <div className="flex justify-between border-t border-slate-400 pt-1 font-semibold">
            <span>Total / รวมทั้งสิ้น</span>
            <span>{data.total}</span>
          </div>
        </div>

        <p className="mt-4 text-right text-xs text-slate-600">
          ({data.totalInWords})
        </p>

        {visible.notes && (
          <div className="mt-6 space-y-1 text-xs text-slate-600">
            <p>หมายเหตุ / Note: 1. กำหนดชำระเงิน ......................................</p>
            <p>2. กำหนดส่งของ / Delivery date: {data.deliveryDateText}</p>
          </div>
        )}

        {visible.signatures && (
          <div className="mt-16 grid grid-cols-2 gap-8 text-center text-xs">
            <div>
              <p className="border-t border-slate-400 pt-1">
                ผู้สั่งซื้อ / Ordered by
              </p>
            </div>
            <div>
              <p className="border-t border-slate-400 pt-1">
                ผู้เสนอราคา / Quoted by
              </p>
              <p className="mt-1 text-slate-500">{data.preparerName}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
