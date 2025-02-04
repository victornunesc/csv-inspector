# csv-inspect

CSV Inspector is a lightweight library that helps you to detect CSV file encoding, delimiter, newline, and headers. 

It supports CSV files with or without headers, quotes, and escape characters.

## 🌟 Features
- Detects CSV file encoding.
- Detects CSV file delimiter.
- Detects CSV file newline.
- Detects if CSV file has headers.
- Supports custom delimiters and newlines.
- Supports custom sample size and min lines.
- Supports CSV files with or without headers.
- Supports CSV files with or without quotes.
- Supports CSV files with or without escape characters.

## 🛠️ Installation
Using [npm](http://npmjs.org):

```bash
npm install csv-inspector
```

Using [yarn](https://yarnpkg.com/)

```bash
yarn add csv-inspector
```

## 📄 Example:
```typescript
import { CSVInspector } from 'csv-inspector'

// example 1 - format with default options
const csv = '"name","age"\n"John","30"\n"Jane","25"'
const buffer = Buffer.from(csv);
const result = CSVInspector.inspectBuffer(buffer);

console.log(result); // -> { delimiter: ',', newline: '\n', hasHeaders: true, encoding: 'ASCII' }

// example 2 - format with custom options
const csv = 'name;age\r\nJohn;30\r\nJane;25'
const buffer = Buffer.from(csv);
const result = CSVInspector.inspectBuffer(buffer, { delimiters: [';'], newlines: ['\r\n'], sampleSize: 1000, minLines: 1 });

console.log(result); // -> { delimiter: ';', newline: '\r\n', hasHeaders: true, encoding: 'ASCII' }

// example 3 - invalid csv
const invalidCSV = 'name,age\nJohn,30\nJane'
const buffer = Buffer.from(invalidCSV);
const result = CSVInspector.inspectBuffer(buffer);

console.log(result); // -> null

```

See tests for more examples

## 📜 License

CSV-Inspector is released under the MIT [License](LICENSE).
