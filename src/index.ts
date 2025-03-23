/**
 * Represents the detected CSV format characteristics
 */
interface CSVFormat {
  /** Delimiter character used in the CSV */
  delimiter?: string;
  /** Newline character used in the CSV */
  newline: string;
  /** Whether the CSV has headers in the first row */
  hasHeaders?: boolean;
  /** Encoding used in the CSV */
  encoding?: string;
}

/**
 * Configuration options for CSV detection
 */
interface DetectOptions {
  /** Delimiter characters to test */
  delimiters?: string[];
  /** Newline characters to test */
  newlines?: string[];
  /** Maximum number of bytes to read for detection */
  sampleSize?: number;
  /** Minimum number of lines required for detection */
  minLines?: number;
}

/**
 * Service for detecting and analyzing CSV file format characteristics
 */
export class CSVInspector {
  /**
   * Default configuration for CSV detection
   */
  private static readonly DEFAULT_CONFIG = {
    delimiters: [',', ';', '\t', '|'],
    newlines: ['\n', '\r\n', '\r'],
    sampleSize: 4096,
    minLines: 2,
  } as const;

  /**
   * Detects CSV format characteristics from a buffer
   * @param buffer - Input buffer containing CSV data
   * @param opts - Optional configuration for detection
   * @returns Detected CSV format or null if invalid
   */
  public static inspectBuffer(buffer: Buffer, opts: DetectOptions = {}): CSVFormat | null {
    if (!buffer || buffer.length === 0) {
      return null;
    }

    const config = { ...CSVInspector.DEFAULT_CONFIG, ...opts };
    const detectedEncoding = this.#detectEncoding(buffer);
    const useEncoding =
      detectedEncoding === 'UTF-8 with BOM' ? 'utf8' : (detectedEncoding.toLowerCase() as BufferEncoding);

    const sample = buffer.subarray(0, config.sampleSize).toString(useEncoding).trim();

    if (!sample) {
      return null;
    }

    const lines = this.#splitLines(sample);
    if (lines.length < config.minLines) {
      return null;
    }

    const newline = this.#detectNewline(sample, [...config.newlines]);
    if (!newline) {
      return null;
    }

    const isQuoted = this.#isQuoted(lines[0]);

    const delimiter = !isQuoted || lines.length > 1 ? this.#detectDelimiter(lines, [...config.delimiters]) : undefined;

    if (!(delimiter || isQuoted || this.#isValidSingleColumn(lines))) {
      return null;
    }

    const hasHeaders = lines.length >= 2 ? this.#detectSingleColumnHeaders(lines[0], lines[1], delimiter) : false;

    return {
      delimiter,
      newline,
      hasHeaders,
      encoding: detectedEncoding,
    };
  }

  /**
   * Detects the most common delimiter in CSV lines
   */
  static #detectDelimiter(lines: string[], delimiters: string[]): string | undefined {
    const firstLineDelimiters = this.#countDelimiters(lines[0], delimiters);

    for (let i = 1; i < Math.min(lines.length, 5); i++) {
      const lineDelimiters = this.#countDelimiters(lines[i], delimiters);

      for (const [delimiter, count] of Object.entries(firstLineDelimiters)) {
        if (lineDelimiters[delimiter] !== count) {
          delete firstLineDelimiters[delimiter];
        }
      }
    }

    let maxCount = 0;
    let bestDelimiter: string | undefined;

    for (const [delimiter, count] of Object.entries(firstLineDelimiters)) {
      if (count > maxCount) {
        maxCount = count;
        bestDelimiter = delimiter;
      }
    }

    return bestDelimiter;
  }

  /**
   * Counts delimiter occurrences outside quoted strings
   */
  static #countDelimiters(line: string, delimiters: string[]): Record<string, number> {
    const counts: Record<string, number> = {};
    let inQuotes = false;

