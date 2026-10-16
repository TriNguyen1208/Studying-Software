/**
 * ADAPTER 4: LEGACY BANK XML / SOAP ADAPTER
 * 
 * VAI TRÒ TRONG PATTERN:
 * - Chuyển đổi JSON Domain DTO thành định dạng XML/SOAP cổ điển của hệ thống Ngân hàng Core.
 * - Giải mã (Parse) chuỗi XML trả về từ Mainframe và dịch mã lỗi máy chủ (Host Errors).
 * 
 * ĐÂY LÀ VÍ DỤ ĐIỂN HÌNH NHẤT CỦA ADAPTER PATTERN TRONG THỰC TẾ:
 * Khi doanh nghiệp hiện đại (REST/JSON, Microservices) bắt buộc phải tích hợp
 * với hệ thống tài chính Core Banking 30 năm tuổi chạy XML/COBOL.
 */

const IPaymentGateway = require('../domain/IPaymentGateway');
const { PaymentStatus, UnifiedPaymentResult, UnifiedRefundResult } = require('../domain/PaymentDTOs');
const {
  InsufficientFundsException,
  GatewayTimeoutException,
  PaymentGatewayException
} = require('../domain/Exceptions');
const LegacyBankXmlHost = require('../adaptees/LegacyBankXmlHost');

class LegacyBankXmlAdapter extends IPaymentGateway {
  constructor(bankHost = null) {
    super();
    this.bankHost = bankHost || new LegacyBankXmlHost();
  }

  get gatewayId() {
    return 'legacy_bank_xml';
  }

  // Tiện ích trích xuất giá trị giữa các thẻ XML (Zero-dependency XML Parser)
  extractXmlTag(xml, tagName) {
    const regex = new RegExp(`<${tagName}>([^<]*)</${tagName}>`, 'i');
    const match = xml.match(regex);
    return match ? match[1].trim() : null;
  }

