import PyPDF2
import sys

def extract_text(pdf_path, txt_path):
    with open(pdf_path, 'rb') as file:
        reader = PyPDF2.PdfReader(file)
        text = ""
        for page in reader.pages:
            text += page.extract_text() + "\n"
        
    with open(txt_path, 'w', encoding='utf-8') as f:
        f.write(text)
    
    print(f"Extraction complete. Wrote {len(text)} characters.")

if __name__ == '__main__':
    extract_text('January to Today (march 12) all user package history.PDF', 'pdf_dump.txt')
