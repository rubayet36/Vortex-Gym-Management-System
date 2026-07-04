import PyPDF2
import re

pdf_path = "f:/Vortex-gym-management-main/Vortex-gym-management-main/Document(1).PDF"
reader = PyPDF2.PdfReader(pdf_path)
full_text = ""
for page in reader.pages:
    full_text += page.extract_text() + "\n"

print("Finding Tawhid...")
for line in full_text.split('\n'):
    if "8801842869420" in line or "Tawhid" in line:
        print(line)