    for (const delimiter of delimiters) {
      counts[delimiter] = 0;
    }

    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') {
        inQuotes = !inQuotes;
      } else if (!inQuotes && delimiters.includes(line[i])) {
        counts[line[i]]++;
      }
    }

    return counts;
  }

  /**
   * Detects the newline character(s) used in the text
   */
  static #detectNewline(text: string, newlines: string[]): string {
    for (const nl of newlines) {
      if (text.includes(nl)) {
        return nl;
      }
    }
    return '\n';
  }

  /**
   * Splits text into lines handling different newline characters
   */
  static #splitLines(text: string): string[] {
    return text.split(/\r\n|\r|\n/).filter((line) => line.length > 0);
  }

  /**
   * Checks if a string is properly quoted
   */
  static #isQuoted(text: string): boolean {
    if (!(text.startsWith('"') && text.endsWith('"'))) {
      return false;
    }

    let escaped = false;
    for (let i = 1; i < text.length - 1; i++) {
      if (text[i] === '"') {
        if (escaped) {
          escaped = false;
        } else {
          escaped = true;
        }
      } else if (escaped) {
        return false;
      }
    }

    return !escaped;
  }

  /**
   * Attempts to detect if the CSV has headers by comparing first two rows
   */
  static #detectHeaders(firstLine: string, secondLine: string, delimiter?: string): boolean {
    if (!(delimiter && firstLine && secondLine)) {
      return false;
    }

    const firstFields = this.#splitFields(firstLine, delimiter);
    const secondFields = this.#splitFields(secondLine, delimiter);

    if (firstFields.length !== secondFields.length) {
      return false;
    }

    const cleanFirstFields = firstFields.map((field) => this.#cleanField(field));
    const cleanSecondFields = secondFields.map((field) => this.#cleanField(field));

    const firstRowValid = cleanFirstFields.every(
      (field) => field.length > 0 && !this.#isNumeric(field) && this.#looksLikeHeader(field)
    );

    const secondRowHasData = cleanSecondFields.some((field) => this.#isNumeric(field) || field.length === 0);

    return firstRowValid && secondRowHasData;
  }

  /**
   * Checks if lines represent a valid single-column CSV
   */
  static #isValidSingleColumn(lines: string[]): boolean {
    return lines.every((line) => {
      const trimmed = line.trim();
      return trimmed.length > 0 && !this.DEFAULT_CONFIG.delimiters.some((d) => trimmed.includes(d));
    });
  }

  /**
   * Detects headers for single-column CSV
   */
  static #detectSingleColumnHeaders(firstLine: string, secondLine: string, delimiter?: string): boolean {
    if (delimiter) {
      return this.#detectHeaders(firstLine, secondLine, delimiter);
    }

    const header = this.#cleanField(firstLine);
    const _firstData = this.#cleanField(secondLine);

    return this.#looksLikeHeader(header) && !this.#isNumeric(header);
  }

  /**
   * Removes quotes and trims a field
   */
  static #cleanField(field: string): string {
    let cleaned = field.trim();
    if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
      cleaned = cleaned.slice(1, -1);
    }
    return cleaned.trim();
  }

  /**
   * Checks if a string is numeric
   */
  static #isNumeric(str: string): boolean {
    if (str === '') {
      return false;
    }
    return !(Number.isNaN(str) || Number.isNaN(parseFloat(str)));
  }

  /**
   * Checks if a string looks like a header
   * Headers typically don't contain special characters (except underscore)
   * and aren't excessively long
   */
  static #looksLikeHeader(str: string): boolean {
    // Headers shouldn't be too long
    if (str.length > 50) {
      return false;
    }

    // Headers typically use simple characters
    const headerPattern = /^[a-zA-Z0-9_\s]+$/;
    return headerPattern.test(str);
  }

  /**
   * Splits a line into fields respecting quotes
   */
  static #splitFields(line: string, delimiter: string): string[] {
    const fields: string[] = [];
    let field = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') {
        inQuotes = !inQuotes;
        field += line[i];
      } else if (!inQuotes && line[i] === delimiter) {
        fields.push(field);
        field = '';
      } else {
        field += line[i];
      }
    }

    fields.push(field);
    return fields;
  }

  /**
   * Detects file encoding using Buffer analysis
   * Uses modern Buffer methods to detect UTF-8 vs ASCII
   */
  static #detectEncoding(buffer: Buffer): string {
    if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
      return 'UTF-8 with BOM';
    }

    for (let i = 0; i < Math.min(buffer.length, 1024); i++) {
      if (buffer[i] > 127) {
        return 'UTF-8';
      }
    }

    return 'ASCII';
  }
}
