import React, { useState } from 'react';
import { parseExpenseAI } from '../services/api';
import VoiceEntry from './VoiceEntry';
import './NaturalLanguageEntry.css';

export default function NaturalLanguageEntry({ onParsed, disabled }) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!text.trim() || loading) return;

    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const parsedData = await parseExpenseAI(text.trim(), today);
      onParsed(parsedData);
      setText('');
    } catch (error) {
      console.error('NLP Parse error:', error);
      alert('Failed to parse text. Please write in format like: "Spent 450 on food yesterday" or make sure the server is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleVoiceTranscript = (transcript) => {
    setText(transcript);
    // Automatically parse the speech input
    // We delay slightly to let the user see their speech populate the input first
    setTimeout(() => {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];
      parseExpenseAI(transcript, today)
        .then(parsedData => {
          onParsed(parsedData);
          setText('');
        })
        .catch(err => {
          console.error(err);
          alert('Failed to parse speech. Try typing instead.');
        })
        .finally(() => setLoading(false));
    }, 800);
  };

  return (
    <div className="nlp-entry-container">
      <div className="nlp-card-header">
        <h4>AI Quick Add</h4>
        <p>Type or speak your transaction details to auto-fill the form below.</p>
      </div>
      
      <form onSubmit={handleSubmit} className="nlp-form-row">
        <div className="nlp-input-wrapper">
          <input
            type="text"
            placeholder='e.g., "Paid 1500 for electricity bill yesterday"'
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={disabled || loading}
            className="nlp-input"
          />
          <VoiceEntry onTranscript={handleVoiceTranscript} disabled={disabled || loading} />
        </div>
        <button
          type="submit"
          className="nlp-submit-btn"
          disabled={disabled || loading || !text.trim()}
        >
          {loading ? (
            <div className="spinner-mini"></div>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Quick Add
            </>
          )}
        </button>
      </form>
    </div>
  );
}
