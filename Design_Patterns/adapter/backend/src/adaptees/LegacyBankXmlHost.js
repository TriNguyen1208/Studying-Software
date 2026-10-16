/**
 * ADAPTEE 4: LEGACY CORE BANKING MAINFRAME (XML / SOAP RPC HOST)
 * 
 * ĐẶC ĐIỂM RIÊNG CỦA HỆ THỐNG NGÂN HÀNG CỔ ĐIỂN (Core Banking Host):
 * 1. Giao thức truyền tải: XML đóng gói trong SOAP Envelope.
 * 2. Trường định danh dùng thuật ngữ ngân hàng: <BeneficiaryAccount>, <RemittanceAmount>, <CurrencyISO>.
 * 3. Chữ ký điện tử Base64 PKCS#7: <DigitalSignature>.
 * 4. Trả về XML với mã nội bộ:
 *    - <ResponseCode>000</ResponseCode>: Hạch toán thành công.
 *    - <ResponseCode>HOST_ERR_51</ResponseCode>: Không đủ số dư hạn mức.
 *    - <ResponseCode>HOST_ERR_91</ResponseCode>: Máy chủ Core Banking nghẽn kết nối.
 */

class LegacyBankXmlHost {
  constructor(hostUrl = 'http://mainframe.internal.bank:8080/soap/v1/transfer') {
    this.hostUrl = hostUrl;
  }

  async executeXmlRpc(xmlPayload) {
    await new Promise((resolve) => setTimeout(resolve, 250 + Math.random() * 150));

    // Kiểm tra định dạng XML cơ bản
    if (!xmlPayload.includes('<soapenv:Envelope>') || !xmlPayload.includes('</soapenv:Envelope>')) {
      throw new Error('BankHostProtocolError: Malformed SOAP Envelope. Expected XML root tags.');
    }

    // Giả lập trích xuất mã để kiểm tra kịch bản test
    const isInsufficient = xmlPayload.includes('simulate_insufficient_funds');
    const isTimeout = xmlPayload.includes('simulate_timeout');

    if (isTimeout) {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Body>
    <soapenv:Fault>
      <faultcode>soapenv:Server</faultcode>
      <faultstring>HOST_ERR_91: DATABASE_LOCK_TIMEOUT_ON_MAINFRAME</faultstring>
    </soapenv:Fault>
  </soapenv:Body>
</soapenv:Envelope>`;
    }

    if (isInsufficient) {
      return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Body>
    <TransferExecutionResult>
      <ResponseCode>HOST_ERR_51</ResponseCode>
      <ResponseDescription>ACCOUNT_BALANCE_INSUFFICIENT_FOR_TRANSFER</ResponseDescription>
      <HostTimestamp>${new Date().toISOString()}</HostTimestamp>
    </TransferExecutionResult>
  </soapenv:Body>
</soapenv:Envelope>`;
    }

    // Giao dịch ngân hàng thành công
    const hostRefNo = `BNK_TXN_${Date.now()}`;
    return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Body>
    <TransferExecutionResult>
      <ResponseCode>000</ResponseCode>
      <ResponseDescription>TRANSACTION_POSTED_SUCCESSFULLY</ResponseDescription>
      <HostReferenceNumber>${hostRefNo}</HostReferenceNumber>
      <PostingTimestamp>${new Date().toISOString()}</PostingTimestamp>
      <CoreAuditId>CORE_AUDIT_${Math.floor(Math.random() * 1000000)}</CoreAuditId>
    </TransferExecutionResult>
  </soapenv:Body>
</soapenv:Envelope>`;
  }

  async executeXmlReversal(reversalXml) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Body>
    <ReversalResult>
      <ResponseCode>000</ResponseCode>
      <ReversalRef>REV_${Date.now()}</ReversalRef>
    </ReversalResult>
  </soapenv:Body>
</soapenv:Envelope>`;
  }
}

module.exports = LegacyBankXmlHost;
