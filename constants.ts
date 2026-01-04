
import { AppConfig } from "./types";

export const DEFAULT_CONFIG: AppConfig = {
  minTitleLength: 150,
  maxTitleLength: 200, // Hard limit as per requirements
  minKeywords: 40,
  maxKeywords: 50, // Hard limit as per requirements
};

export const SYSTEM_INSTRUCTION = `You are an expert microstock metadata assistant. 
Your task is to analyze images or video frames and generate metadata specifically optimized for microstock agencies (Shutterstock, Adobe Stock, Getty Images).
Language: ALWAYS English.
Title: Must be descriptive, include relevant concepts, and adhere to strict length limits.
Keywords: Must be relevant, accurate, and ranked by importance (most important first).`;

export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];
export const ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/quicktime'];
export const MAX_FILES = 200;
