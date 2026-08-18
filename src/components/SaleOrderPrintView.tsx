"use client";

import { useState } from "react";
import type { Locale } from "@/lib/i18n";
import {
  PrintControls,
  DEFAULT_PRINT_SECTIONS,
  type PrintSectionKey,
} from "@/components/PrintControls";
import { PrintLetterhead } from "@/components/PrintLetterhead";

export type SaleOrderData = {
  orderNo: string;
  orderDate: string;
  clientName: string;
  clientAddress: string | null;
  clientTaxId: string | null;
  clientPhone: string | null;
  clientPoNumber: string | null;
  paymentTerms: string | null;
  deliveryDateText: string;
  salesPersonName: string;
  jobName: string;
  quantity: string;
  unitPrice: string;
  subtotal: string;
  vatRate: number;
  vatAmount: string;
  total: string;
  totalInWords: string;
};

export function SaleOrderPrintView({
  data,
  locale,
  jobId,
}: {
  data: SaleOrderData;
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
        documentType="SALE_ORDER"
        visible={visible}
        onChange={setVisible}
      />

      <div className="mx-auto max-w-3xl bg-white p-10 text-slate-900 shadow-sm print:shadow-none print:p-0">
        {visible.letterhead && <PrintLetterhead />}

        <h1 className="mb-4 text-center text-lg font-semibold">
          ใบสั่งขาย / SALE ORDER
        </h1>

        <div className="mb-4 grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
          <div className="space-y-0.5">
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
          <div className="space-y-0.5 text-right">
            <p>
              <span className="text-slate-500">Order No. / เลขที่ใบสั่งขาย: </span>
              <span className="font-medium">{data.orderNo}</span>
            </p>
            <p>
              <span className="text-slate-500">Date / วันที่: </span>
              <span className="font-medium">{data.orderDate}</span>
            </p>
            <p>
              <span className="text-slate-500">Salesperson / พนักงานขาย: </span>
              <span className="font-medium">{data.salesPersonName}</span>
            </p>
            {data.clientPoNumber && (
              <p>
                <span className="text-slate-500">Client PO / เลขที่ใบสั่งซื้อ: </span>
                <span className="font-medium">{data.clientPoNumber}</span>
              </p>
            )}
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
            <span className="text-slate-500">Subtotal / มูลค่า</span>
            <span>{data.subtotal}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">
              VAT {data.vatRate}% / ภาษีมูลค่าเพิ่ม
            </span>
            <span>{data.vatAmount}</span>
          </div>
          <div className="flex justify-between border-t border-slate-400 pt-1 font-semibold">
            <span>Net Total / ยอดเงินสุทธิ</span>
            <span>{data.total}</span>
          </div>
        </div>

        <p className="mt-4 text-right text-xs text-slate-600">
          ({data.totalInWords})
        </p>

        {visible.notes && (
          <div className="mt-6 space-y-1 text-xs text-slate-600">
            <p>
              หมายเหตุ / Payment terms: {data.paymentTerms ?? "......................................"}
            </p>
            <p>กำหนดส่งของ / Delivery date: {data.deliveryDateText}</p>
          </div>
        )}

        {visible.signatures && (
          <div className="mt-16 grid grid-cols-4 gap-4 text-center text-[11px]">
            <div>
              <p className="border-t border-slate-400 pt-1">
                ผู้จัดทำเอกสาร
                <br />
                Prepared By
              </p>
              <p className="mt-1 text-slate-500">{data.salesPersonName}</p>
            </div>
            <div>
              <p className="border-t border-slate-400 pt-1">
                ผู้รับมอบอำนาจ
                <br />
                Authorized
              </p>
            </div>
            <div>
              <p className="border-t border-slate-400 pt-1">
                ผู้ตรวจสอบ
                <br />
                Checked By
              </p>
            </div>
            <div>
              <p className="border-t border-slate-400 pt-1">
                ผู้จัดการ
                <br />
                Manager
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
