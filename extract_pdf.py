import pdfplumber
import os

pdf1 = r'D:/科林冲刺/项目班/新建文件夹/2025 秋招面经总结.pdf'
pdf2 = r'D:/科林冲刺/项目班/新建文件夹/2025 项目面经总结.pdf'

for pdf_path, out_path in [(pdf1, '面经1.txt'), (pdf2, '面经2.txt')]:
    out_path = os.path.join(os.path.dirname(__file__), out_path)
    with open(out_path, 'w', encoding='utf-8') as out:
        try:
            with pdfplumber.open(pdf_path) as pdf:
                for i, page in enumerate(pdf.pages):
                    text = page.extract_text()
                    if text:
                        out.write(f'=== PAGE {i+1} ===\n')
                        out.write(text)
                        out.write('\n\n')
            print(f'OK: {out_path} ({len(pdf.pages)} pages)')
        except Exception as e:
            print(f'FAIL {pdf_path}: {e}')
