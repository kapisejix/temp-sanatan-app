import markdown
from weasyprint import HTML
import os

# Read the markdown file
with open('/app/docs/SanatanSaathi_Technical_Blueprint.md', 'r', encoding='utf-8') as f:
    md_content = f.read()

# Convert Markdown to HTML
html_body = markdown.markdown(md_content, extensions=['tables', 'fenced_code', 'toc', 'nl2br'])

# Full HTML with professional styling
html_full = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @page {{
    size: A4;
    margin: 2cm 2.5cm;
    @top-center {{
      content: "Sanatan Saathi — Technical Blueprint";
      font-size: 8pt;
      color: #888;
    }}
    @bottom-center {{
      content: "Page " counter(page) " of " counter(pages);
      font-size: 8pt;
      color: #888;
    }}
  }}
  
  body {{
    font-family: 'Helvetica', 'Arial', sans-serif;
    font-size: 10pt;
    line-height: 1.6;
    color: #1a1a2e;
    max-width: 100%;
  }}
  
  h1 {{
    color: #e94560;
    font-size: 22pt;
    border-bottom: 3px solid #e94560;
    padding-bottom: 8px;
    margin-top: 40px;
    page-break-before: always;
  }}
  
  h1:first-of-type {{
    page-break-before: avoid;
    text-align: center;
    font-size: 28pt;
    border-bottom: 4px solid #e94560;
  }}
  
  h2 {{
    color: #16213e;
    font-size: 16pt;
    border-bottom: 1.5px solid #0f3460;
    padding-bottom: 4px;
    margin-top: 25px;
  }}
  
  h3 {{
    color: #0f3460;
    font-size: 13pt;
    margin-top: 18px;
  }}
  
  table {{
    border-collapse: collapse;
    width: 100%;
    margin: 12px 0;
    font-size: 9pt;
  }}
  
  th {{
    background-color: #16213e;
    color: white;
    padding: 8px 10px;
    text-align: left;
    font-weight: bold;
  }}
  
  td {{
    padding: 6px 10px;
    border: 1px solid #ddd;
  }}
  
  tr:nth-child(even) {{
    background-color: #f8f9fa;
  }}
  
  code {{
    background-color: #f0f0f0;
    padding: 2px 5px;
    border-radius: 3px;
    font-size: 9pt;
    font-family: 'Courier New', monospace;
  }}
  
  pre {{
    background-color: #1a1a2e;
    color: #e8e8e8;
    padding: 15px;
    border-radius: 6px;
    font-size: 8.5pt;
    line-height: 1.4;
    overflow-x: auto;
    white-space: pre-wrap;
    word-wrap: break-word;
  }}
  
  pre code {{
    background-color: transparent;
    color: #e8e8e8;
    padding: 0;
  }}
  
  blockquote {{
    border-left: 4px solid #e94560;
    padding-left: 15px;
    color: #555;
    margin: 10px 0;
  }}
  
  hr {{
    border: none;
    border-top: 2px solid #e94560;
    margin: 30px 0;
  }}

  ul, ol {{
    margin: 5px 0;
    padding-left: 25px;
  }}
  
  li {{
    margin: 3px 0;
  }}

  .cover-page {{
    text-align: center;
    padding-top: 150px;
    page-break-after: always;
  }}
  
  .cover-page h1 {{
    font-size: 36pt;
    color: #e94560;
    border: none;
    page-break-before: avoid;
  }}
  
  .cover-page .subtitle {{
    font-size: 16pt;
    color: #0f3460;
    margin-top: 20px;
  }}
  
  .cover-page .version {{
    font-size: 12pt;
    color: #666;
    margin-top: 40px;
  }}
  
  .cover-page .prepared {{
    font-size: 10pt;
    color: #888;
    margin-top: 100px;
  }}
</style>
</head>
<body>

<div class="cover-page">
  <h1>SANATAN SAATHI</h1>
  <div class="subtitle">Technical Development Blueprint</div>
  <div class="subtitle" style="font-size: 12pt; margin-top: 10px;">Complete Architecture, Database Schema, API Design & Development Plan</div>
  <div class="version">
    Version 1.0<br>
    January 2026
  </div>
  <div class="prepared">
    Prepared by E1 Agent | Emergent Labs<br>
    Based on SanatanSaathi Blueprint v3.0
  </div>
</div>

{html_body}

</body>
</html>"""

# Generate PDF
output_path = '/app/docs/SanatanSaathi_Technical_Blueprint.pdf'
HTML(string=html_full).write_pdf(output_path)
print(f"PDF generated: {{output_path}}")
print(f"File size: {{os.path.getsize(output_path) / 1024:.1f}} KB")
