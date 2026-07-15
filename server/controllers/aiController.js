const { GoogleGenAI } = require('@google/genai');
const Tesseract = require('tesseract.js');
const axios = require('axios');

// Initialize Gemini API client if key is present
const getGenAIClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Gemini API key is not configured. Please add GEMINI_API_KEY in server/.env');
  }
  return new GoogleGenAI({ apiKey });
};

// 1. Natural Language Expense Parser
exports.parseExpense = async (req, res) => {
  const { text, currentDate } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'Text field is required' });
  }

  try {
    const ai = getGenAIClient();
    const today = currentDate || new Date().toISOString().split('T')[0];

    const prompt = `You are a financial parsing assistant. Extract expense details from the following raw text:
"${text}"

Extract the following fields and return them strictly in JSON format:
- "title": a concise description or merchant name (e.g. "Pizza Hut", "Uber ride", "Electricity Bill", "Nike Shoes")
- "amount": the cost as a number (e.g. 450, 1500)
- "category": classify into exactly one of: "Food", "Transport", "Bills", "Entertainment", "Travel", "Other"
- "date": the date of the expense formatted as "YYYY-MM-DD". Assume today is "${today}". Interpret relative terms like "yesterday", "today", "last night", "two days ago" relative to "${today}". If no date is mentioned, use "${today}".
- "notes": any additional details, or an empty string.

Response format MUST be a single JSON object. Do not wrap in markdown or backticks. Example output:
{"title": "Dominos", "amount": 450, "category": "Food", "date": "2026-07-14", "notes": ""}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const parsedJson = JSON.parse(response.text.trim());
    return res.json(parsedJson);
  } catch (error) {
    console.error('Error parsing expense text:', error);
    return res.status(500).json({
      error: 'Failed to parse expense using AI',
      details: error.message
    });
  }
};

// 2. Chatbot Assistant
exports.chat = async (req, res) => {
  const { message, history, expenses } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Message field is required' });
  }

  try {
    const ai = getGenAIClient();

    // Format expenses for context
    const expenseContext = expenses && expenses.length > 0
      ? expenses.map(e => `- Title: ${e.title}, Amount: ₹${e.amount}, Category: ${e.category}, Date: ${e.date}, Payment: ${e.paymentType}, Notes: ${e.notes || ''}`).join('\n')
      : 'No expense records found.';

    const systemPrompt = `You are a helpful, professional, and friendly Personal Finance Assistant Chatbot.
You have access to the user's expense transaction list below. Analyze this data to answer the user's queries accurately, compare months, identify trends, locate largest expenses, and give practical saving tips.

User's Expense Data:
${expenseContext}

Today is ${new Date().toISOString().split('T')[0]}.
Keep your responses concise, clear, and formatted nicely in markdown. Do not hallucinate transactions that do not exist. If they ask about information not in their data (like general advice), you can answer but ground personal financial assertions in their actual data.`;

    // Map history to the format expected by the SDK
    const contents = [];
    if (history && Array.isArray(history)) {
      history.forEach(h => {
        contents.push({
          role: h.role === 'user' ? 'user' : 'model',
          parts: [{ text: h.content }]
        });
      });
    }
    
    // Add system instruction as part of context or system prompt
    // In @google/genai, systemInstruction is specified in config
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: [...contents, { role: 'user', parts: [{ text: message }] }],
      config: {
        systemInstruction: systemPrompt
      }
    });

    return res.json({ response: response.text });
  } catch (error) {
    console.error('Chat error:', error);
    return res.status(500).json({
      error: 'Failed to process chat message',
      details: error.message
    });
  }
};

// 3. Monthly Financial Summary
exports.monthlySummary = async (req, res) => {
  const { expenses, budget } = req.body;
  if (!expenses) {
    return res.status(400).json({ error: 'Expenses data is required' });
  }

  try {
    const ai = getGenAIClient();

    // Format data for AI
    const expenseDataStr = expenses.map(e => `${e.date} | ${e.title} | ₹${e.amount} | ${e.category}`).join('\n');

    const prompt = `You are a financial analyst. Provide a high-level monthly financial summary.
The user's monthly budget is ₹${budget || 0}.
Here are the user's transactions:
${expenseDataStr}

Generate a concise monthly report. Include:
1. **Total Expenses** and percentage of budget used.
2. **Category-wise Breakdown** with percentages.
3. **Highest Expense** item.
4. **Key Spending Trends** (e.g. major categories, timing).
5. **Personalized Savings Suggestions** (at least 3 specific recommendations based on their data).

Format the output strictly in clean markdown. Keep it visual and engaging using bullet points, bold text, and a professional tone.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: prompt
    });

    return res.json({ summary: response.text });
  } catch (error) {
    console.error('Summary generation error:', error);
    return res.status(500).json({
      error: 'Failed to generate financial summary',
      details: error.message
    });
  }
};

