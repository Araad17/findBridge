export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}
export const badRequest = (m, d) => new HttpError(400, m, d);
export const unauthorized = (m = 'ابتدا وارد حساب خود شوید.') => new HttpError(401, m);
export const forbidden = (m = 'دسترسی لازم را ندارید.') => new HttpError(403, m);
export const notFound = (m = 'مورد درخواستی پیدا نشد.') => new HttpError(404, m);
export const conflict = (m) => new HttpError(409, m);

export const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
