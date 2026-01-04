
import { Type } from "@google/genai";

export enum FileStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

export interface Metadata {
  title: string;
  description: string;
  keywords: string[];
}

export interface ProcessedFile {
  id: string;
  file: File;
  previewUrl: string;
  status: FileStatus;
  metadata?: Metadata;
  error?: string;
  // This blob contains the modified file with embedded metadata (both Images and Videos).
  processedBlob?: Blob; 
}

export interface AppConfig {
  minTitleLength: number;
  maxTitleLength: number;
  minKeywords: number;
  maxKeywords: number;
}

// Declaration for the external library loaded via CDN
declare global {
  var piexif: any;
  var JSZip: any;
}
