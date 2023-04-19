export type keys = string | number | symbol

export type Holders<I = any> = I[] | Map<keys, I>

export type ANSIString<T extends string | number | bigint = string> = `\x1b[${T}m`

export type TableCell = [Content: string, Index: number]