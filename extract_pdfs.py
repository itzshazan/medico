import sys
import os
sys.stdout.reconfigure(encoding='utf-8')

try:
    from pypdf import PdfReader
except ImportError:
    from PyPDF2 import PdfReader

base = r"C:\Users\eshaa\Documents\antigravity\hopeful-hubble"
out_dir = base

pdf_files = [
    "Dynamic_Clinical_Memory.pptx.pdf",
    "Final Presentation.pptx.pdf",
    "rAJENDER NATH SHARMA.pdf"
]

for fname in pdf_files:
    fpath = os.path.join(base, fname)
    out_name = fname.replace(".pdf", ".txt").replace(".pptx", "")
    out_path = os.path.join(out_dir, out_name)
    
    try:
        reader = PdfReader(fpath)
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(f"FILE: {fname}\n")
            f.write("="*60 + "\n\n")
            for i, page in enumerate(reader.pages):
                text = page.extract_text()
                if text and text.strip():
                    f.write(f"--- Page {i+1} ---\n")
                    f.write(text + "\n\n")
        print(f"Extracted: {out_name}")
    except Exception as e:
        print(f"Error with {fname}: {e}")
