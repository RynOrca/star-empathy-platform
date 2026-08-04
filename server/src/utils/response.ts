function snakeToCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
}

function convertKeys(obj: any): any {
  if (obj === null || obj === undefined) return obj
  if (Array.isArray(obj)) return obj.map(convertKeys)
  if (typeof obj !== 'object') return obj
  const result: any = {}
  for (const [k, v] of Object.entries(obj)) {
    result[snakeToCamel(k)] = convertKeys(v)
  }
  return result
}

export function send(
  res: any,
  status: number,
  message: string,
  data: any = null,
): void {
  res.status(status).json({
    code: status,
    message,
    data: convertKeys(data),
  })
}

export const ok = (res: any, message: string, data: any = null) => send(res, 200, message, data)
export const created = (res: any, message: string, data: any = null) => send(res, 201, message, data)
export const badRequest = (res: any, message: string) => send(res, 400, message)
export const unauthorized = (res: any, message: string) => send(res, 401, message)
export const forbidden = (res: any, message: string) => send(res, 403, message)
export const notFound = (res: any, message: string) => send(res, 404, message)
export const serverError = (res: any, message: string = '服务器内部错误') => send(res, 500, message)
