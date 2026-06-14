import subprocess, sys, os

# Install pdf2image and Pillow
subprocess.check_call([sys.executable, "-m", "pip", "install", "pdf2image", "Pillow", "--quiet"], 
                       stderr=subprocess.DEVNULL)

from pdf2image import convert_from_path

base = r"C:\Users\eshaa\Documents\antigravity\hopeful-hubble"

# Check for poppler
try:
    # Try default - sometimes poppler is on PATH
    pages = convert_from_path(os.path.join(base, "Dynamic_Clinical_Memory.pptx.pdf"), first_page=1, last_page=1, dpi=150)
    print("Poppler found on PATH")
except Exception as e:
    print(f"Poppler not found: {e}")
    print("Need to install poppler for Windows")
    print("Trying alternative approach with PyMuPDF...")
    
    subprocess.check_call([sys.executable, "-m", "pip", "install", "PyMuPDF", "--quiet"],
                          stderr=subprocess.DEVNULL)
    
    import fitz  # PyMuPDF
    
    pdfs = ["Dynamic_Clinical_Memory.pptx.pdf", "Final Presentation.pptx.pdf"]
    
    for pdf_name in pdfs:
        pdf_path = os.path.join(base, pdf_name)
        doc = fitz.open(pdf_path)
        print(f"\n{pdf_name}: {doc.page_count} pages")
        
        out_dir = os.path.join(base, pdf_name.replace(".pptx.pdf", "").replace(".pdf", "") + "_pages")
        os.makedirs(out_dir, exist_ok=True)
        
        for i, page in enumerate(doc):
            pix = page.get_pixmap(dpi=150)
            img_path = os.path.join(out_dir, f"page_{i+1:02d}.png")
            pix.save(img_path)
            print(f"  Saved page {i+1}")
        
        doc.close()
    
    print("\nDone!")
