export const memoryStore = {
  addMemory: async (memory: any, accessToken: string) => {
    console.log('[MemoryStore] Mock saving memory:', memory);
    return true;
  }
};
