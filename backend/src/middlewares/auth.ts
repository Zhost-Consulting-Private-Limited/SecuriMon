import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    tenantId: string;
    role: string;
  };
}

const JWT_SECRET = process.env.JWT_SECRET || 'vigilon-super-secret-key-change-in-prod';

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = {
      id: decoded.id,
      tenantId: decoded.tenantId,
      role: decoded.role,
    };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

export const requireTenant = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user?.tenantId) {
    return res.status(403).json({ error: 'Forbidden: Tenant context required' });
  }
  next();
};

export const requireMspAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'msp_admin' && req.user?.role !== 'owner') {
    return res.status(403).json({ error: 'Forbidden: MSP Admin privileges required' });
  }
  next();
};
