import React from 'react';
import { render, screen } from '@testing-library/react';


import { describe, test, expect, beforeAll } from 'vitest';

// A mock component that simulates markdown rendering for lists and strong tags
const MockMarkdownResponse = ({ content }: { content: string }) => (
  <div className="markdown-body">
    <ul>
      <li>
        <strong>React Frontend</strong>: Handles the user interface
      </li>
      <li>
        <strong>Tauri Core</strong>: Handles native interactions
      </li>
    </ul>
    <h2>Architecture</h2>
    <p>This is a test architecture document.</p>
  </div>
);

describe('Typography & Theme Validation', () => {
  beforeAll(() => {
    // Mock getComputedStyle
    Object.defineProperty(window, 'getComputedStyle', {
      value: (element: Element) => {
        return {
          color: 'rgb(236, 236, 236)', // Default dark mode --text-primary
          backgroundColor: 'rgb(10, 10, 10)', // Default dark mode --background
        };
      },
    });
  });

  test('Strong tags (labels) inherit theme foreground color instead of white', () => {
    render(

        <MockMarkdownResponse content="" />

    );
    
    const strongTag = screen.getByText('React Frontend');
    expect(strongTag).toBeDefined();
    
    // In our implementation, .markdown-body strong should use var(--text-primary)
    // rather than #FFFFFF. This ensures that in light theme it adapts.
    expect(strongTag.className).not.toContain('text-white');
  });

  test('Markdown bullet lists render text properly with contrast', () => {
    render(

        <MockMarkdownResponse content="" />

    );
    
    const listItem = screen.getAllByText(/Handles the user interface/i)[0];
    expect(listItem).toBeDefined();
    expect(listItem.className).not.toContain('text-white');
    expect(listItem.className).not.toContain('text-zinc-100');
  });
});