// 4. Smart Savings Recommendations
exports.savingsRecommendations = async (req, res) => {
  const { expenses } = req.body;
  if (!expenses) {
    return res.status(400).json({ error: 'Expenses data is required' });
  }

  try {
    const ai = getGenAIClient();

    const expenseDataStr = expenses.map(e => `${e.date} | ${e.title} | ₹${e.amount} | ${e.category}`).join('\n');

    const prompt = `You are a smart financial advisor. Analyze the following expense records:
${expenseDataStr}

Create 3-5 specific, actionable savings recommendations based on their actual spending patterns.
For example:
- "Discretionary spending on Restaurant food has increased. You can save approximately ₹2500 by cooking at home more."
- "Your Travel costs (Uber/Ola) are higher than average. Try using public transit to cut back."
- "You spent ₹XXXX on Bills. Consider reviewing subscription plans."

Output your response in a JSON list format:
[
  {
    "title": "Short title (e.g. Reduce Dining Out)",
    "recommendation": "Detailed recommendation text with specific figures if possible",
    "impact": "High / Medium / Low"
  }
]

Provide ONLY the raw JSON list. Do not include markdown wraps.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const recommendations = JSON.parse(response.text.trim());
    return res.json({ recommendations });
  } catch (error) {
    console.error('Recommendations error:', error);
    return res.status(500).json({
      error: 'Failed to generate savings recommendations',
      details: error.message
    });
  }
};

// 5. OCR Receipt Scanner
exports.scanReceipt = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image file uploaded' });
  }

  try {
    // 1. Run local Tesseract OCR on the buffer
    const { data: { text } } = await Tesseract.recognize(
      req.file.buffer,
      'eng',
      { logger: m => console.log('Tesseract OCR status:', m.status, `${(m.progress * 100).toFixed(0)}%`) }
    );

    console.log('Extracted OCR Text:', text);

    if (!text || text.trim().length === 0) {
      return res.status(422).json({ error: 'OCR could not read any text from this image. Please upload a clearer receipt.' });
    }

    // 2. Send OCR text to Gemini to parse details
    const ai = getGenAIClient();
    const today = new Date().toISOString().split('T')[0];

    const prompt = `You are a financial receipt parser. Below is raw text extracted from a receipt image using OCR.
Clean up the noise and extract the transaction details.

Raw OCR Text:
"""
${text}
"""

Extract these fields and return them strictly in JSON format:
- "title": store or merchant name (e.g., "McDonald's", "D-Mart", "Zara")
- "amount": total purchase cost as a number (e.g., 850.50). Make sure to extract the total sum correctly.
- "category": classify into: "Food", "Transport", "Bills", "Entertainment", "Travel", "Other"
- "date": the receipt transaction date formatted as "YYYY-MM-DD". If not found or unclear, use today's date "${today}".
- "notes": brief notes (e.g., list of items bought if visible in OCR text, or empty string).

Response format must be a single JSON object. Do not include markdown code block wraps. Example output:
{"title": "Dmart", "amount": 1200.00, "category": "Food", "date": "2026-07-12", "notes": "Milk, bread, snacks"}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const parsedData = JSON.parse(response.text.trim());
    return res.json(parsedData);
  } catch (error) {
    console.error('Error scanning receipt:', error);
    return res.status(500).json({
      error: 'Failed to process receipt image',
      details: error.message
    });
  }
};

// 6. ML Spending Predictions Proxy
exports.predictSpending = async (req, res) => {
  const { expenses } = req.body;
  if (!expenses) {
    return res.status(400).json({ error: 'Expenses data is required' });
  }

  try {
    const pythonServiceUrl = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';
    const response = await axios.post(`${pythonServiceUrl}/predict`, { expenses });
    return res.json(response.data);
  } catch (error) {
    console.error('ML predictions proxy error:', error.message);
    // Return a mocked/fallback prediction if the python microservice is offline or throws an error
    console.log('Falling back to rule-based prediction calculations...');
    
    // Simple fallback prediction logic: average daily spending * days
    const totalDays = expenses.length > 1 
      ? Math.max(1, (new Date(expenses[0].date) - new Date(expenses[expenses.length - 1].date)) / (1000 * 60 * 60 * 24))
      : 1;
    const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);
    const avgDaily = totalAmount / totalDays;
    
    return res.json({
      next_week_predicted: Math.round(avgDaily * 7),
      next_month_predicted: Math.round(avgDaily * 30),
      expected_monthly_savings: 0,
      is_fallback: true,
      message: 'Python service unavailable. Using simple average calculation.'
    });
  }
};

// 7. ML Anomaly Detection Proxy
exports.detectAnomaly = async (req, res) => {
  const { expenses, newExpense } = req.body;
  if (!expenses || !newExpense) {
    return res.status(400).json({ error: 'Expenses list and newExpense details are required' });
  }

  try {
    const pythonServiceUrl = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';
    const response = await axios.post(`${pythonServiceUrl}/detect-anomaly`, { expenses, newExpense });
    return res.json(response.data);
  } catch (error) {
    console.error('ML anomaly detection proxy error:', error.message);
    // Return a simple rule-based fallback check (e.g. check if amount > 3x average of category)
    const categoryExpenses = expenses.filter(e => e.category === newExpense.category);
    if (categoryExpenses.length >= 3) {
      const avg = categoryExpenses.reduce((sum, e) => sum + e.amount, 0) / categoryExpenses.length;
      if (newExpense.amount > avg * 3) {
        return res.json({
          is_anomaly: true,
          message: `This expense is significantly higher than your average ${newExpense.category} spending (Average: ₹${Math.round(avg)}).`
        });
      }
    }
    return res.json({ is_anomaly: false, message: '' });
  }
};
