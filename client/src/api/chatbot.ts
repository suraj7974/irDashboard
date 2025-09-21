import { ChatbotResponse } from '../services/chatbotService';

export class ChatbotAPI {
  private static readonly API_ENDPOINT = import.meta.env.VITE_PARSER_API_URL || "http://localhost:8000";

  /**
   * Send query to backend chatbot service
   */
  static async sendQuery(query: string): Promise<ChatbotResponse> {
    try {
      const response = await fetch(`${this.API_ENDPOINT}/chatbot/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Unknown API error');
      }

      return {
        response: data.response,
        sources: data.sources || [],
        intent: data.intent
      };

    } catch (error) {
      console.error('Chatbot API error:', error);
      throw new Error(`Failed to get response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get health status of chatbot service
   */
  static async getHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.API_ENDPOINT}/health`);
      return response.ok;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }
}