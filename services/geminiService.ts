import { GoogleGenAI, Type } from "@google/genai";
import { ActivityType, OpportunityStatus, Opportunity } from "../types";

// Initialize the Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Analyzes text (e.g., LinkedIn message, job description) to extract structured data.
 * It determines if this relates to an existing opportunity or a new one.
 */
export const parseJobHuntInput = async (
  inputText: string,
  existingOpportunities: Opportunity[]
) => {
  // Create a summary of existing context for the AI
  const contextList = existingOpportunities.map(op => ({
    id: op.id,
    employer: op.employer,
    position: op.position,
    role: op.role
  }));

  const prompt = `
    You are an intelligent career assistant. Your goal is to parse raw text from a job hunter (like a LinkedIn message, email, or note) and convert it into structured data for a tracking log.
    
    Here is the context of the user's EXISTING Opportunities:
    ${JSON.stringify(contextList)}

    Analyze the following input text:
    "${inputText}"

    Determine:
    1. Is this a NEW opportunity or an update to an EXISTING one from the list above?
    2. Extract details for the Opportunity (Position, Employer, Role).
    3. Extract details for the Activity (Type, Date, Description, Follow-up).
    4. Extract any Contacts mentioned.

    Rules:
    - If the employer matches an existing one loosely, link it to the existing ID.
    - 'date' should be ISO 8601 format (YYYY-MM-DD). If relative (e.g., "next tuesday"), calculate it based on today: ${new Date().toISOString()}.
    - 'type' must be one of: ${Object.values(ActivityType).join(', ')}.
    - 'status' must be one of: ${Object.values(OpportunityStatus).join(', ')}.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          isNewOpportunity: { type: Type.BOOLEAN },
          opportunityMatchId: { type: Type.STRING, description: "The ID of the existing opportunity if found" },
          opportunityData: {
            type: Type.OBJECT,
            properties: {
              employer: { type: Type.STRING },
              position: { type: Type.STRING },
              role: { type: Type.STRING },
              status: { type: Type.STRING },
              description: { type: Type.STRING }
            }
          },
          activityData: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              type: { type: Type.STRING },
              date: { type: Type.STRING },
              description: { type: Type.STRING },
              followUpAction: { type: Type.STRING },
              followUpDate: { type: Type.STRING }
            }
          },
          contacts: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                role: { type: Type.STRING },
                email: { type: Type.STRING },
                company: { type: Type.STRING }
              }
            }
          },
          reasoning: { type: Type.STRING, description: "Brief explanation of why you chose this match or created new" }
        }
      }
    }
  });

  return JSON.parse(response.text || "{}");
};