
import { Metadata } from "../types";

/**
 * Routes metadata embedding based on file type.
 */
export const embedMetadata = async (file: File, metadata: Metadata): Promise<Blob> => {
    if (file.type === 'image/png') {
        return embedMetadataPng(file, metadata);
    } else if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
        return embedMetadataJpeg(file, metadata);
    } else if (file.type === 'video/mp4' || file.type === 'video/quicktime') {
        return embedMetadataVideo(file, metadata);
    }
    throw new Error(`Unsupported file type for embedding: ${file.type}`);
};

/**
 * Embeds metadata in MP4/MOV videos using an offset-safe strategy.
 * Injects an XMP packet into the moov box inside a uuid box.
 */
export const embedMetadataVideo = async (file: File, metadata: Metadata): Promise<Blob> => {
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  
  // 1. Prepare XMP Payload strictly focusing on dc:subject for keywords as an array
  const xmpPacket = createXmpPacket(metadata);
  const xmpBytes = stringToUtf8ByteArray(xmpPacket);
  
  // Standard XMP UUID: BE7ACADA-0754-11D9-8514-000595420030
  const XMP_UUID = new Uint8Array([
    0xBE, 0x7A, 0xCA, 0xDA, 0x07, 0x54, 0x11, 0xD9,
    0x85, 0x14, 0x00, 0x05, 0x95, 0x42, 0x00, 0x30
  ]);

  // A uuid box is: [Size (4)] [Type 'uuid' (4)] [UUID (16)] [Data (variable)]
  const uuidBoxSize = 8 + 16 + xmpBytes.length;
  const uuidBox = new Uint8Array(uuidBoxSize);
  writeBoxHeader(uuidBox, 0, uuidBoxSize, 'uuid');
  uuidBox.set(XMP_UUID, 8);
  uuidBox.set(xmpBytes, 24);

  // 2. Prepare UDTA/ILST Atoms (Apple/QuickTime legacy support for title/desc)
  const udtaPayload = createUdtaAtoms(metadata);
  const udtaBoxSize = 8 + udtaPayload.length;
  const udtaBox = new Uint8Array(udtaBoxSize);
  writeBoxHeader(udtaBox, 0, udtaBoxSize, 'udta');
  udtaBox.set(udtaPayload, 8);

  // 3. Locate the original 'moov' box
  let moovOffset = -1;
  let moovSize = -1;
  let pos = 0;
  while (pos < bytes.length - 8) {
    const size = (bytes[pos] << 24) | (bytes[pos + 1] << 16) | (bytes[pos + 2] << 8) | bytes[pos + 3];
    const type = String.fromCharCode(bytes[pos + 4], bytes[pos + 5], bytes[pos + 6], bytes[pos + 7]);
    
    if (type === 'moov') {
      moovOffset = pos;
      moovSize = size;
      break;
    }
    if (size <= 0 || pos + size > bytes.length) break;
    pos += size;
  }

  if (moovOffset === -1) throw new Error("Could not locate moov box in video.");

  // 4. Create new 'moov' box with injected metadata
  const newMoovSize = moovSize + uuidBoxSize + udtaBoxSize;
  const newMoov = new Uint8Array(newMoovSize);
  writeBoxHeader(newMoov, 0, newMoovSize, 'moov');
  
  // Copy original moov children
  newMoov.set(bytes.slice(moovOffset + 8, moovOffset + moovSize), 8);
  
  // Append metadata boxes as siblings of existing boxes inside moov
  newMoov.set(uuidBox, moovSize);
  newMoov.set(udtaBox, moovSize + uuidBoxSize);

  // 5. Build final file
  // Replacing original moov with 'free' box of the same size ensures media offsets remain valid
  const freeBox = new Uint8Array(moovSize);
  writeBoxHeader(freeBox, 0, moovSize, 'free');
  
  const result = new Uint8Array(bytes.length + newMoovSize);
  result.set(bytes.slice(0, moovOffset), 0);
  result.set(freeBox, moovOffset);
  result.set(bytes.slice(moovOffset + moovSize), moovOffset + moovSize);
  result.set(newMoov, bytes.length);

  return new Blob([result], { type: file.type });
};

