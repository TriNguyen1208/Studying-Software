/**
 * services/api.ts - HTTP Client giao tiếp với Backend OOP
 */

const API_BASE_URL = 'http://localhost:5002/api';

export interface AccountDTO {
  id: string;
  accountNumber: string;
  ownerName: string;
  balance: number;
  status: 'ACTIVE' | 'FROZEN' | 'CLOSED';
  createdAt: string;
}

export interface RawDatabaseDTO {
  accounts: {
    id: string;
    account_number: string;
    owner_name: string;
    balance: number;
    status: string;
    created_at: string;
  }[];
  transactions: {
    id: string;
    account_id: string;
    type: string;
    amount: number;
    balance_after: number;
    description: string;
    created_at: string;
  }[];
}

export const api = {
  // Lấy danh sách tài khoản
  async getAccounts(): Promise<AccountDTO[]> {
    const res = await fetch(`${API_BASE_URL}/accounts`);
    const json = await res.json();
    return json.data || [];
  },

  // Nạp tiền
  async deposit(id: string, amount: number, description?: string) {
    const res = await fetch(`${API_BASE_URL}/accounts/${id}/deposit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, description })
    });
    return await res.json();
  },

  // Rút tiền (có thể kích hoạt InsufficientFundsError từ Class)
  async withdraw(id: string, amount: number, description?: string) {
    const res = await fetch(`${API_BASE_URL}/accounts/${id}/withdraw`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, description })
    });
    return await res.json();
  },

  // Chuyển khoản
  async transfer(sourceAccountId: string, targetAccountNumber: string, amount: number, description?: string) {
    const res = await fetch(`${API_BASE_URL}/accounts/transfer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceAccountId, targetAccountNumber, amount, description })
    });
    return await res.json();
  },

  // Thanh toán qua Cổng đa hình (Stripe / VNPay / MoMo)
  async payViaGateway(id: string, amount: number, gatewayType: string, itemDescription: string) {
    const res = await fetch(`${API_BASE_URL}/accounts/${id}/pay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, gatewayType, itemDescription })
    });
    return await res.json();
  },

  // Đổi trạng thái khóa/mở khóa
  async toggleStatus(id: string) {
    const res = await fetch(`${API_BASE_URL}/accounts/${id}/toggle-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    return await res.json();
  },

  // Soi chiếu dữ liệu thô trong file database.sqlite
  async getRawDatabase(): Promise<RawDatabaseDTO> {
    const res = await fetch(`${API_BASE_URL}/database/raw`);
    const json = await res.json();
    return json.data || { accounts: [], transactions: [] };
  }
};