  async processPayment(request) {
    const transformationLogs = [];

    transformationLogs.push({
      step: '1_RECEIVE_REQUEST',
      detail: 'Nhận UnifiedPaymentRequest từ Domain Core',
      input: {
        orderId: request.orderId,
        amount: request.amount,
        currency: request.currency
      }
    });

    // BƯỚC 1: Xây dựng XML SOAP Request Body từ DTO
    const beneficiaryAccount = request.paymentMethodDetails?.accountNo || '7700192837461';
    const auditId = `OMNI_${Date.now()}`;
    const testTag = request.paymentMethodDetails?.simulateError
      ? `simulate_${request.paymentMethodDetails.simulateError}`
      : 'standard_flow';

    const xmlPayload = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:bk="http://internal.bank/soap/transfer">
  <soapenv:Header>
    <bk:SecurityToken>AUTH_BASE64_TOKEN_X99</bk:SecurityToken>
    <bk:MessageCorrelationId>${auditId}</bk:MessageCorrelationId>
  </soapenv:Header>
  <soapenv:Body>
    <bk:BankTransferRequest>
      <bk:TransactionReference>${request.orderId}</bk:TransactionReference>
      <bk:BeneficiaryAccount>${beneficiaryAccount}</bk:BeneficiaryAccount>
      <bk:RemittanceAmount>${request.amount}</bk:RemittanceAmount>
      <bk:CurrencyISO>${request.currency}</bk:CurrencyISO>
      <bk:ChannelId>OMNIPAY_GATEWAY_V1</bk:ChannelId>
      <bk:SimulationFlag>${testTag}</bk:SimulationFlag>
    </bk:BankTransferRequest>
  </soapenv:Body>
</soapenv:Envelope>`;

    transformationLogs.push({
      step: '2_XML_MARSHALLING',
      detail: 'Chuyển đổi đối tượng JSON thành chuỗi tài liệu XML tuân thủ chuẩn SOAP Envelope',
      rawXmlPayload: xmlPayload
    });

    try {
      transformationLogs.push({
        step: '3_DISPATCH_TO_MAINFRAME',
        detail: 'Gọi phương thức executeXmlRpc() trên máy chủ Core Banking Host'
      });

      const xmlResponse = await this.bankHost.executeXmlRpc(xmlPayload);

      transformationLogs.push({
        step: '4_XML_UNMARSHALLING',
        detail: 'Giải mã (parse) chuỗi XML trả về từ máy chủ ngân hàng',
        rawXmlResponse: xmlResponse
      });

      // Kiểm tra SOAP Fault
      if (xmlResponse.includes('<soapenv:Fault>')) {
        const faultString = this.extractXmlTag(xmlResponse, 'faultstring') || '';
        if (faultString.includes('HOST_ERR_91') || faultString.includes('TIMEOUT')) {
          throw new GatewayTimeoutException(faultString, {
            gatewayType: this.gatewayId,
            originalError: xmlResponse
          });
        }
        throw new PaymentGatewayException(faultString || 'Lỗi SOAP Fault từ máy chủ Core Bank', {
          gatewayType: this.gatewayId,
          originalError: xmlResponse
        });
      }

      // Trích xuất mã phản hồi ngân hàng
      const responseCode = this.extractXmlTag(xmlResponse, 'ResponseCode');
      const hostRefNo = this.extractXmlTag(xmlResponse, 'HostReferenceNumber');
      const responseDesc = this.extractXmlTag(xmlResponse, 'ResponseDescription');

      if (responseCode === 'HOST_ERR_51') {
        throw new InsufficientFundsException(`Ngân hàng từ chối: ${responseDesc}`, {
          gatewayType: this.gatewayId,
          originalError: xmlResponse
        });
      }

      const isSuccess = responseCode === '000';

      const normalizedResult = new UnifiedPaymentResult({
        transactionId: `TXN_OMNI_${Date.now()}`,
        orderId: request.orderId,
        gatewayType: this.gatewayId,
        status: isSuccess ? PaymentStatus.SUCCESS : PaymentStatus.FAILED,
        amount: request.amount,
        currency: request.currency,
        providerTransactionId: hostRefNo || `BNK_REF_${Date.now()}`,
        rawProviderResponse: { rawXml: xmlResponse },
        transformationLogs
      });

      transformationLogs.push({
        step: '5_NORMALIZE_RESPONSE',
        detail: `Dịch mã ResponseCode "${responseCode}" -> Trạng thái ${normalizedResult.status}`,
        status: normalizedResult.status,
        providerTxnId: normalizedResult.providerTransactionId
      });

      return normalizedResult;
    } catch (err) {
      if (err instanceof InsufficientFundsException || err instanceof GatewayTimeoutException) {
        throw err;
      }
      throw new PaymentGatewayException(err.message || 'Lỗi không xác định từ Core Banking Mainframe', {
        gatewayType: this.gatewayId,
        originalError: err
      });
    }
  }

  async processRefund(request) {
    const reversalXml = `<ReversalRequest><OriginalRef>${request.providerTransactionId}</OriginalRef></ReversalRequest>`;
    const responseXml = await this.bankHost.executeXmlReversal(reversalXml);
    const code = this.extractXmlTag(responseXml, 'ResponseCode');

    return new UnifiedRefundResult({
      refundId: `REFUND_OMNI_${Date.now()}`,
      transactionId: request.transactionId,
      providerRefundId: `REV_${Date.now()}`,
      gatewayType: this.gatewayId,
      status: code === '000' ? PaymentStatus.REFUNDED : PaymentStatus.FAILED,
      amount: request.amount,
      currency: request.currency,
      rawProviderResponse: { rawXml: responseXml }
    });
  }

  async verifyWebhook(rawPayload, headers) {
    return {
      eventType: 'bank.clearing.batch_settled',
      providerEventId: `bank_evt_${Date.now()}`,
      gatewayType: this.gatewayId,
      data: rawPayload
    };
  }

  async checkHealth() {
    return {
      gatewayId: this.gatewayId,
      status: 'UP',
      latencyMs: 142,
      version: 'ISO8583-SOAP-XML'
    };
  }
}

module.exports = LegacyBankXmlAdapter;
