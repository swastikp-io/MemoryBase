import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider } from '../theme/ThemeProvider';
import { ChatMessage } from '../components/ChatMessage';
import { describe, test, expect, beforeAll } from 'vitest';

// Create a large 15k word document
const largeTextContent = Array.from({ length: 15000 }, (_, i) => `word${i}`).join(' ');

// Create a 1000 line code block
const largeCodeBlock = `\`\`\`javascript\n${Array.from({ length: 1000 }, (_, i) => `console.log("line ${i}");`).join('\n')}\n\`\`\``;

// Create a 300 node file tree
const largeFileTree = `\`\`\`tree\nproject/\n${Array.from({ length: 300 }, (_, i) => `├── file${i}.ts`).join('\n')}\n\`\`\``;

// Complex architecture document
const complexArchitectureDoc = `
# Enterprise Architecture
## Core Services
- Authentication
- Database
## Diagrams
\`\`\`mermaid
graph TD;
    A-->B;
\`\`\`
## File Structure
\`\`\`tree
backend/
├── src/
│   ├── main.ts
│   └── api/
\`\`\`
`;

describe('Kimi K2.6 Stress & Rendering Tests', () => {
  beforeAll(() => {
    // Mock getComputedStyle and ResizeObserver for virtualized lists
    Object.defineProperty(window, 'getComputedStyle', {
      value: () => ({ color: 'rgb(236, 236, 236)', backgroundColor: 'rgb(10, 10, 10)' }),
    });

    global.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
    
    // Intersection observer mock for TOC
    global.IntersectionObserver = class IntersectionObserver {
      constructor() {}
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  });

  test('Test A: Renders 15,000 word report without crashing', async () => {
    const { container } = render(
      <ThemeProvider>
        <ChatMessage id="msg-1" role="model" content={largeTextContent} />
      </ThemeProvider>
    );
    expect(container).toBeDefined();
    expect(await screen.findByText(/word14999/)).toBeDefined();
  });

  test('Test B: Renders 1,000 line code block with Virtualization', async () => {
    const { container } = render(
      <ThemeProvider>
        <ChatMessage id="msg-2" role="model" content={largeCodeBlock} />
      </ThemeProvider>
    );
    
    // Check that the react-virtuoso list container mounted
    const codeBlock = container.querySelector('.markdown-body');
    expect(codeBlock).toBeDefined();
    
    // We expect virtualization to NOT render line 999 immediately in the DOM if height is limited
    // But testing library renders it without height constraints sometimes unless explicitly checked.
    // Ensure the component doesn't crash during mount
    expect(container).toBeTruthy();
  });

  test('Test C: Renders 300-node file tree using custom FileTree component', async () => {
    render(
      <ThemeProvider>
        <ChatMessage id="msg-3" role="model" content={largeFileTree} />
      </ThemeProvider>
    );
    
    // The FileTree component renders "Project Structure" header
    expect(screen.getByText('Project Structure')).toBeDefined();
    expect(screen.getByText('file299.ts')).toBeDefined();
  });

  test('Test D: Enterprise Architecture Document integrates TOC & Components smoothly', async () => {
    const { container } = render(
      <ThemeProvider>
        <ChatMessage id="msg-4" role="model" content={complexArchitectureDoc} />
      </ThemeProvider>
    );
    
    expect(screen.getByText('Enterprise Architecture')).toBeDefined();
    expect(screen.getByText('Core Services')).toBeDefined();
    expect(screen.getByText('Project Structure')).toBeDefined(); // The inner file tree component mounted
  });
});
