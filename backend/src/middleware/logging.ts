import type { Request, Response, NextFunction } from "express";

export function loggingMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  const timestamp = new Date().toISOString();
  console.log(`→ [${timestamp}] ${req.method} ${req.path}`);

  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(
      `← [${new Date().toISOString()}] ${req.method} ${req.path} :: ${res.statusCode.toString()} (${duration.toString()}ms)`,
    );
  });

  next();
}
