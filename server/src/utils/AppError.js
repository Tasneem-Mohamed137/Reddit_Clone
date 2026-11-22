export class AppError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }

  static badRequest(message, code = 'BAD_REQUEST') { return new AppError(400, code, message); }
  static unauthorized(message = 'Authentication required') { return new AppError(401, 'UNAUTHORIZED', message); }
  static forbidden(message = 'You are not allowed to do this') { return new AppError(403, 'FORBIDDEN', message); }
  static notFound(message = 'Resource not found') { return new AppError(404, 'NOT_FOUND', message); }
  static conflict(message) { return new AppError(409, 'CONFLICT', message); }
}