// Мониторинг входящих платежей
export interface PaymentTransaction {
  txHash: string;
  network: string;
  fromAddress: string;
  toAddress: string;
  amount: number;
  currency: string;
  userId: string;
  memo?: string;
  confirmations: number;
  status: 'pending' | 'confirmed' | 'failed';
  timestamp: Date;
}

export class PaymentMonitor {
  private apiKeys = {
    TON_API: process.env.TON_API_KEY || '',
    BTC_API: process.env.BLOCKCHAIN_INFO_API || '', // blockchain.info
    ETH_API: process.env.ETHERSCAN_API_KEY || '', // etherscan.io
    TRON_API: process.env.TRON_GRID_API || '', // trongrid.io
    SOLANA_API: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
  };

  // Проверка платежей для пользователя
  async checkPayments(userId: string, network: string, address: string): Promise<PaymentTransaction[]> {
    try {
      switch (network.toUpperCase()) {
        case 'TON':
          return await this.checkTONPayments(userId, address);
        case 'BTC':
          return await this.checkBTCPayments(userId, address);
        case 'ETH':
        case 'ERC20':
          return await this.checkETHPayments(userId, address, network);
        case 'TRC20':
          return await this.checkTRC20Payments(userId, address);
        case 'SOL':
          return await this.checkSOLPayments(userId, address);
        default:
          throw new Error(`Мониторинг для сети ${network} не реализован`);
      }
    } catch (error) {
      console.error(`Ошибка мониторинга ${network}:`, error);
      return [];
    }
  }

  private async checkTONPayments(userId: string, address: string): Promise<PaymentTransaction[]> {
    // TON API запрос
    const response = await fetch(`https://toncenter.com/api/v2/getTransactions?address=${address}&limit=50`, {
      headers: {
        'X-API-Key': this.apiKeys.TON_API
      }
    });
    
    const data = await response.json();
    
    return data.result.map((tx: any) => ({
      txHash: tx.transaction_id.hash,
      network: 'TON',
      fromAddress: tx.in_msg?.source || '',
      toAddress: address,
      amount: parseInt(tx.in_msg?.value || '0') / 1e9, // TON в нанотонах
      currency: 'TON',
      userId,
      memo: tx.in_msg?.message || '',
      confirmations: tx.now ? 1 : 0,
      status: tx.now ? 'confirmed' : 'pending',
      timestamp: new Date(tx.now * 1000)
    }));
  }

  private async checkBTCPayments(userId: string, address: string): Promise<PaymentTransaction[]> {
    // Blockchain.info API
    const response = await fetch(`https://blockchain.info/rawaddr/${address}?format=json&limit=50`);
    const data = await response.json();
    
    return data.txs.map((tx: any) => ({
      txHash: tx.hash,
      network: 'BTC',
      fromAddress: tx.inputs[0]?.prev_out?.addr || '',
      toAddress: address,
      amount: tx.out.reduce((sum: number, out: any) => 
        out.addr === address ? sum + out.value / 1e8 : sum, 0),
      currency: 'BTC',
      userId,
      confirmations: tx.block_height ? 1 : 0,
      status: tx.block_height ? 'confirmed' : 'pending',
      timestamp: new Date(tx.time * 1000)
    }));
  }

  private async checkETHPayments(userId: string, address: string, network: string): Promise<PaymentTransaction[]> {
    const isERC20 = network === 'ERC20';
    const apiUrl = isERC20 
      ? `https://api.etherscan.io/api?module=account&action=tokentx&contractaddress=0xdac17f958d2ee523a2206206994597c13d831ec7&address=${address}&apikey=${this.apiKeys.ETH_API}`
      : `https://api.etherscan.io/api?module=account&action=txlist&address=${address}&apikey=${this.apiKeys.ETH_API}`;
    
    const response = await fetch(apiUrl);
    const data = await response.json();
    
    return data.result.map((tx: any) => ({
      txHash: tx.hash,
      network,
      fromAddress: tx.from,
      toAddress: tx.to,
      amount: isERC20 
        ? parseInt(tx.value) / 1e6 // USDT имеет 6 десятичных знаков
        : parseInt(tx.value) / 1e18, // ETH в wei
      currency: isERC20 ? 'USDT' : 'ETH',
      userId,
      confirmations: parseInt(tx.confirmations || '0'),
      status: parseInt(tx.confirmations || '0') > 0 ? 'confirmed' : 'pending',
      timestamp: new Date(parseInt(tx.timeStamp) * 1000)
    }));
  }

  private async checkTRC20Payments(userId: string, address: string): Promise<PaymentTransaction[]> {
    // TronGrid API для USDT TRC20
    const response = await fetch(`https://api.trongrid.io/v1/accounts/${address}/transactions/trc20?limit=50`, {
      headers: {
        'TRON-PRO-API-KEY': this.apiKeys.TRON_API
      }
    });
    
    const data = await response.json();
    
    return data.data.map((tx: any) => ({
      txHash: tx.transaction_id,
      network: 'TRC20',
      fromAddress: tx.from,
      toAddress: tx.to,
      amount: parseInt(tx.value) / 1e6, // USDT TRC20 имеет 6 десятичных знаков
      currency: 'USDT',
      userId,
      confirmations: tx.confirmed ? 1 : 0,
      status: tx.confirmed ? 'confirmed' : 'pending',
      timestamp: new Date(tx.block_timestamp)
    }));
  }

  private async checkSOLPayments(userId: string, address: string): Promise<PaymentTransaction[]> {
    // Solana RPC API
    const response = await fetch(this.apiKeys.SOLANA_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getSignaturesForAddress',
        params: [address, { limit: 50 }]
      })
    });
    
    const data = await response.json();
    
    return data.result.map((tx: any) => ({
      txHash: tx.signature,
      network: 'SOL',
      fromAddress: '', // Нужно дополнительно запросить детали транзакции
      toAddress: address,
      amount: 0, // Нужно дополнительно запросить детали
      currency: 'SOL',
      userId,
      confirmations: tx.confirmationStatus === 'finalized' ? 1 : 0,
      status: tx.confirmationStatus === 'finalized' ? 'confirmed' : 'pending',
      timestamp: new Date(tx.blockTime * 1000)
    }));
  }
}

export const paymentMonitor = new PaymentMonitor();
