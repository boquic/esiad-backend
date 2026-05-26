import { prisma } from '../config/database';

const ONE_HOUR_IN_MS = 60 * 60 * 1000;

export async function expireBudgets(): Promise<number> {
  const result = await prisma.order.updateMany({
    where: {
      status: {
        in: ['BUDGETED', 'CLIENT_REVIEW_PENDING'],
      },
      budget_expires_at: {
        lt: new Date(),
      },
    },
    data: {
      status: 'EXPIRED',
    },
  });

  return result.count;
}

export function startExpireBudgetsJob(): void {
  void expireBudgets().catch((error: unknown) => {
    console.error('Error expiring budgets on startup:', error);
  });

  setInterval(() => {
    void expireBudgets().catch((error: unknown) => {
      console.error('Error expiring budgets:', error);
    });
  }, ONE_HOUR_IN_MS);
}
