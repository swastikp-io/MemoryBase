import loudness from 'loudness';

export class SystemAudioAgent {
  async adjustVolume(params: { operation: "increase" | "decrease", percentage: number }): Promise<{ success: boolean; message: string; newVolume?: number }> {
    const { operation, percentage } = params;

    if (typeof percentage !== 'number' || isNaN(percentage) || percentage < 1 || percentage > 100) {
      return { success: false, message: "Please specify a percentage between 1 and 100." };
    }
    
    try {
      const currentVolume = await loudness.getVolume();
      let newVolume = currentVolume;

      if (operation === "increase") {
        newVolume = Math.round(currentVolume * (1 + (percentage / 100)));
      } else {
        newVolume = Math.round(currentVolume * (1 - (percentage / 100)));
      }
      
      if (newVolume < 0) newVolume = 0;
      if (newVolume > 100) newVolume = 100;
      
      try {
        await loudness.setVolume(newVolume);
        const actionText = operation === "increase" ? "increased" : "lowered";
        return { 
          success: true, 
          message: `Volume ${actionText} by ${percentage} percent. Current volume is ${newVolume} percent.`,
          newVolume 
        };
      } catch (err) {
        console.error("Failed to set volume:", err);
        return { success: false, message: "I couldn't adjust the system volume." };
      }
    } catch (err) {
      console.error("Failed to get volume:", err);
      return { success: false, message: "I couldn't access the system volume settings." };
    }
  }

  async getVolume(): Promise<{ success: boolean; volume?: number; message?: string }> {
    try {
      const vol = await loudness.getVolume();
      return { success: true, volume: vol };
    } catch (err) {
      console.error("Failed to get volume:", err);
      return { success: false, message: "I couldn't access the system volume settings." };
    }
  }

  async setVolume(volume: number): Promise<{ success: boolean; message?: string }> {
    if (typeof volume !== 'number' || isNaN(volume) || volume < 0 || volume > 100) {
      return { success: false, message: "Invalid volume level." };
    }
    try {
      await loudness.setVolume(volume);
      return { success: true };
    } catch (err) {
      console.error("Failed to set volume:", err);
      return { success: false, message: "I couldn't adjust the system volume." };
    }
  }
}
