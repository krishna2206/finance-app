import { Hono } from 'hono';
import { walletRepository } from '../db/repositories/walletRepository';
import { WalletSource } from '../types';

export const walletsRouter = new Hono();

walletsRouter.get('/', (c) => {
  const wallets = walletRepository.getAllWallets();
  return c.json(wallets);
});

walletsRouter.get('/:id', (c) => {
  const id = c.req.param('id') as WalletSource;
  const wallet = walletRepository.getWalletById(id);
  if (!wallet) return c.json({ error: 'Wallet not found' }, 404);
  return c.json(wallet);
});

walletsRouter.post('/:id/adjust', async (c) => {
  const id = c.req.param('id') as WalletSource;
  const { newBalance } = await c.req.json<{ newBalance: number }>();
  if (typeof newBalance !== 'number') {
    return c.json({ error: 'Invalid newBalance' }, 400);
  }

  walletRepository.updateBalance(id, newBalance);
  const updated = walletRepository.getWalletById(id);
  return c.json(updated);
});
