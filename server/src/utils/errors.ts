export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly details?: string | undefined;

  constructor(statusCode: number, message: string, details?: string) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}
