/**
 * An enumeration of effects
 */
 export enum Effects {
  SET_COLOR = 'SET_COLOR',
  BLINK = 'BLINK',
  BREATHE = 'BREATHE',
  COLOR_CYCLE = 'COLOR_CYCLE',
  RIPPLE = 'RIPPLE',
  INWARD_RIPPLE = 'INWARD_RIPPLE',
  BOUNCING_LIGHT = 'BOUNCING_LIGHT',
  LASER = 'LASER',
  WAVE = 'WAVE'
}

export enum Actions {
  DRAW = 'DRAW',
  ERROR = 'ERROR',
  FLASH = 'FLASH'
}

export interface Link {
  url: string
  label: string
}

export interface IQPoint {
  color: string
  effect: Effects
}

export interface BaseSignalOpts {
  points: IQPoint[][]
  action?: Actions
  name?: string
  message?: string
  extensionId?: string
  origin?: Origin

}

export interface ErrorSignalOpts extends BaseSignalOpts {
  action?: Actions.ERROR
  errors: string[]
}

export interface FlashSignalOpts extends BaseSignalOpts {
  action?: Actions.FLASH
  isMuted?: boolean
}

export interface DrawSignalOpts extends BaseSignalOpts {
  action?: Actions.DRAW
  data?: any
  link?: Link
  isMuted?: boolean
}

export type SignalOpts = ErrorSignalOpts | DrawSignalOpts | FlashSignalOpts

export interface ActionValue {
  zoneId: string
  color: string
  effect: Effects
}

export interface Origin {
  x: number
  y: number
}

export interface AppletConfig {
  defaults?: {}
  user?: {}
}

export interface AuthorizationConfig {
  type: 'apiKey' | 'oauth2'
  hint?: string
  supportUrl?: string
}

export interface Authorization {
  apiKey?: string
  username?: string
  password?: string
}

export interface Geometry {
  width: number
  height: number
  origin?: Origin
  defaults?: {
    origin?: Origin
  }
}

export interface RootConfig extends Record<string, unknown> {
  extensionId?: string
  applet?: AppletConfig
  geometry?: Geometry
  authorization?: AuthorizationConfig
  storageLocation?: string
  devMode?: boolean
}

export interface Signal {
  id?: number
  points: IQPoint[][]
  origin: Origin
  action: Actions
  extensionId: string
  data?: any
  link?: Link
  errors?: string[]
  isMuted?: boolean
  message?: string
  name?: string
}

export interface OAuth2ProxyRequestOpts {
    apiKey: string
    uri: string
    qs?: string
    method?: string
    contentType?: string
    body?: any
}

export interface OptionResponse {
  /**
   * the unique key for the option
   */
  key: string
  /**
   * the value to be displayed in the option list
   */
  value: string
}