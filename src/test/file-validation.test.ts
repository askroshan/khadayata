import { describe, it, expect } from "vitest";
import {
  validateFile,
  validateFileBatch,
  formatFileSize,
  ACCEPTED_FILE_TYPES,
  ACCEPTED_EXTENSIONS,
  MAX_FILE_SIZE_BYTES,
  MAX_FILES,
} from "@/lib/file-validation";

describe("validateFile", () => {
  it("accepts a PDF file within size limit", () => {
    const result = validateFile({ name: "id.pdf", type: "application/pdf", size: 2 * 1024 * 1024 });
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("accepts a JPG file within size limit", () => {
    const result = validateFile({ name: "photo.jpg", type: "image/jpeg", size: 3 * 1024 * 1024 });
    expect(result.valid).toBe(true);
  });

  it("accepts a PNG file within size limit", () => {
    const result = validateFile({ name: "scan.png", type: "image/png", size: 500 * 1024 });
    expect(result.valid).toBe(true);
  });

  it("accepts a JPEG file with .jpeg extension", () => {
    const result = validateFile({ name: "doc.jpeg", type: "image/jpeg", size: 1024 });
    expect(result.valid).toBe(true);
  });

  it("rejects a file with unsupported type", () => {
    const result = validateFile({ name: "doc.docx", type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", size: 1024 });
    expect(result.valid).toBe(false);
    expect(result.error).toContain("not an accepted format");
  });

  it("rejects a file with unsupported extension even if type is wrong", () => {
    const result = validateFile({ name: "file.gif", type: "image/gif", size: 1024 });
    expect(result.valid).toBe(false);
    expect(result.error).toContain("not an accepted format");
  });

  it("rejects a file exceeding 10MB", () => {
    const result = validateFile({ name: "big.pdf", type: "application/pdf", size: 11 * 1024 * 1024 });
    expect(result.valid).toBe(false);
    expect(result.error).toContain("11.0MB");
    expect(result.error).toContain("10MB");
  });

  it("rejects a file exactly at 10MB boundary (boundary is inclusive)", () => {
    const result = validateFile({ name: "exact.pdf", type: "application/pdf", size: MAX_FILE_SIZE_BYTES });
    expect(result.valid).toBe(true);
  });

  it("rejects an empty file", () => {
    const result = validateFile({ name: "empty.pdf", type: "application/pdf", size: 0 });
    expect(result.valid).toBe(false);
    expect(result.error).toContain("empty");
  });

  it("accepts a file with correct extension but slightly off mime type", () => {
    const result = validateFile({ name: "id.pdf", type: "application/octet-stream", size: 1024 });
    expect(result.valid).toBe(true);
  });
});

describe("validateFileBatch", () => {
  it("accepts a batch of valid files within the limit", () => {
    const files = [
      { name: "a.pdf", type: "application/pdf", size: 1024 },
      { name: "b.jpg", type: "image/jpeg", size: 2048 },
    ];
    const result = validateFileBatch(files);
    expect(result.valid).toHaveLength(2);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects batch exceeding MAX_FILES", () => {
    const files = Array.from({ length: MAX_FILES + 1 }, (_, i) => ({
      name: `file${i}.pdf`,
      type: "application/pdf",
      size: 1024,
    }));
    const result = validateFileBatch(files);
    expect(result.valid).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("Maximum");
  });

  it("deduplicates files by name", () => {
    const files = [
      { name: "same.pdf", type: "application/pdf", size: 1024 },
      { name: "same.pdf", type: "application/pdf", size: 1024 },
    ];
    const result = validateFileBatch(files);
    expect(result.valid).toHaveLength(1);
  });

  it("returns errors for invalid files while keeping valid ones", () => {
    const files = [
      { name: "good.pdf", type: "application/pdf", size: 1024 },
      { name: "bad.gif", type: "image/gif", size: 1024 },
      { name: "too-big.pdf", type: "application/pdf", size: 15 * 1024 * 1024 },
    ];
    const result = validateFileBatch(files);
    expect(result.valid).toHaveLength(1);
    expect(result.valid[0].name).toBe("good.pdf");
    expect(result.errors).toHaveLength(2);
  });

  it("handles empty batch", () => {
    const result = validateFileBatch([]);
    expect(result.valid).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
  });
});

describe("formatFileSize", () => {
  it("formats bytes", () => {
    expect(formatFileSize(500)).toBe("500 B");
  });

  it("formats kilobytes", () => {
    expect(formatFileSize(2048)).toBe("2 KB");
  });

  it("formats megabytes", () => {
    expect(formatFileSize(5 * 1024 * 1024)).toBe("5.0 MB");
  });
});

describe("constants", () => {
  it("has correct accepted types", () => {
    expect(ACCEPTED_FILE_TYPES).toContain("application/pdf");
    expect(ACCEPTED_FILE_TYPES).toContain("image/jpeg");
    expect(ACCEPTED_FILE_TYPES).toContain("image/png");
  });

  it("has correct accepted extensions", () => {
    expect(ACCEPTED_EXTENSIONS).toContain(".pdf");
    expect(ACCEPTED_EXTENSIONS).toContain(".jpg");
    expect(ACCEPTED_EXTENSIONS).toContain(".jpeg");
    expect(ACCEPTED_EXTENSIONS).toContain(".png");
  });

  it("has 10MB max file size", () => {
    expect(MAX_FILE_SIZE_BYTES).toBe(10 * 1024 * 1024);
  });

  it("allows max 5 files", () => {
    expect(MAX_FILES).toBe(5);
  });
});
