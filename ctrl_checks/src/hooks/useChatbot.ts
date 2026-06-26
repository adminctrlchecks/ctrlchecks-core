import { awsClient } from "@/integrations/aws/client";
import { ENDPOINTS } from "@/config/endpoints";

export interface ChatbotResponse {
  content: string;
  suggestions?: string[];
  escalation?: boolean;
}

/**
 * Ask the chatbot a question via the backend API
 * Tries the new AI gateway endpoint first, falls back to legacy endpoint
 */
export async function askChatbot(message: string): Promise<ChatbotResponse> {
  const baseUrl = ENDPOINTS.itemBackend;
  const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // Try endpoints in order: new AI gateway, then legacy
  const endpoints = [
    `${baseUrl}/api/ai/chatbot/message`,  // New AI gateway endpoint
    `${baseUrl}/chatbot`,                  // Legacy endpoint
    `${baseUrl}/api/chatbot`,              // Alternative legacy endpoint
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`🤖 Sending message to chatbot at: ${endpoint}`);
      console.log(`📝 Message: ${message.substring(0, 50)}...`);

      const requestBody = endpoint.includes('/api/ai/chatbot') 
        ? { sessionId, message, context: {} }  // New endpoint format
        : { message };                          // Legacy endpoint format

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`⚠️ Endpoint ${endpoint} returned ${response.status}: ${errorText}`);
        
        // If it's a 404, try next endpoint
        if (response.status === 404 && endpoints.indexOf(endpoint) < endpoints.length - 1) {
          continue;
        }
        
        const error = await response.json().catch(() => ({ error: errorText || "Chatbot request failed" }));
        throw new Error(error.error || error.message || `HTTP ${response.status}: Chatbot request failed`);
      }

      const data = await response.json();
      console.log("✅ Chatbot response received:", data);

      // Handle both response formats
      const content = data.content || data.message || data.response;
      const suggestions = data.suggestions || [];
      const escalation = data.escalation || false;

      if (!content) {
        console.error("❌ No content in response:", data);
        // Try next endpoint if available
        if (endpoints.indexOf(endpoint) < endpoints.length - 1) {
          continue;
        }
        throw new Error("Invalid response from chatbot - no content");
      }

      return {
        content,
        suggestions,
        escalation,
      };
    } catch (error) {
      console.error(`❌ Failed to use endpoint ${endpoint}:`, error);
      
      // If this is the last endpoint, return error
      if (endpoints.indexOf(endpoint) === endpoints.length - 1) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        if (errorMessage.includes("Failed to fetch") || 
            errorMessage.includes("NetworkError") ||
            errorMessage.includes("ERR_CONNECTION_REFUSED") ||
            errorMessage.includes("ERR_NAME_NOT_RESOLVED")) {
          return {
            content:
              "I'm having trouble connecting to the server right now. Please make sure the backend service is running on port 3001 and try again.",
            suggestions: ["Try again", "Check backend status"],
          };
        }

        return {
          content:
            "Sorry, I'm having trouble connecting right now. Please try again in a moment, or feel free to contact our support team at support@ctrlchecks.ai.",
          suggestions: ["Try again", "Contact support"],
        };
      }
      // Otherwise, try next endpoint
    }
  }

  // If all endpoints failed
  return {
    content:
      "Sorry, I'm having trouble connecting to the server. Please check that the backend service is running and try again.",
    suggestions: ["Try again", "Contact support"],
  };
}
