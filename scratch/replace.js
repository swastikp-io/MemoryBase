import fs from 'fs';

const files = [
  'src/pages/LandingPage.tsx',
  'src/pages/DocsPage.tsx',
  'src/components/landing/VoiceCommandsSection.tsx'
];

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  content = content.replace(/bg-\[#121110\]/g, 'bg-[var(--background)]');
  content = content.replace(/bg-\[#161514\]/g, 'bg-[var(--surfaceSecondary)]');
  content = content.replace(/bg-\[#181716\]/g, 'bg-[var(--surfaceSecondary)]');
  content = content.replace(/bg-\[#050505\]/g, 'bg-[var(--surfaceSecondary)]');
  content = content.replace(/bg-\[#0a0a0a\]/g, 'bg-[var(--surface)]');
  content = content.replace(/bg-\[#2a2928\]/g, 'bg-[var(--surfaceSecondary)]');
  content = content.replace(/bg-\[#222\]/g, 'bg-[var(--surfaceSecondary)]');
  content = content.replace(/bg-\[#353433\]/g, 'bg-[var(--surface)]');
  
  content = content.replace(/text-white\/60/g, 'text-[var(--textSecondary)]');
  content = content.replace(/text-white\/70/g, 'text-[var(--textSecondary)]');
  content = content.replace(/text-white\/80/g, 'text-[var(--textSecondary)]');
  content = content.replace(/text-white\/40/g, 'text-[var(--textTertiary)]');
  content = content.replace(/text-white\/20/g, 'text-[var(--textTertiary)]');
  content = content.replace(/text-white\/0/g, 'text-transparent');
  content = content.replace(/text-white/g, 'text-[var(--textPrimary)]');
  content = content.replace(/text-black/g, 'text-[var(--background)]');
  
  content = content.replace(/hover:text-white/g, 'hover:text-[var(--textPrimary)]');
  content = content.replace(/selection:bg-white/g, 'selection:bg-[var(--textPrimary)]');
  content = content.replace(/selection:text-black/g, 'selection:text-[var(--background)]');
  
  content = content.replace(/bg-white\/10/g, 'bg-[var(--surfaceSecondary)]');
  content = content.replace(/bg-white\/5/g, 'bg-[var(--surfaceSecondary)]');
  content = content.replace(/bg-white\/20/g, 'bg-[var(--surfaceSecondary)]');
  content = content.replace(/bg-white/g, 'bg-[var(--textPrimary)]');
  
  content = content.replace(/border-white\/10/g, 'border-[var(--border)]');
  content = content.replace(/border-white\/20/g, 'border-[var(--border)]');
  content = content.replace(/border-white\/5/g, 'border-[var(--border)]');
  content = content.replace(/border-white\/\[0\.05\]/g, 'border-[var(--border)]');
  
  fs.writeFileSync(f, content);
});
