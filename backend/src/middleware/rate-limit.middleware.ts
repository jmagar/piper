import type { Request, Response, NextFunction } from 'express';
import { checkRateLimit } from '../services/redis/redis.service.js';
import { broadcastLog } from '../utils/logger.js';

interface RateLimitConfig {
    limit: number;
    windowSeconds: number;
    keyPrefix: string;
}

export function createRateLimitMiddleware(config: RateLimitConfig) {
    return async function rateLimitMiddleware(
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        try {
            const userId = req.body.userId || 'anonymous';
            const key = `${config.keyPrefix}:${userId}`;

            const isWithinLimit = await checkRateLimit(
                key,
                config.limit,
                config.windowSeconds
            );

            if (!isWithinLimit) {
                broadcastLog('error', `Rate limit exceeded for user ${userId}`);
                res.status(429).json({
                    error: 'Too many requests. Please wait before trying again.',
                    retryAfter: config.windowSeconds
                });
                return;
            }

            next();
        } catch (error) {
            broadcastLog('error', `Rate limit middleware error: ${error}`);
            next(error);
        }
    };
} 