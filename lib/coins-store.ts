import { readFile, writeFile } from 'fs/promises';
import { randomUUID } from 'crypto';
import { join } from 'path';

const COINS_FILE = join(process.cwd(), 'data', 'user-coins.json');

export interface CoinTransaction {
  id: string;
  type: 'earn' | 'spend';
  amount: number;
  description: string;
  date: string;
  orderId?: string;
}

interface UserCoins {
  balance: number;
  transactions: CoinTransaction[];
}

type CoinsStore = Record<string, UserCoins>;

async function readStore(): Promise<CoinsStore> {
  try {
    const raw = await readFile(COINS_FILE, 'utf-8');
    return JSON.parse(raw) as CoinsStore;
  } catch {
    return {};
  }
}

async function writeStore(store: CoinsStore): Promise<void> {
  await writeFile(COINS_FILE, JSON.stringify(store, null, 2), 'utf-8');
}

export async function getUserCoins(phone: string): Promise<UserCoins> {
  const store = await readStore();
  const user = store[phone];
  if (!user) {
    return { balance: 0, transactions: [] };
  }
  return user;
}

export async function earnCoins(
  phone: string,
  amount: number,
  description: string,
  orderId?: string
): Promise<void> {
  const store = await readStore();
  if (!store[phone]) {
    store[phone] = { balance: 0, transactions: [] };
  }
  store[phone].balance += amount;
  store[phone].transactions.push({
    id: randomUUID(),
    type: 'earn',
    amount,
    description,
    date: new Date().toISOString(),
    orderId,
  });
  await writeStore(store);
}

export async function spendCoins(
  phone: string,
  amount: number,
  description: string
): Promise<void> {
  const store = await readStore();
  if (!store[phone]) {
    store[phone] = { balance: 0, transactions: [] };
  }
  store[phone].balance = Math.max(0, store[phone].balance - amount);
  store[phone].transactions.push({
    id: randomUUID(),
    type: 'spend',
    amount,
    description,
    date: new Date().toISOString(),
  });
  await writeStore(store);
}
