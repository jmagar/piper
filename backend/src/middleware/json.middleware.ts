import type { Request, Response, NextFunction } from 'express';

export function jsonMiddleware(_req: Request, res: Response, next: NextFunction) {
  const originalJson = res.json;
  res.json = function(body: any) {
    if (body !== null && typeof body === 'object') {
      return originalJson.call(this, JSON.parse(JSON.stringify(body)));
    }
    return originalJson.call(this, body);
  };
  next();
}