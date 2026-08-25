import { Hono } from 'hono';
import { walletRepository } from '../db/repositories/walletRepository';
import { savingsRepository } from '../db/repositories/savingsRepository';
import { WalletType } from '../types';

export const walletsRouter = new Hono();

walletsRouter.get('/', (c) => {
  const list = walletRepository.getAllWallets();
  const enhanced = list.map(w => {
    const virtualLocked = savingsRepository.getTotalVirtualLockedForWallet(w.id);
    const spendableBalance = Math.max(0, w.balance - virtualLocked);
    return {
      ...w,
      virtualLocked,
      spendableBalance,
    };
  });
  return c.json(enhanced);
});

walletsRouter.get('/:id', (c) => {
  const id = c.req.param('id');
  const wallet = walletRepository.getWalletById(id);
  if (!wallet) return c.json({ error: 'Wallet not found' }, 404);

  const virtualLocked = savingsRepository.getTotalVirtualLockedForWallet(wallet.id);
  const spendableBalance = Math.max(0, wallet.balance - virtualLocked);

  return c.json({
    ...wallet,
    virtualLocked,
    spendableBalance,
  });
});

walletsRouter.post('/', async (c) => {
  const body = await c.req.json();
  if (!body.name) {
    return c.json({ error: 'name is required' }, 400);
  }

  const created = walletRepository.createWallet({
    id: body.id,
    name: body.name,
    type: (body.type || 'CUSTOM') as WalletType,
    accountNumber: body.accountNumber,
    balance: body.balance !== undefined ? Number(body.balance) : 0,
    isSpendable: body.isSpendable !== undefined ? Boolean(body.isSpendable) : true,
  });

  return c.json(created, 201);
});

walletsRouter.post('/batch-init', async (c) => {
  const body = await c.req.json<{ wallets: Array<{ id?: string; name: string; type?: WalletType; accountNumber?: string; balance: number; isSpendable: boolean }> }>();
  if (!Array.isArray(body.wallets)) {
    return c.json({ error: 'wallets array required' }, 400);
  }

  const list = walletRepository.batchInitWallets(body.wallets);
  return c.json(list);
});

walletsRouter.post('/:id/adjust', async (c) => {
  const id = c.req.param('id');
  const { newBalance } = await c.req.json<{ newBalance: number }>();
  if (typeof newBalance !== 'number') {
    return c.json({ error: 'Invalid newBalance' }, 400);
  }

  walletRepository.updateBalance(id, newBalance);
  const updated = walletRepository.getWalletById(id);
  return c.json(updated);
});

walletsRouter.delete('/:id', (c) => {
  const id = c.req.param('id');
  const success = walletRepository.deleteWallet(id);
  if (!success) {
    return c.json({ error: 'Cannot delete wallet or wallet not found' }, 400);
  }
  return c.json({ success: true, deletedId: id });
});
