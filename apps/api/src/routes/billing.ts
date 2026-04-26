import { Router, Request, Response } from 'express';
import { supabase } from '../utils/supabase';
import { logger } from '../utils/logger';

const router = Router();

// POST /billing/webhook — RevenueCat webhook (no JWT auth, uses HMAC signature)
router.post('/webhook', async (req: Request, res: Response) => {
  const signature = req.headers['x-revenuecat-signature'];

  if (!signature || signature !== process.env.REVENUECAT_WEBHOOK_SECRET) {
    res.status(401).json({ error: 'Invalid webhook signature' });
    return;
  }

  const event = req.body;
  const eventId = event?.event?.id;

  if (!eventId) {
    res.status(400).json({ error: 'Missing event ID' });
    return;
  }

  try {
    const { app_user_id: userId, product_id, expiration_at_ms, type } = event.event;

    const tier = inferTierFromProduct(product_id);
    const validUntil = expiration_at_ms
      ? new Date(expiration_at_ms).toISOString()
      : null;

    // Idempotent upsert — safe to replay
    await supabase
      .from('user_subscriptions')
      .upsert({
        user_id: userId,
        tier,
        valid_until: validUntil,
        cancelled_at: type === 'CANCELLATION' ? new Date().toISOString() : null,
        revenuecat_customer_id: userId,
        revenuecat_event_id: eventId,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    logger.info('Billing webhook processed', { eventId, userId, tier, type });
    res.json({ received: true });
  } catch (err) {
    logger.error('Billing webhook error', { error: err });
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

function inferTierFromProduct(productId: string): 'free' | 'pro' | 'premium' {
  if (/(?:^|[_-])premium(?:[_-]|$)/i.test(productId)) return 'premium';
  if (/(?:^|[_-])pro(?:[_-]|$)/i.test(productId)) return 'pro';
  return 'free';
}

export default router;
