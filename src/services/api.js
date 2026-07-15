import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const parseExpenseAI = async (text, currentDate) => {
  const response = await api.post('/ai/parse-expense', { text, currentDate });
  return response.data;
};

export const chatAI = async (message, history, expenses) => {
  const response = await api.post('/ai/chat', { message, history, expenses });
  return response.data;
};

export const getMonthlySummaryAI = async (expenses, budget) => {
  const response = await api.post('/ai/monthly-summary', { expenses, budget });
  return response.data;
};

export const getSavingsRecommendationsAI = async (expenses) => {
  const response = await api.post('/ai/savings-recommendations', { expenses });
  return response.data;
};

export const scanReceiptOCR = async (imageFile) => {
  const formData = new FormData();
  formData.append('receipt', imageFile);

  const response = await api.post('/ai/scan-receipt', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const getMLPredictions = async (expenses) => {
  const response = await api.post('/ai/predict', { expenses });
  return response.data;
};

export const checkAnomaly = async (expenses, newExpense) => {
  const response = await api.post('/ai/detect-anomaly', { expenses, newExpense });
  return response.data;
};

export default api;
