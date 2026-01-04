
import { GoogleGenAI, Type } from "@google/genai";
import { AppConfig, Metadata } from "../types";
import { SYSTEM_INSTRUCTION } from "../constants";

/**
 * Processes an image or video to create a lightweight representation for the AI.
 */
const processMediaForAI = async (file: File): Promise<{ data: string; mimeType: string }> => {
  return new Promise((resolve, reject) => {
    const isVideo = file.type.startsWith('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error("Could not create canvas context"));
      return;
    }

    const MAX_DIMENSION = 1200;

    if (isVideo) {
      const video = document.createElement('video');
      video.preload = 'auto';
      video.muted = true;
      video.playsInline = true;
      video.src = URL.createObjectURL(file);

      video.onloadedmetadata = () => {
        video.currentTime = Math.min(video.duration * 0.2, 5);
      };

      video.onseeked = async () => {
        await new Promise(r => setTimeout(r, 200));
        
        let width = video.videoWidth;
        let height = video.videoHeight;

        if (width === 0 || height === 0) {
            reject(new Error("Video dimensions are 0. Could not extract frame."));
            return;
        }

        if (width > height) {
          if (width > MAX_DIMENSION) {
            height *= MAX_DIMENSION / width;
            width = MAX_DIMENSION;
          }
        } else {
          if (height > MAX_DIMENSION) {
            width *= MAX_DIMENSION / height;
            height = MAX_DIMENSION;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(video, 0, 0, width, height);
        
        const base64Data = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
        URL.revokeObjectURL(video.src);
        resolve({ data: base64Data, mimeType: 'image/jpeg' });
      };

      video.onerror = () => {
        URL.revokeObjectURL(video.src);
        reject(new Error("Error loading video for frame extraction"));
      };
    } else {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_DIMENSION) {
            height *= MAX_DIMENSION / width;
            width = MAX_DIMENSION;
          }
        } else {
          if (height > MAX_DIMENSION) {
            width *= MAX_DIMENSION / height;
            height = MAX_DIMENSION;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        
        const base64Data = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
        URL.revokeObjectURL(img.src);
        resolve({ data: base64Data, mimeType: 'image/jpeg' });
      };

      img.onerror = () => {
        URL.revokeObjectURL(img.src);
        reject(new Error("Error loading image for resizing"));
      };
    }
  });
};

export const generateMetadata = async (
  file: File, 
  config: AppConfig
): Promise<Metadata> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const { data: base64Data, mimeType } = await processMediaForAI(file);
  
  const isVideo = file.type.startsWith('video');
  // Use gemini-3-flash-preview for better stability and lower latency
  const modelName = 'gemini-3-flash-preview';

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      title: {
        type: Type.STRING,
        description: `A descriptive, complete sentence title strictly under ${config.maxTitleLength} characters.`,
      },
      description: {
        type: Type.STRING,
        description: "A comprehensive description of the visual content.",
      },
      keywords: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: `A list of ${config.minKeywords} to ${config.maxKeywords} keywords, sorted by relevance.`,
      },
    },
    required: ["title", "description", "keywords"],
  };

  const prompt = `Generate microstock metadata for this ${isVideo ? 'video (frame provided)' : 'image'}.
  
  Constraints:
  1. Title must be descriptive but STRICTLY shorter than ${config.maxTitleLength} characters.
  2. Keywords must be between ${config.minKeywords} and ${config.maxKeywords}.
  3. English only.
  4. Ensure keywords are relevant for commercial stock libraries.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: {
        parts: [
          { inlineData: { mimeType: mimeType, data: base64Data } },
          { text: prompt }
        ]
      },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.4,
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    const parsed = JSON.parse(text);
    
    let title = parsed.title || "Untitled Content";
    if (title.length > config.maxTitleLength) {
      title = title.substring(0, config.maxTitleLength).trim();
    }

    let keywords = Array.isArray(parsed.keywords) ? parsed.keywords : [];
    if (keywords.length > config.maxKeywords) keywords = keywords.slice(0, config.maxKeywords);

    return {
      title: title,
      description: parsed.description || title,
      keywords: keywords
    };

  } catch (error) {
    console.error("Gemini Generation Error:", error);
    throw error;
  }
};
