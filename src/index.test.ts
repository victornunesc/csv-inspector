import { it, expect } from 'vitest';
import { CSVInspector } from './index';

it('should return null for an empty buffer', () => {
  const result = CSVInspector.inspectBuffer(Buffer.from(''));
  expect(result).toBeNull();
});

it('should inspect CSV format with default options', () => {
  const buffer = Buffer.from('name,age\nJohn,30\nJane,25');
  const result = CSVInspector.inspectBuffer(buffer);

  expect(result).toEqual({
    delimiter: ',',
    newline: '\n',
    hasHeaders: true,
    encoding: 'ASCII',
  });
});

it('should inspect CSV format with custom delimiters', () => {
  const buffer = Buffer.from('name|age\nJohn|30\nJane|25');
  const result = CSVInspector.inspectBuffer(buffer, { delimiters: ['|'] });

  expect(result).toEqual({
    delimiter: '|',
    newline: '\n',
    hasHeaders: true,
    encoding: 'ASCII',
  });
});

it('should inspect CSV format with custom newlines', () => {
  const buffer = Buffer.from('name,age\r\nJohn,30\r\nJane,25');
  const result = CSVInspector.inspectBuffer(buffer, { newlines: ['\r\n'] });

  expect(result).toEqual({
    delimiter: ',',
    newline: '\r\n',
    hasHeaders: true,
    encoding: 'ASCII',
  });
});

it('should return null for insufficient lines', () => {
  const buffer = Buffer.from('name,age');
  const result = CSVInspector.inspectBuffer(buffer);

  expect(result).toBeNull();
});

it('should inspect CSV format with UTF-8 encoding', () => {
  const buffer = Buffer.from('\uFEFFname,age\nJohn,30\nJane,25', 'utf8');
  const result = CSVInspector.inspectBuffer(buffer);

  expect(result).toEqual({
    delimiter: ',',
    newline: '\n',
    hasHeaders: true,
    encoding: 'UTF-8 with BOM',
  });
});

it('should detect CSV format with 1 column', () => {
  const buffer = Buffer.from('name\nJohn\nJane');
  const result = CSVInspector.inspectBuffer(buffer);
  expect(result).toEqual({
    delimiter: undefined,
    newline: '\n',
    hasHeaders: true,
    encoding: 'ASCII',
  });
});

it('should inspect CSV format without headers', () => {
  const buffer = Buffer.from('John,30\nJane,25');
  const result = CSVInspector.inspectBuffer(buffer);

  expect(result).toEqual({
    delimiter: ',',
    newline: '\n',
    hasHeaders: false,
    encoding: 'ASCII',
  });
});

it('should inspect CSV format with quoted fields', () => {
  const buffer = Buffer.from('"name","age"\n"John","30"\n"Jane","25"');
  const result = CSVInspector.inspectBuffer(buffer);

  expect(result).toEqual({
    delimiter: ',',
    newline: '\n',
    hasHeaders: true,
    encoding: 'ASCII',
  });
});

it('should inspect CSV format with semicolon delimiter', () => {
  const buffer = Buffer.from('name;age\nJohn;30\nJane;25');
  const result = CSVInspector.inspectBuffer(buffer);

  expect(result).toEqual({
    delimiter: ';',
    newline: '\n',
    hasHeaders: true,
    encoding: 'ASCII',
  });
});

it('should inspect CSV format with tab delimiter', () => {
  const buffer = Buffer.from('name\tage\nJohn\t30\nJane\t25');
  const result = CSVInspector.inspectBuffer(buffer);

  expect(result).toEqual({
    delimiter: '\t',
    newline: '\n',
    hasHeaders: true,
    encoding: 'ASCII',
  });
});

it('should inspect CSV format with pipe delimiter', () => {
  const buffer = Buffer.from('name|age\nJohn|30\nJane|25');
  const result = CSVInspector.inspectBuffer(buffer);

  expect(result).toEqual({
    delimiter: '|',
    newline: '\n',
    hasHeaders: true,
    encoding: 'ASCII',
  });
});

it('should inspect CSV format with mixed newlines', () => {
  const buffer = Buffer.from('name,age\nJohn,30\r\nJane,25\r');
  const result = CSVInspector.inspectBuffer(buffer);

  expect(result).toEqual({
    delimiter: ',',
    newline: '\n',
    hasHeaders: true,
    encoding: 'ASCII',
  });
});

it('should inspect CSV format with custom sample size', () => {
  const buffer = Buffer.from('name,age\nJohn,30\nJane,25\nDoe,40');
  const result = CSVInspector.inspectBuffer(buffer, { sampleSize: 1000 });

  expect(result).toEqual({
    delimiter: ',',
    newline: '\n',
    hasHeaders: true,
    encoding: 'ASCII',
  });
});

it('should inspect CSV format with custom minimum lines', () => {
  const buffer = Buffer.from('name,age\nJohn,30');
  const result = CSVInspector.inspectBuffer(buffer, { minLines: 1 });

  expect(result).toEqual({
    delimiter: ',',
    newline: '\n',
    hasHeaders: true,
    encoding: 'ASCII',
  });
});
