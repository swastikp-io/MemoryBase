import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';

export const exportToDocx = async (content: string, sources: any[], filename: string) => {
  const paragraphs: Paragraph[] = [];
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Headings
    if (trimmed.startsWith('#')) {
      const match = trimmed.match(/^(#+)\s+(.*)/);
      if (match) {
        const level = match[1].length;
        const text = match[2];
        const headingLevel = [
          HeadingLevel.HEADING_1,
          HeadingLevel.HEADING_2,
          HeadingLevel.HEADING_3,
          HeadingLevel.HEADING_4,
          HeadingLevel.HEADING_5,
          HeadingLevel.HEADING_6,
        ][Math.min(level - 1, 5)];

        paragraphs.push(
          new Paragraph({
            text: text,
            heading: headingLevel,
            spacing: { before: 240, after: 120 },
          })
        );
        continue;
      }
    }

    // Bullet Lists
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const text = trimmed.substring(2);
      paragraphs.push(
        new Paragraph({
          children: parseInlineFormatting(text),
          bullet: { level: 0 },
          spacing: { after: 120 },
        })
      );
      continue;
    }

    // Numbered Lists
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (numMatch) {
      paragraphs.push(
        new Paragraph({
          children: parseInlineFormatting(numMatch[2]),
          numbering: { reference: "numbered", level: 0 },
          spacing: { after: 120 },
        })
      );
      continue;
    }

    // Regular Paragraphs
    paragraphs.push(
      new Paragraph({
        children: parseInlineFormatting(trimmed),
        spacing: { after: 120 },
      })
    );
  }

  // Append Sources Section
  if (sources && sources.length > 0) {
    paragraphs.push(
      new Paragraph({
        text: "References",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 120 },
      })
    );

    sources.forEach((source, idx) => {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({ text: `[${idx + 1}] `, bold: true }),
            new TextRun({ text: source.title, bold: true }),
            new TextRun({ text: `\n${source.url}`, color: "0000FF", underline: {} })
          ],
          spacing: { after: 120 },
        })
      );
    });
  }

  const doc = new Document({
    numbering: {
      config: [
        {
          reference: "numbered",
          levels: [
            {
              level: 0,
              format: "decimal",
              text: "%1.",
              alignment: AlignmentType.START,
              style: { paragraph: { indent: { left: 720, hanging: 360 } } },
            },
          ],
        },
      ],
    },
    sections: [{
      properties: {},
      children: paragraphs,
    }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, filename);
};

// Helper to parse basic inline bold formatting (**text**)
function parseInlineFormatting(text: string): TextRun[] {
  const runs: TextRun[] = [];
  const parts = text.split(/(\*\*.*?\*\*)/g);

  for (const part of parts) {
    if (part.startsWith('**') && part.endsWith('**')) {
      runs.push(new TextRun({ text: part.substring(2, part.length - 2), bold: true }));
    } else if (part.length > 0) {
      runs.push(new TextRun({ text: part }));
    }
  }
  return runs;
}
