"use client";

import { useState } from "react";
import type { Locale } from "@/lib/i18n";
import {
  PrintControls,
  DEFAULT_PRINT_SECTIONS,
  type PrintSectionKey,
} from "@/components/PrintControls";
import { PrintLetterhead } from "@/components/PrintLetterhead";

export type TaxInvoiceData = {
  invoiceNo: string;
  invoiceDate: string;
  clientName: string;
  clientAddress: string | null;
  clientTaxId: string | null;
  clientPhone: string | null;
  clientPoNumber: string | null;
  paymentTerms: string | null;
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

// Standard retention-of-title / late-payment / damage-claim clause, carried
// over verbatim from a real M Sign tax invoice (one obvious OCR typo fixed:
// source read "ผู้ชาย" where context makes clear it means "ผู้ขาย", seller).
// Flagged for accountant review before this becomes the real system of
// record, same as the rest of Phase 3.
const LEGAL_NOTICE_TH =
  "สินค้าตามรายการข้างต้นยังถือเป็นกรรมสิทธิ์ของผู้ขายจนกว่าผู้ซื้อจะชำระเงินค่าสินค้าจนเสร็จสมบูรณ์ ทางบริษัทฯ จะคิดดอกเบี้ยร้อยละ 2 ต่อเดือน ของจำนวนเงินที่ค้าง นับแต่วันที่ครบกำหนดชำระเงิน ถ้าปรากฏว่าสินค้าเสียหายหรือขาดจำนวน ผู้ซื้อต้องแจ้งเป็นลายลักษณ์อักษรให้ทางบริษัทฯ ทราบภายใน 7 วัน หากพ้นกำหนดจะถือว่าผู้ซื้อได้รับสินค้าถูกต้องเป็นที่เรียบร้อยแล้ว";
const LEGAL_NOTICE_EN =
  "The goods listed above remain the property of the seller until the buyer has paid in full. The company will charge interest at 2% per month on any overdue amount from the payment due date. If goods are found damaged or short in quantity, the buyer must notify the company in writing within 7 days; after this period the buyer will be deemed to have received the goods correctly and in full.";

export function TaxInvoicePrintView({
  data,
  locale,
  jobId,
}: {
  data: TaxInvoiceData;
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
        documentType="TAX_INVOICE"
        visible={visible}
        onChange={setVisible}
      />

      <div className="mx-auto max-w-3xl bg-white p-10 text-slate-900 shadow-sm print:shadow-none print:p-0">
        {visible.letterhead && <PrintLetterhead />}

        <h1 className="mb-4 text-center text-lg font-semibold">
          ใบกำกับภาษี/ใบส่งสินค้า
          <br className="sm:hidden" /> TAX INVOICE / DELIVERY ORDER
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
              <span className="text-slate-500">Invoice No. / เลขที่: </span>
              <span className="font-medium">{data.invoiceNo}</span>
            </p>
            <p>
              <span className="text-slate-500">Date / วันที่: </span>
              <span className="font-medium">{data.invoiceDate}</span>
            </p>
            <p>
              <span className="text-slate-500">Salesperson / พนักงานขาย: </span>
              <span className="font-medium">{data.salesPersonName}</span>
            </p>
            {data.clientPoNumber && (
              <p>
                <span className="text-slate-500">P/O No. / เลขที่ใบสั่งซื้อ: </span>
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
              <th className="py-2 text-right">Amount</th>
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
            <span>Net Total / จำนวนเงินทั้งสิ้น</span>
            <span>{data.total}</span>
          </div>
        </div>

        <p className="mt-4 text-right text-xs text-slate-600">
          ({data.totalInWords})
        </p>

        {visible.notes && (
          <>
            <div className="mt-4 space-y-1 text-xs text-slate-600">
              <p>
                หมายเหตุ / Payment terms: {data.paymentTerms ?? "......................................"}
              </p>
            </div>
            <p className="mt-4 border-t border-slate-200 pt-3 text-[10px] leading-relaxed text-slate-500">
              {LEGAL_NOTICE_TH}
              <br />
              <span className="italic">{LEGAL_NOTICE_EN}</span>
            </p>
            <p className="mt-3 text-xs text-slate-600">
              ได้รับต้นฉบับใบกำกับภาษีและสินค้าตามรายการถูกต้องแล้ว
              <br />
              <span className="italic">
                Original tax invoice and goods listed above received in good order.
              </span>
            </p>
          </>
        )}

        {visible.signatures && (
          <div className="mt-12 grid grid-cols-4 gap-4 text-center text-[11px]">
            <div>
              <p className="border-t border-slate-400 pt-1">
                ผู้รับสินค้า/ผู้ซื้อ
                <br />
                Received By
              </p>
            </div>
            <div>
              <p className="border-t border-slate-400 pt-1">
                ผู้ส่งสินค้า
                <br />
                Delivered By
              </p>
            </div>
            <div>
              <p className="border-t border-slate-400 pt-1">
                ผู้จัดเตรียม
                <br />
                Prepared By
              </p>
              <p className="mt-1 text-slate-500">{data.salesPersonName}</p>
            </div>
            <div>
              <p className="border-t border-slate-400 pt-1">
                ผู้อนุมัติ
                <br />
                Authorized
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
