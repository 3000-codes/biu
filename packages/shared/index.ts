

export const objectToString = Object.prototype.toString
export const toTypeString = (value: unknown): string =>
    objectToString.call(value)

export const toRawType = (value: unknown): string => {
    // extract "RawType" from strings like "[object RawType]"
    return toTypeString(value).slice(8, -1)
}

export const isObject = (value: unknown): value is Record<any, any> => value !== null && typeof value === 'object'
export const isMap = (value: unknown): value is Map<any, any> => toRawType(value) === 'Map'
export const isArray = (value: unknown): value is Array<any> => Array.isArray(value)
export const isSymbol = (value: unknown): value is symbol => typeof value === 'symbol'
export const isString = (value: unknown): value is string => typeof value === 'string'
export const isIntegerKey = (key: unknown) => isString(key) // 判断是否是字符串
    && key !== 'NaN' // 不是NaN
    && key[0] !== '-' // 不是负数
    && '' + parseInt(key, 10) === key // 转换为10进制的字符串和原字符串相等

const hasOwnProperty = Object.prototype.hasOwnProperty
export const hasOwn = (
    val: object,
    key: string | symbol,
): key is keyof typeof val => hasOwnProperty.call(val, key)



export function makeMap(
    str: string,
    expectsLowerCase?: boolean
): (key: string) => boolean {
    const set = new Set(str.split(','))
    return expectsLowerCase
        ? (val) => set.has(val.toLowerCase())
        : (val) => set.has(val)
}

export const extend = Object.assign
export const NOOP = (...args: unknown[]) => { }
export const hasChanged = (value: any, oldValue: any): boolean =>
    !Object.is(value, oldValue)