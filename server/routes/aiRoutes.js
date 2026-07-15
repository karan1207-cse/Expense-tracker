const express = require('express');
const router = express.Router();
const multer = require('multer');
const aiController = require('../controllers/aiController');

// Multer setup to store files in memory for OCR scanning
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Routes
router.post('/parse-expense', aiController.parseExpense);
router.post('/chat', aiController.chat);
router.post('/monthly-summary', aiController.monthlySummary);
router.post('/savings-recommendations', aiController.savingsRecommendations);
router.post('/scan-receipt', upload.single('receipt'), aiController.scanReceipt);
router.post('/predict', aiController.predictSpending);
router.post('/detect-anomaly', aiController.detectAnomaly);

module.exports = router;
