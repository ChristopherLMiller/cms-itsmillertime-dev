declare module 'exif-parser' {
  export interface EXIFImage {
    width: number
    height: number
    orientation?: number
  }

  export interface EXIFTags {
    [key: string]: any
    Make?: string
    Model?: string
    XResolution?: number
    YResolution?: number
    ResolutionUnit?: number
    Software?: string
    ModifyDate?: Date | string | number
    Artist?: string
    Copyright?: string
    ExposureTime?: number
    FNumber?: number
    ISOSpeedRatings?: number
    ShutterSpeedValue?: number
    ApertureValue?: number
    BrightnessValue?: number
    ExposureBiasValue?: number
    MaxApertureValue?: number
    SubjectDistance?: number
    FocalLength?: number
    FocalLengthIn35mmFormat?: number
    GPSLatitude?: number[]
    GPSLongitude?: number[]
    GPSAltitude?: number
    GPSTimeStamp?: number[]
    GPSDateStamp?: string
  }

  export interface EXIFOutput {
    /** Information about the image */
    imageSize: EXIFImage
    /** All extracted EXIF tags */
    tags: EXIFTags
    /** EXIF thumbnail if available */
    thumbnail?: Buffer
    /** Description of the image */
    description?: string
    /** EXIF data in its raw form */
    exif?: any
    /** Any GPS information found */
    gps?: any
    /** IPTC data if available */
    iptc?: any
    /** ICC Profile if available */
    icc?: any
  }

  export interface EXIFParser {
    /** Parse the EXIF data and return structured information */
    parse(): EXIFOutput
    /** Extract the embedded thumbnail if present */
    extractThumbnail(): Buffer | null
    /** Enable/disable extraction of certain data types */
    enableBinaryFields(enable: boolean): EXIFParser
    /** Enable/disable image size extraction */
    enableImageSize(enable: boolean): EXIFParser
    /** Enable/disable GPS information extraction */
    enableGPS(enable: boolean): EXIFParser
    /** Enable/disable IPTC data extraction */
    enableIPTC(enable: boolean): EXIFParser
    /** Enable/disable ICC profile extraction */
    enableICC(enable: boolean): EXIFParser
  }

  /** Create a new EXIF parser from a buffer */
  export function create(buffer: Buffer): EXIFParser

  const exifParser: {
    create: typeof create
  }

  export default exifParser
}
