import React, { useState } from 'react';
import { scanReceiptOCR } from '../services/api';
import './ReceiptScanner.css';

export default function ReceiptScanner({ onScanned, disabled }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [scanning, setScanning] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleScan = async () => {
    if (!selectedFile || scanning) return;

    setScanning(true);
    try {
      const data = await scanReceiptOCR(selectedFile);
      onScanned(data);
      alert('Receipt scanned successfully and form auto-filled!');
      // Clear scanner state
      setSelectedFile(null);
      setPreviewUrl(null);
    } catch (error) {
      console.error('Scan error:', error);
      alert(error.response?.data?.error || 'OCR scan failed. Make sure the backend server is running and receipt text is readable.');
    } finally {
      setScanning(false);
    }
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  return (
    <div className="receipt-scanner-container">
      <div className="scanner-header">
        <h4>AI Receipt Scanner</h4>
        <p>Scan a printed receipt image to extract transaction details.</p>
      </div>

      {!previewUrl ? (
        <div 
          className={`dropzone ${disabled ? 'disabled' : ''}`}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            id="receipt-file-input"
            disabled={disabled}
          />
          <label htmlFor="receipt-file-input" className="dropzone-label">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <circle cx="8.5" cy="8.5" r="1.5"></circle>
              <polyline points="21 15 16 10 5 21"></polyline>
            </svg>
            <span>Drag & drop receipt or <strong>browse files</strong></span>
            <span className="file-limits">Supports JPG, PNG, WebP (Max 5MB)</span>
          </label>
        </div>
      ) : (
        <div className="scanner-preview-area">
          <div className="preview-image-wrapper">
            <img src={previewUrl} alt="Receipt Preview" />
            {scanning && (
              <div className="scanning-overlay">
                <div className="scan-line"></div>
                <div className="scanner-spinner-wrapper">
                  <div className="spinner"></div>
                  <p>Running OCR & Extracting Data...</p>
                </div>
              </div>
            )}
          </div>
          
          <div className="preview-actions">
            <button 
              type="button" 
              className="scan-btn" 
              onClick={handleScan}
              disabled={scanning}
            >
              {scanning ? 'Processing...' : 'Scan Receipt'}
            </button>
            <button 
              type="button" 
              className="cancel-btn" 
              onClick={handleCancel}
              disabled={scanning}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