function createXmpPacket(metadata: Metadata): string {
  const escTitle = escapeXml(metadata.title);
  const escDesc = escapeXml(metadata.description);
  
  // Keywords in XMP must be in dc:subject as an rdf:Bag of rdf:li elements to be readable by ExifTool XMP-dc:Subject
  const kwList = metadata.keywords
    .filter(k => k.trim().length > 0)
    .map(k => `<rdf:li>${escapeXml(k.trim())}</rdf:li>`)
    .join('\n     ');

  return `<?xpacket begin="\uFEFF" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="Fotag Engine 1.9c">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about=""
    xmlns:dc="http://purl.org/dc/elements/1.1/"
    xmlns:photoshop="http://ns.adobe.com/photoshop/1.0/"
    xmlns:Iptc4xmpCore="http://iptc.org/std/Iptc4xmpCore/1.0/xmlns/"
    xmlns:xmp="http://ns.adobe.com/xap/1.0/">
   <dc:format>video/mp4</dc:format>
   <dc:title>
    <rdf:Alt>
     <rdf:li xml:lang="x-default">${escTitle}</rdf:li>
    </rdf:Alt>
   </dc:title>
   <dc:description>
    <rdf:Alt>
     <rdf:li xml:lang="x-default">${escDesc}</rdf:li>
    </rdf:Alt>
   </dc:description>
   <dc:subject>
    <rdf:Bag>
     ${kwList}
    </rdf:Bag>
   </dc:subject>
   <photoshop:Headline>${escTitle}</photoshop:Headline>
  </rdf:Description>
 </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;
}

function createUdtaAtoms(metadata: Metadata): Uint8Array {
    const atoms: Uint8Array[] = [];
    const addTag = (tagName: string, value: string) => {
        const valBytes = stringToUtf8ByteArray(value);
        const dataBoxSize = 16 + valBytes.length; 
        const tagBoxSize = 8 + dataBoxSize;
        const tagBox = new Uint8Array(tagBoxSize);
        writeBoxHeader(tagBox, 0, tagBoxSize, tagName);
        const dataBox = tagBox.subarray(8);
        writeBoxHeader(dataBox, 0, dataBoxSize, 'data');
        dataBox[11] = 1; // Flag for UTF-8 text
        dataBox.set(valBytes, 16);
        atoms.push(tagBox);
    };

    // Native QuickTime atoms for Title and Description
    addTag('\xA9nam', metadata.title);
    addTag('\xA9des', metadata.description);
    
    const ilstContent = concatUint8Arrays(atoms);
    const ilstSize = 8 + ilstContent.length;
    const ilstBox = new Uint8Array(ilstSize);
    writeBoxHeader(ilstBox, 0, ilstSize, 'ilst');
    ilstBox.set(ilstContent, 8);

    const hdlrBox = new Uint8Array(32);
    writeBoxHeader(hdlrBox, 0, 32, 'hdlr');
    hdlrBox.set(stringToUtf8ByteArray('mdir'), 16);
    hdlrBox.set(stringToUtf8ByteArray('appl'), 20);

    const metaContent = concatUint8Arrays([hdlrBox, ilstBox]);
    const metaSize = 12 + metaContent.length; 
    const metaBox = new Uint8Array(metaSize);
    writeBoxHeader(metaBox, 0, metaSize, 'meta');
    metaBox[8] = 0; metaBox[9] = 0; metaBox[10] = 0; metaBox[11] = 0;
    metaBox.set(metaContent, 12);
    return metaBox;
}

function writeBoxHeader(arr: Uint8Array, offset: number, size: number, type: string) {
    arr[offset] = (size >> 24) & 0xFF;
    arr[offset + 1] = (size >> 16) & 0xFF;
    arr[offset + 2] = (size >> 8) & 0xFF;
    arr[offset + 3] = size & 0xFF;
    for (let i = 0; i < 4; i++) arr[offset + 4 + i] = type.charCodeAt(i);
}

function concatUint8Arrays(arrays: Uint8Array[]): Uint8Array {
    const total = arrays.reduce((acc, curr) => acc + curr.length, 0);
    const result = new Uint8Array(total);
    let offset = 0;
    for (const arr of arrays) { result.set(arr, offset); offset += arr.length; }
    return result;
}

/**
 * Image Embedders (PNG/JPEG)
 */
export const embedMetadataPng = async (file: File, metadata: Metadata): Promise<Blob> => {
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  const xmpStr = createXmpPacket(metadata);
  const keyword = "XML:com.adobe.xmp\0";
  const metaInfo = "\0\0\0\0";
  const xmpBytes = stringToUtf8ByteArray(xmpStr);
  const keywordBytes = stringToUtf8ByteArray(keyword);
  const metaInfoBytes = stringToUtf8ByteArray(metaInfo);
  const chunkData = new Uint8Array(keywordBytes.length + metaInfoBytes.length + xmpBytes.length);
  chunkData.set(keywordBytes, 0);
  chunkData.set(metaInfoBytes, keywordBytes.length);
  chunkData.set(xmpBytes, keywordBytes.length + metaInfoBytes.length);
  const itxtChunk = createPngChunk("iTXt", chunkData);
  const resultBytes = new Uint8Array(bytes.length + itxtChunk.length);
  resultBytes.set(bytes.slice(0, 33), 0);
  resultBytes.set(itxtChunk, 33);
  resultBytes.set(bytes.slice(33), 33 + itxtChunk.length);
  return new Blob([resultBytes], { type: 'image/png' });
};

function createPngChunk(type: string, data: Uint8Array): Uint8Array {
    const typeBytes = stringToUtf8ByteArray(type);
    const len = data.length;
    const chunk = new Uint8Array(4 + 4 + len + 4);
    chunk[0] = (len >> 24) & 0xFF;
    chunk[1] = (len >> 16) & 0xFF;
    chunk[2] = (len >> 8) & 0xFF;
    chunk[3] = len & 0xFF;
    chunk.set(typeBytes, 4);
    chunk.set(data, 8);
    const crc = calculateCrc32(chunk.slice(4, 8 + len));
    chunk[8 + len] = (crc >> 24) & 0xFF;
    chunk[8 + len + 1] = (crc >> 16) & 0xFF;
    chunk[8 + len + 2] = (crc >> 8) & 0xFF;
    chunk[8 + len + 3] = crc & 0xFF;
    return chunk;
}

const crcTable = (() => {
    let c; const table = [];
    for (let n = 0; n < 256; n++) {
        c = n;
        for (let k = 0; k < 8; k++) c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
        table[n] = c;
    }
    return table;
})();

function calculateCrc32(bytes: Uint8Array): number {
    let crc = 0 ^ (-1);
    for (let i = 0; i < bytes.length; i++) crc = (crc >>> 8) ^ crcTable[(crc ^ bytes[i]) & 0xFF];
    return (crc ^ (-1)) >>> 0;
}

export const embedMetadataJpeg = async (file: File, metadata: Metadata): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const result = e.target?.result as string; 
        const exifObj = window.piexif.load(result);
        if (!exifObj["0th"]) exifObj["0th"] = {};
        exifObj["0th"][window.piexif.ImageIFD.ImageDescription] = metadata.title; 
        exifObj["0th"][window.piexif.ImageIFD.XPTitle]    = stringToUtf16LE(metadata.title);
        exifObj["0th"][window.piexif.ImageIFD.XPKeywords] = stringToUtf16LE(metadata.keywords.join(";"));
        exifObj["0th"][window.piexif.ImageIFD.XPComment]  = stringToUtf16LE(metadata.description);
        const exifBytes = window.piexif.dump(exifObj);
        const newJpegDataUrl = window.piexif.insert(exifBytes, result);
        const jpegBytes = dataURItoUint8Array(newJpegDataUrl);
        const xmpStr = createXmpPacket(metadata);
        const finalBytes = injectXmpPacket(jpegBytes, xmpStr);
        resolve(new Blob([finalBytes], { type: 'image/jpeg' }));
      } catch (err) { reject(err); }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

function injectXmpPacket(jpegBytes: Uint8Array, xmpStr: string): Uint8Array {
  const header = "http://ns.adobe.com/xap/1.0/";
  const headerBytes = stringToUtf8ByteArray(header);
  const xmpContentBytes = stringToUtf8ByteArray(xmpStr);
  const payloadLength = headerBytes.length + 1 + xmpContentBytes.length;
  const segmentLength = 2 + payloadLength;
  const xmpSegment = new Uint8Array(segmentLength + 2); 
  let p = 0;
  xmpSegment[p++] = 0xFF; xmpSegment[p++] = 0xE1; 
  xmpSegment[p++] = (segmentLength >> 8) & 0xFF;
  xmpSegment[p++] = segmentLength & 0xFF;
  xmpSegment.set(headerBytes, p); p += headerBytes.length;
  xmpSegment[p++] = 0x00; 
  xmpSegment.set(xmpContentBytes, p);
  const pieces: Uint8Array[] = [];
  let pos = 2;
  pieces.push(jpegBytes.slice(0, 2));
  let xmpInserted = false;
  while (pos < jpegBytes.length) {
    if (jpegBytes[pos] !== 0xFF) { pieces.push(jpegBytes.slice(pos)); break; }
    const marker = jpegBytes[pos + 1];
    if (marker === 0xDA) {
      if (!xmpInserted) pieces.push(xmpSegment);
      pieces.push(jpegBytes.slice(pos)); break;
    }
    const len = (jpegBytes[pos + 2] << 8) | jpegBytes[pos + 3];
    const segmentTotalLen = len + 2; 
    if (marker === 0xE1 && checkHeader(jpegBytes, pos + 4, headerBytes)) { pos += segmentTotalLen; continue; }
    pieces.push(jpegBytes.slice(pos, pos + segmentTotalLen));
    pos += segmentTotalLen;
  }
  return concatUint8Arrays(pieces);
}

function checkHeader(buffer: Uint8Array, start: number, header: number[] | Uint8Array): boolean {
  if (buffer.length < start + header.length) return false;
  for (let i = 0; i < header.length; i++) if (buffer[start + i] !== header[i]) return false;
  return true;
}

function stringToUtf8ByteArray(str: string): Uint8Array { return new TextEncoder().encode(str); }
function stringToUtf16LE(str: string): number[] {
  const arr: number[] = [];
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    arr.push(code & 0xff); arr.push((code >> 8) & 0xff);
  }
  arr.push(0, 0); return arr;
}
function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;'; case '>': return '&gt;';
      case '&': return '&amp;'; case '\'': return '&apos;';
      case '"': return '&quot;'; default: return c;
    }
  });
}
function dataURItoUint8Array(dataURI: string): Uint8Array {
  const byteString = atob(dataURI.split(',')[1]);
  const ia = new Uint8Array(byteString.length);
  for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
  return ia;
}
