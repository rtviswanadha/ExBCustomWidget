import * as Point from "esri/geometry/Point";
import * as Graphic from "esri/Graphic";
import { ImmutableObject } from "seamless-immutable";

export enum locateType{
  address = 'address',
  coordinate = 'coordinate',
  reverse = 'reverse'
}

export interface listItem {
  id: string,
  title: string,
  content: string,
  type: locateType,
  graphic?: Graphic,
  point?: Point,
  selected?: boolean
}

export interface Config {
  autoClosePopup?: number,
  keepinspectoractive: boolean,
  initialView: locateType,
  zoomscale: number,
  forcescale: boolean,
  coordinateWKID: number,
  coordinatePrecision?: number,
  limitsearchtoviewextentbydefault: boolean,
  minscore?: number,
  locator: {
    url: string,
    singleLineFieldName: string,
    countryCode: string
  }
  pointunits: pointunit[],
  disabledtabs?:string[]
}

// eslint-disable-next-line  @typescript-eslint/naming-convention
export interface pointunit {
  wgs84option?: string,
  wkid: number,
  ylabel: string,
  xlabel: string,
  example: string,
  name: string,
  tfwkid?: number,
  transformDirection?: string
}

export type IMConfig = ImmutableObject<Config>;