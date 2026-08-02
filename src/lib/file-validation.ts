export const ACCEPTED_FILE_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
];

export const ACCEPTED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png"];

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export const MAX_FILES = 5;

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export function validateFile(file: { name: string; type: string; size: number }): FileValidationResult {
  const ext = file.name.toLowerCase().substring(file.name.lastIndexOf("."));
  const typeMatches = ACCEPTED_FILE_TYPES.includes(file.type);
  const extMatches = ACCEPTED_EXTENSIONS.includes(ext);

  if (!typeMatches && !extMatches) {
    return {
      valid: false,
      error: `"${file.name}" is not an accepted format. Please upload PDF, JPG, or PNG files only.`,
    };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `"${file.name}" is ${sizeMB}MB. Maximum file size is 10MB.`,
    };
  }

  if (file.size === 0) {
    return {
      valid: false,
      error: `"${file.name}" is empty. Please select a valid file.`,
    };
  }

  return { valid: true };
}

export function validateFileBatch(files: { name: string; type: string; size: number }[]): {
  valid: { name: string; type: string; size: number }[];
  errors: string[];
} {
  const valid: { name: string; type: string; size: number }[] = [];
  const errors: string[] = [];

  if (files.length > MAX_FILES) {
    errors.push(`Maximum ${MAX_FILES} files allowed. You selected ${files.length}.`);
    return { valid, errors };
  }

  for (const file of files) {
    const result = validateFile(file);
    if (result.valid) {
      // dedupe by name
      if (!valid.some((v) => v.name === file.name)) {
        valid.push(file);
      }
    } else {
      errors.push(result.error!);
    }
  }

  return { valid, errors };
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
