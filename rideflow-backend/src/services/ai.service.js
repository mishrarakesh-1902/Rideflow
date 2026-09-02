const dns = require('dns');
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}
const { GoogleGenAI } = require('@google/genai');
const { toolDefinitions, executeTool } = require('./copilotTools');

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const SYSTEM_PROMPT = `You are RideFlow's AI support assistant and booking agent. You assist both riders and drivers.

Key Guidelines:
- Answer ONLY the user's latest question directly and concisely (1-3 sentences).
- Do NOT repeat, re-state, or re-summarize previous answers from earlier turns.
- For Profile / Account queries (name, email, phone number, role): use the 'get_my_profile' tool.
- For Riders: help check bookings, cancel rides, and book new rides using 'book_ride'.
- For Drivers: help check assigned rides, earnings, stats using 'get_driver_stats', and accept incoming requests using 'accept_incoming_ride'.
- Never guess fares, statuses, or profile details — always call a tool to get real data first.
- Amounts in the database are in paise; always convert to rupees (divide by 100) when talking to the user.`;

async function runCopilot({
  userMessage,
  userId,
  conversationHistory = [],
}) {
  // Clean incoming history to ensure well-formed turns
  const sanitizedHistory = (conversationHistory || [])
    .filter((msg) => msg && (msg.role === 'user' || msg.role === 'model') && Array.isArray(msg.parts) && msg.parts.length > 0)
    .slice(-8);

  const messages = [
    ...sanitizedHistory,
    {
      role: 'user',
      parts: [{ text: userMessage }],
    },
  ];

  const tools = [
    {
      functionDeclarations: [
        {
          name: 'get_my_profile',
          description: "Get the authenticated user's profile details (name, email, phone number, role, vehicle, rating).",
        },
        {
          name: 'get_my_bookings',
          description: "Get the current user's (rider or driver) recent ride bookings, including status, route, and fare.",
        },
        {
          name: 'get_booking',
          description: 'Get full details of one specific booking by its ID (status, fare, driver, rider, pickup, destination, OTP status).',
          parameters: {
            type: 'OBJECT',
            properties: {
              bookingId: {
                type: 'STRING',
                description: "The booking's MongoDB ObjectId",
              },
            },
            required: ['bookingId'],
          },
        },
        {
          name: 'get_driver_stats',
          description: "Get the driver's earnings, completed ride count, ratings, vehicle details, and active ride status.",
        },
        {
          name: 'accept_incoming_ride',
          description: "Accept an incoming requested ride on behalf of the driver.",
          parameters: {
            type: 'OBJECT',
            properties: {
              bookingId: {
                type: 'STRING',
                description: "Optional booking ID to accept.",
              },
            },
            required: [],
          },
        },
        {
          name: 'cancel_booking',
          description: 'Cancel a booking. Only works if the ride has not already started or completed.',
          parameters: {
            type: 'OBJECT',
            properties: {
              bookingId: {
                type: 'STRING',
                description: "The booking's MongoDB ObjectId",
              },
            },
            required: ['bookingId'],
          },
        },
        {
          name: 'book_ride',
          description: 'Book/request a new ride by providing pickup and destination address or landmark name.',
          parameters: {
            type: 'OBJECT',
            properties: {
              pickupAddress: {
                type: 'STRING',
                description: 'The pickup location or landmark name',
              },
              destinationAddress: {
                type: 'STRING',
                description: 'The drop-off destination or landmark name',
              },
              rideType: {
                type: 'STRING',
                description: "Type of ride: 'economy', 'standard', or 'premium'. Default is 'standard'.",
              },
              paymentMethod: {
                type: 'STRING',
                description: "Payment method: 'cash' or 'online'. Default is 'cash'.",
              },
            },
            required: ['pickupAddress', 'destinationAddress'],
          },
        },
      ],
    },
  ];

  // Safety valve: max 5 turns
  for (let turn = 0; turn < 5; turn++) {
    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
      contents: messages,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        tools,
      },
    });

    const functionCalls = response.functionCalls || [];

    if (functionCalls.length === 0) {
      const replyText = response.text || '';
      // Ensure the final assistant response text is properly recorded in messages
      if (replyText) {
        messages.push({
          role: 'model',
          parts: [{ text: replyText }],
        });
      }
      return {
        reply: replyText,
        history: messages,
      };
    }

    // Preserve the model's message content
    if (response.candidates && response.candidates[0]?.content) {
      messages.push(response.candidates[0].content);
    } else {
      messages.push({
        role: 'model',
        parts: functionCalls.map((call) => ({
          functionCall: {
            name: call.name,
            args: call.args || {},
          },
        })),
      });
    }

    const toolResults = [];

    for (const call of functionCalls) {
      console.log('Copilot tool call:', {
        tool: call.name,
        args: call.args,
        userId,
      });

      const result = await executeTool(
        call.name,
        call.args || {},
        userId
      );

      toolResults.push({
        functionResponse: {
          name: call.name,
          ...(call.id ? { id: call.id } : {}),
          response:
            typeof result === 'object' && result !== null && !Array.isArray(result)
              ? result
              : { result },
        },
      });
    }

    messages.push({
      role: 'user',
      parts: toolResults,
    });
  }

  return {
    reply: 'Sorry, I had trouble processing that. Please try again.',
    history: messages,
  };
}

module.exports = { runCopilot };
