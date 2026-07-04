const fs = require('fs');
const pdf = require('pdf-parse');
const path = require('path');

const pdfPath = path.join(__dirname, '..', 'January to Today (march 12) all user package history.PDF');
const dataBuffer = fs.readFileSync(pdfPath);

pdf(dataBuffer).then(function(data) {
    fs.writeFileSync('pdf_dump.txt', data.text);
    console.log('Done parsing PDF. Lines:', data.text.split('\n').length);
}).catch(console.error);
