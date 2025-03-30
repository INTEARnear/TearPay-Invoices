'use client';

import { useState, useEffect } from 'react';

type AccountStatus = 'loading' | 'valid' | 'invalid' | 'empty' | 'hex';

export default function Home() {
  const [formData, setFormData] = useState({
    recipientAccount: '',
    amount: '',
  });
  const [generatedUrl, setGeneratedUrl] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [accountStatus, setAccountStatus] = useState<AccountStatus>('loading');

  const generateRandomId = async () => {
    const array = new Uint8Array(12);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '')
      .slice(0, 16);
  };

  const checkAccount = async (accountId: string) => {
    if (!accountId) {
      setAccountStatus('loading');
      return;
    }

    // Check if the account ID matches the hex pattern or EVM address pattern
    if (/^[a-f0-9]{64}$/.test(accountId) || /^0x[a-f0-9]{40}$/.test(accountId)) {
      setAccountStatus('empty');
      return;
    }

    try {
      const response = await fetch('https://rpc.mainnet.near.org', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'dontcare',
          method: 'query',
          params: {
            request_type: 'view_account',
            finality: 'final',
            account_id: accountId,
          },
        }),
      });

      const data = await response.json();
      
      if (data.error) {
        setAccountStatus('invalid');
        return;
      }

      const balance = data.result.amount;
      setAccountStatus(parseInt(balance) === 0 ? 'empty' : 'valid');
    } catch {
      setAccountStatus('invalid');
    }
  };

  useEffect(() => {
    const debounceTimeout = setTimeout(() => {
      checkAccount(formData.recipientAccount);
    }, 500);

    return () => clearTimeout(debounceTimeout);
  }, [formData.recipientAccount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const invoiceId = `inv-${await generateRandomId()}`;
    const url = `https://tearpay-demo.intear.tech/?amountUsd=${Number(formData.amount).toFixed(2)}&invoiceId=${invoiceId}&recipientAddress=${formData.recipientAccount}`;
    
    setGeneratedUrl(url);
    
    try {
      await navigator.clipboard.writeText(url);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
    
    setFormData({
      recipientAccount: '',
      amount: '',
    });
  };

  const getInputBorderColor = () => {
    switch (accountStatus) {
      case 'valid':
        return 'border-green-500 focus:border-green-500';
      case 'invalid':
        return 'border-red-500 focus:border-red-500';
      case 'empty':
        return 'border-yellow-500 focus:border-yellow-500';
      default:
        return 'border-gray-700 focus:border-blue-500';
    }
  };

  const getStatusMessage = () => {
    switch (accountStatus) {
      case 'invalid':
        return 'Account does not exist';
      case 'empty':
        return 'Account has 0 NEAR';
      default:
        return '';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-slate-900 text-gray-100">
      <main className="container mx-auto px-4 py-16 max-w-md">
        <div className="mb-12 space-y-2">
          <h1 className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-500 mb-6">
            TearPay Invoices
          </h1>
          <p className="text-lg text-blue-200">
            Accept any cryptocurrency, receive USDC
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 bg-gray-800/60 backdrop-blur-sm p-8 rounded-xl shadow-2xl border border-gray-700/50">
          <div>
            <label htmlFor="recipientAccount" className="block text-sm font-medium text-blue-200 mb-2">
              Recipient Account
            </label>
            <div className="relative">
              <input
                type="text"
                id="recipientAccount"
                placeholder="example.near"
                value={formData.recipientAccount}
                onChange={(e) => setFormData({ ...formData, recipientAccount: e.target.value })}
                className={`w-full px-4 py-3 bg-gray-900/70 border rounded-lg focus:ring-2 focus:ring-opacity-50 text-white placeholder-gray-500 ${getInputBorderColor()}`}
                required
              />
            </div>
            {accountStatus !== 'loading' && accountStatus !== 'valid' && (
              <p className={`mt-2 text-sm ${
                accountStatus === 'invalid' ? 'text-red-400' :
                'text-yellow-400'
              }`}>
                {getStatusMessage()}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-blue-200 mb-2">
              Amount (USDC)
            </label>
            <div className="relative">
              <input
                type="number"
                id="amount"
                placeholder="10.00"
                step="0.01"
                min="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full px-4 py-3 bg-gray-900/70 border border-gray-700 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-white placeholder-gray-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={accountStatus === 'invalid' || accountStatus === 'loading'}
            className={`w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg transition-all duration-200 font-medium ${
              accountStatus === 'invalid' || accountStatus === 'loading'
                ? 'opacity-50 cursor-not-allowed'
                : ''
            }`}
          >
            {generatedUrl ? 'Generate Another Invoice' : 'Generate Invoice Link'}
          </button>
        </form>

        {/* Toast Notification for Copy */}
        <div className={`fixed bottom-4 right-4 bg-blue-900/90 backdrop-blur-sm text-white px-6 py-3 rounded-lg shadow-lg transform transition-all duration-300 ${showToast ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}>
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>Invoice link copied successfully!</span>
          </div>
        </div>
      </main>
    </div>
  );
}
