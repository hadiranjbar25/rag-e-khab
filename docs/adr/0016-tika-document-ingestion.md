# 0016 - Tika for Broad Document Ingestion

## Status

Accepted

## Context

The knowledge base originally extracted text from PDFs with PDFBox and handled Markdown/text files directly. Developers also need to ingest common office and web artifacts such as Word documents, PowerPoint files, spreadsheets, HTML exports, CSVs, and plain text notes.

## Decision

Use Apache Tika for general document detection and text extraction across office, web, spreadsheet, and text-like formats.

Keep PDFBox for PDF-specific extraction because it preserves page-level chunks, which are useful for citations and source inspection.

## Consequences

- The upload path supports more document formats without custom parser code for each file type.
- PDF ingestion keeps page numbers through the existing PDFBox path.
- Tika extraction returns a single text unit for non-PDF formats unless a future parser adds format-specific page/sheet/slide chunking.
- Unsupported or unreadable files still fail during upload if no indexable text can be extracted.
