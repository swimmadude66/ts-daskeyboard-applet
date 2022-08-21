import {LocalStorage } from 'node-localstorage'

const numberFlag = '~#~'
const jsonFlag = '~{~'
const nullFlag = '~N~'

export class Storage extends LocalStorage {

  constructor(path: string, quota?: number) {
    super(path, quota ?? 50 * 1024 * 1024)
  }

  /**
   * Stores a primitive or object
   * @param {*} key 
   */
  put(key: string, value: unknown) {
    if (typeof key !== 'string') {
      throw new Error('key must be a string')
    }

    if (null === value) {
      return this.setItem(key, nullFlag)
    } else {
      if (value instanceof Object) {
        return this.setItem(key, jsonFlag + JSON.stringify(value))
      } else if (typeof value === 'string') {
        return this.setItem(key, value)
      } else {
        return this.setItem(key, numberFlag + value)
      }
    }
  }

  get(key: string): unknown {
    if (typeof key !== 'string') {
      throw new Error('key must be a string')
    }

    const raw = this.getItem(key)
    if (nullFlag === raw) {
      return null
    } else {
      if (typeof raw === 'string' && raw.startsWith(jsonFlag)) {
        try {
          return JSON.parse(raw.substring(jsonFlag.length))
        } catch (error) {
          return raw
        }
      } else if (typeof raw === 'string' && raw.startsWith(numberFlag)) {
        return +(raw.substring(numberFlag.length))
      } else {
        return raw
      }
    }
  }
}