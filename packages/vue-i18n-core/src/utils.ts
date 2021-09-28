/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  isArray,
  isObject,
  hasOwn,
  isPlainObject,
  isString
} from '@intlify/shared'
import { I18nErrorCodes, createI18nError } from './errors'

import type { Locale, MessageResolver } from '@intlify/core-base'
import type { CustomBlocks, VueMessageType } from './composer'
import type { ComponentInternalInstance } from 'vue'

type GetLocaleMessagesOptions<Messages = {}> = {
  messages?: { [K in keyof Messages]: Messages[K] }
  __i18n?: CustomBlocks<VueMessageType>
  messageResolver?: MessageResolver
  flatJson?: boolean
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function isLegacyVueI18n(VueI18n: any): boolean {
  if (VueI18n == null || VueI18n.version == null) {
    return false
  }
  return (Number(VueI18n.version.split('.')[0]) || -1) >= 8
}

/**
 * Transform flat json in obj to normal json in obj
 */
export function handleFlatJson(obj: unknown): unknown {
  // check obj
  if (!isObject(obj)) {
    return obj
  }

  for (const key in obj as object) {
    // check key
    if (!hasOwn(obj, key)) {
      continue
    }

    // handle for normal json
    if (!key.includes('.')) {
      // recursive process value if value is also a object
      if (isObject(obj[key])) {
        handleFlatJson(obj[key])
      }
    }
    // handle for flat json, transform to normal json
    else {
      // go to the last object
      const subKeys = key.split('.')
      const lastIndex = subKeys.length - 1
      let currentObj = obj
      for (let i = 0; i < lastIndex; i++) {
        if (!(subKeys[i] in currentObj)) {
          currentObj[subKeys[i]] = {}
        }
        currentObj = currentObj[subKeys[i]]
      }
      // update last object value, delete old property
      currentObj[subKeys[lastIndex]] = obj[key]
      delete obj[key]
      // recursive process value if value is also a object
      if (isObject(currentObj[subKeys[lastIndex]])) {
        handleFlatJson(currentObj[subKeys[lastIndex]])
      }
    }
  }

  return obj
}

export function getLocaleMessages<Messages = {}>(
  locale: Locale,
  options: GetLocaleMessagesOptions<Messages>
): { [K in keyof Messages]: Messages[K] } {
  const { messages, __i18n, messageResolver, flatJson } = options

  // prettier-ignore
  const ret = isPlainObject(messages)
    ? messages
    : isArray(__i18n)
      ? {}
      : { [locale]: {} }

  // merge locale messages of i18n custom block
  if (isArray(__i18n)) {
    __i18n.forEach(custom => {
      if ('locale' in custom && 'resource' in custom) {
        const { locale, resource } = custom
        if (locale) {
          ret[locale] = ret[locale] || {}
          deepCopy(resource, ret[locale])
        } else {
          deepCopy(resource, ret)
        }
      } else {
        isString(custom) && deepCopy(JSON.parse(custom), ret)
      }
    })
  }

  // handle messages for flat json
  if (messageResolver == null && flatJson) {
    for (const key in ret) {
      if (hasOwn(ret, key)) {
        handleFlatJson(ret[key])
      }
    }
  }

  return ret as { [K in keyof Messages]: Messages[K] }
}

const isNotObjectOrIsArray = (val: unknown) => !isObject(val) || isArray(val)
// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types
export function deepCopy(src: any, des: any): void {
  // src and des should both be objects, and non of then can be a array
  if (isNotObjectOrIsArray(src) || isNotObjectOrIsArray(des)) {
    throw createI18nError(I18nErrorCodes.INVALID_VALUE)
  }

  for (const key in src) {
    if (hasOwn(src, key)) {
      if (isNotObjectOrIsArray(src[key]) || isNotObjectOrIsArray(des[key])) {
        // replace with src[key] when:
        // src[key] or des[key] is not a object, or
        // src[key] or des[key] is a array
        des[key] = src[key]
      } else {
        // src[key] and des[key] are both object, merge them
        deepCopy(src[key], des[key])
      }
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getComponentOptions(instance: ComponentInternalInstance): any {
  return !__BRIDGE__ ? instance.type : instance.proxy!.$options
}

/* eslint-enable @typescript-eslint/no-explicit-any */