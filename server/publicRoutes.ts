import { Request, Response, NextFunction } from "express";

type Sess = { userId?: string; role?: string; isAuthenticated?: boolean };

// Middleware that allows public access but captures auth for "optional auth" routes (e.g. catch list, map)
export const allowPublicAccess = (req: Request, res: Response, next: NextFunction) => {
  const sess = req.session as Sess | undefined;

  if (sess?.isAuthenticated && sess.userId) {
    req.headers["user-id"] = sess.userId;
    if (typeof sess.role === "string") {
      req.headers["x-auth-user-role"] = sess.role;
    }
  } else if (req.headers["x-auth-user-id"]) {
    req.headers["user-id"] = req.headers["x-auth-user-id"] as string;
  } else if (req.body && (req.body as { userId?: string }).userId) {
    req.headers["user-id"] = (req.body as { userId: string }).userId;
  } else if (req.headers["x-test-user-id"]) {
    req.headers["user-id"] = req.headers["x-test-user-id"] as string;
  }
  // else: anonymous (expected for public map/feed) — no user-id

  next();
};