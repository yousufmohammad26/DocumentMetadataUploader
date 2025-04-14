declare namespace Express {
  export interface Request {
    file?: Multer.File;
    files?: { [fieldname: string]: Multer.File[] } | Multer.File[];
  }
}

declare module 'multer' {
  export interface FileRequest extends Express.Request {
    file: Express.Multer.File;
  }
}