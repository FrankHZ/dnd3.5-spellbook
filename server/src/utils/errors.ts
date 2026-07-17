export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly details?: string | undefined;
  public readonly code?: string | undefined;

  constructor(
    statusCode: number,
    message: string,
    details?: string,
    code?: string,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.code = code;
  }
}
