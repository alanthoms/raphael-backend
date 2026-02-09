import { ne } from "drizzle-orm";
import type { Request, Response, NextFunction } from "express";
import aj from "../config/arcjet";
import { ArcjetNodeRequest, slidingWindow } from "@arcjet/node";
const securityMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (process.env.NODE_ENV === "test") return next(); // Skip security checks in test environment

  try {
    const role: RateLimitRole = req.user?.role ?? "guest"; // Default to lowest role if not authenticated

    let limit: number;
    let message: string;
    switch (role) {
      case "admin":
        limit = 50; // Very high limit for admins
        message = "Admin rate limit exceeded. 50 per minute";
        break;
      case "commander":
      case "operator":
        limit = 35; // Moderate limit for commanders and operators
        message = "Commander rate limit exceeded. 35 per minute";
        break;
      default:
        limit = 25; // Strict limit for guests
        message = "Guest rate limit exceeded. 25 per minute";
        break;
    }

    const client = aj.withRule(
      slidingWindow({
        mode: "LIVE",
        interval: "1m",
        max: limit,
      }),
    );

    const arcjetRequest: ArcjetNodeRequest = {
      headers: req.headers,
      method: req.method,
      url: req.originalUrl ?? req.url,
      socket: {
        remoteAddress: req.socket.remoteAddress ?? req.ip ?? "0.0.0.0",
      },
    };
    // Perform the Arcjet check and get the decision
    const decision = await client.protect(arcjetRequest);

    if (decision.isDenied() && decision.reason.isBot()) {
      return res.status(403).json({
        error: "Forbidden",
        message: "Bot traffic is not allowed",
      });
    }

    if (decision.isDenied() && decision.reason.isShield()) {
      return res.status(403).json({
        error: "Forbidden",
        message: "Blocked by security rules",
      });
    }

    if (decision.isDenied() && decision.reason.isRateLimit()) {
      return res.status(429).json({
        error: "Too Many Requests",
        message,
      });
    }

    next();
  } catch (error) {
    console.error("Security middleware error:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Security middleware failed",
    });
  }
};

export default securityMiddleware;
