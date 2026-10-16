/**
 * GATEWAY METADATA & RESILIENCE CONTROLLER
 * 
 * Cung cấp thông tin trạng thái các Adapter, Health check,
 * và điều khiển Circuit Breaker cho giao diện Frontend.
 */

const gatewayRegistry = require('../adapters/GatewayRegistry');
const circuitBreaker = require('../services/CircuitBreaker');

class GatewayController {
  async getGateways(req, res, next) {
    try {
      const gatewayIds = gatewayRegistry.listAvailableGateways();
      const results = await Promise.all(
        gatewayIds.map(async (id) => {
          const adapter = gatewayRegistry.getAdapter(id);
          const health = await adapter.checkHealth();
          return {
            id,
            name: this.formatGatewayName(id),
            health,
            protocol: this.getGatewayProtocol(id),
            features: this.getGatewayFeatures(id)
          };
        })
      );

      return res.status(200).json({
        success: true,
        data: results
      });
    } catch (err) {
      next(err);
    }
  }

  getCircuitBreakerStatus(req, res, next) {
    try {
      const states = circuitBreaker.getAllStates();
      return res.status(200).json({
        success: true,
        data: states
      });
    } catch (err) {
      next(err);
    }
  }

  resetCircuit(req, res, next) {
    try {
      const { gatewayId } = req.body;
      if (!gatewayId) {
        return res.status(400).json({ success: false, error: 'Thiếu gatewayId' });
      }
      circuitBreaker.resetCircuit(gatewayId);
      return res.status(200).json({
        success: true,
        message: `Mạch cho cổng "${gatewayId}" đã được reset về CLOSED`
      });
    } catch (err) {
      next(err);
    }
  }

  formatGatewayName(id) {
    switch (id) {
      case 'stripe': return 'Stripe Payment Gateway';
      case 'paypal': return 'PayPal Commerce Platform';
      case 'vnpay': return 'VNPay National QR Gateway';
      case 'legacy_bank_xml': return 'Legacy Core Banking Host (XML/SOAP)';
      default: return id;
    }
  }

  getGatewayProtocol(id) {
    switch (id) {
      case 'stripe': return 'REST / JSON (Idempotency Header & Cents format)';
      case 'paypal': return 'REST v2 Orders API (OAuth2 Bearer & Decimal strings)';
      case 'vnpay': return 'URL Query Params + HMAC-SHA512 Signature (x100 VND)';
      case 'legacy_bank_xml': return 'SOAP 1.1 / XML RPC Envelope with Digital Cert';
      default: return 'Custom';
    }
  }

  getGatewayFeatures(id) {
    switch (id) {
      case 'stripe': return ['Idempotency Header', 'Multi-currency', 'Tokenized Cards', 'Instant Refunds'];
      case 'paypal': return ['OAuth2 Handshake', 'Two-phase Capture', 'Buyer Protection', 'Cross-border'];
      case 'vnpay': return ['HMAC-SHA512 Checksum', 'ATM/Domestic Cards', 'VND Fixed Unit', 'QR Code'];
      case 'legacy_bank_xml': return ['SOAP Envelope', 'Mainframe Batch Settled', 'Account Routing', 'XML Host Faults'];
      default: return [];
    }
  }
}

const gatewayControllerInstance = new GatewayController();

module.exports = gatewayControllerInstance;
