import fs from 'fs';
import PDFParser from 'pdf2json';

const pdfParser = new PDFParser(this, 1); // 1 = returns raw text content

pdfParser.on('pdfParser_dataError', errData => console.error(errData.parserError));
pdfParser.on('pdfParser_dataReady', pdfData => {
    fs.writeFileSync('pdf_dump.txt', pdfParser.getRawTextContent());
    console.log('Parsed PDF with pdf2json.');
});

pdfParser.loadPDF('January to Today (march 12) all user package history.PDF');
