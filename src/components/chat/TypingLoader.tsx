import { BrailleLoader } from "../ui/braille-loader";

export function TypingLoader() {
  return (
    <div
      className="flex items-center py-2 h-8"
      aria-live="polite"
      aria-busy="true"
    >
      <BrailleLoader variant="typing" className="text-text-secondary" />
    </div>
  );
}
