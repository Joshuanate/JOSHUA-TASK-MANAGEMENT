import { GoogleGenAI } from "@google/genai";
import { Project, Task } from "../types";

const getAI = () => {
    // In a real production app, this key would be managed differently.
    // Assuming process.env.API_KEY is available as per instructions.
    if (!process.env.API_KEY) {
        console.warn("Gemini API Key missing");
        return null;
    }
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const generateTaskBreakdown = async (project: Project): Promise<string> => {
    const ai = getAI();
    if (!ai) return "API Key not configured.";

    const prompt = `
    You are an expert project manager. I need to break down the following project into actionable tasks.
    
    Project: ${project.ProjectName}
    Goal (Success Definition): ${project.SuccessDefinition}
    Why it matters: ${project.WhyThisMatters}
    deadline: ${project.Deadline}

    Rules for tasks:
    1. Maximum 90 minutes per task.
    2. Must be specific, not vague.
    3. Suggest a priority (1-5) and Energy level (Low, Medium, High).

    Output a plain text list of suggested tasks I can copy/paste.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return response.text || "No response generated.";
    } catch (error) {
        console.error("AI Error", error);
        return "Failed to generate tasks. Check your internet or API key.";
    }
};

export const diagnoseBlockedTask = async (task: Task, project?: Project): Promise<string> => {
    const ai = getAI();
    if (!ai) return "API Key not configured.";

    const prompt = `
    I am blocked on a task and need an execution coach to help me move forward.

    Task: ${task.TaskName}
    Estimated Time: ${task.EstimatedTime} mins
    Notes: ${task.Notes}
    ${project ? `Part of Project: ${project.ProjectName} (${project.SuccessDefinition})` : ''}

    Provide 3 specific strategies to unblock this. Keep it brief and ruthless.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return response.text || "No response generated.";
    } catch (error) {
         console.error("AI Error", error);
         return "Failed to diagnose task.";
    }
};
