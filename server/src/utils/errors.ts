export class ApiError extends Error {
  public statusCode: number;
  public code: string;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export const BadRequestError = (message: string, code = 'BAD_REQUEST') =>
  new ApiError(400, code, message);

export const UnauthorizedError = (message = 'Authentication required', code = 'UNAUTHORIZED') =>
  new ApiError(401, code, message);

export const ForbiddenError = (message = "You don't have permission to perform this action.", code = 'FORBIDDEN') =>
  new ApiError(403, code, message);

export const NotFoundError = (message = 'Resource not found', code = 'NOT_FOUND') =>
  new ApiError(404, code, message);

export const ConflictError = (message: string, code = 'CONFLICT') =>
  new ApiError(409, code, message);

export const UnprocessableEntityError = (message: string, code = 'UNPROCESSABLE_ENTITY') =>
  new ApiError(422, code, message);

export const TooManyRequestsError = (message = 'Too many requests. Please try again later.', code = 'TOO_MANY_REQUESTS') =>
  new ApiError(429, code, message);
