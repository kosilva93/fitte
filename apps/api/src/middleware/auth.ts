import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';

// Augment Express Request to carry the authenticated user's ID
declare global {
  namespace Express {
    interface Request {
      userId: string;
      userTier: 'free' | 'pro' | 'premium';
    }
  }
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    res.status(401).json({ error: 'Missing authorization token' });
    return;
  }

  // Create a user-scoped client to validate the JWT
  const userClient = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: { user }, error } = await userClient.auth.getUser(token);

  if (error || !user) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  req.userId = user.id;

  // Fetch subscription tier — used by feature gate middleware downstream
  const { data: sub } = await userClient
    .from('user_subscriptions')
    .select('tier, valid_until')
    .eq('user_id', user.id)
    .single();

  const now = new Date();
  const isActive = sub?.valid_until ? new Date(sub.valid_until) > now : true;
  req.userTier = (sub?.tier && isActive) ? sub.tier : 'free';

  next();
}
