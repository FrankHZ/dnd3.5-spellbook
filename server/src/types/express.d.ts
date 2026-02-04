import "express";

declare global {
  namespace Express {
    interface Request {
      i18n?: {
        lang: string; // "en" | "zh" | ...
        variant?: string | undefined; // "chm" | "ai" | ...
      };
    }
  }
}
