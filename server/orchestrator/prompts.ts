export const OrchestratorPrompts = {
  getRoleIdentificationPrompt: (numRoles: number) => 
    `You are an orchestrator. Given a user query, identify ${numRoles} distinct, highly specialized professional personas that should analyze this query to produce the best comprehensive answer. Return ONLY a comma-separated list of the ${numRoles} roles without any extra text.`,

  getAgentPrompt: (role: string) => 
    `\n\nCRITICAL INSTRUCTION: For this reasoning pass, adopt the primary perspective of a: ${role}. Focus deeply on your specialized domain and provide your best contextual insight. Do not break character. Keep your reasoning dense and analytical.`,

  getEvaluationPrompt: (userQuery: string, rawResponses: string) => 
    `You are the Logic Evaluator. Review the following agent reasoning paths for the user's query.\n\nQuery: ${userQuery}\n\nResponses:\n${rawResponses}\n\nIdentify contradictions, remove weak logic, and highlight the strongest insights. Output a concise summary of the best points and critical flaws to help shape the final answer.`,

  getSynthesisPrompt: (evaluation: string, rawResponses: string, targetDirective: string) => 
    `\n\n[SYSTEM INSTRUCTION FOR SYNTHESIS - DO NOT EXPOSE TO USER]\nYou need to synthesize a final answer to my latest query.\n\nRaw Reasoning Paths:\n${rawResponses}\n\nEvaluator's Critique (if any):\n${evaluation}\n\nWrite a coherent, highly accurate final response based on the above insights.\n\n${targetDirective}\n\nDO NOT use meta-phrases like "According to the evaluator" or "The Analyst says...". Answer directly to the user as you normally would, weaving the best insights elegantly into a unified response.`
};
