export function formatDuration(ms: number | undefined): string {
  if (ms === undefined || ms < 0) return "0ms";
  
  if (ms < 1000) {
    return `${ms}ms`;
  }
  
  const seconds = ms / 1000;
  if (seconds < 60) {
    // If it's a whole number or close to it, don't show decimals
    if (Math.abs(seconds - Math.round(seconds)) < 0.1) {
      return `${Math.round(seconds)}s`;
    }
    return `${seconds.toFixed(1)}s`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  
  if (remainingSeconds === 0) {
    return `${minutes}m`;
  }
  
  return `${minutes}m ${remainingSeconds}s`;
}
