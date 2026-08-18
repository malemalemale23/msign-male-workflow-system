// M Sign's own letterhead info for printed documents (quotations, invoices,
// etc). Extracted from real SmartBiz-issued documents in Drive, but that
// text came from a scanned/OCR'd PDF with some garbled sections, taxId and
// email should be double-checked against an actual current invoice before
// this ships on anything sent to a client.
export const COMPANY = {
  nameTh: "บริษัท เอ็มไซน์ พับลิชชิ่ง จำกัด",
  nameEn: "M SIGN PUBLISHING CO., LTD.",
  addressTh:
    "559/97-98 ซอยนนทรี 20 ถนนนนทรี แขวงช่องนนทรี เขตยานนาวา กรุงเทพฯ 10120",
  addressEn:
    "559/97-98 Soi Nonsee 20, Nonsee Rd., Chongnonsee, Yannawa, Bangkok 10120",
  tel: "02-284-1297",
  fax: "02-163-0079",
  email: "msign_print@hotmail.com",
  // 13-digit Thai corporate tax ID, reconstructed from OCR'd text that had
  // it split awkwardly across lines. Verify against a real invoice.
  taxId: "0105547143081",
} as const;
