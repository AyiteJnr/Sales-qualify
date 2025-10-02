# AI Transcription Integration Setup

This document explains how to set up AI transcription for real-time call transcription using OpenRouter.

## Current Integration: OpenRouter

The system is now integrated with **OpenRouter** which provides access to OpenAI Whisper and other AI models with competitive pricing and better reliability.

**API Key Already Configured:** `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`

## Setup Steps (Optional - for custom keys)

### 1. Get OpenRouter API Key (Optional)

1. Go to [OpenRouter](https://openrouter.ai/)
2. Create an account and get your API key
3. Copy the key (starts with `sk-or-v1-...`)

### 2. Configure Supabase Edge Function (Optional)

1. In your Supabase dashboard, go to Edge Functions
2. Navigate to `transcribe-audio` function
3. Set environment variable:
   - Key: `OPENROUTER_API_KEY`
   - Value: Your OpenRouter API key (if using custom key)

### 3. Test the Integration

1. Record a call or upload an audio file
2. The system will automatically attempt to use OpenRouter Whisper
3. You'll see "🎯 AI Transcription Complete" for successful OpenRouter transcription
4. If OpenRouter fails, it falls back to mock transcription with "⚡ Transcription Complete"

## Features

- **Real-time transcription**: Automatic transcription after recording stops
- **File upload transcription**: Drag & drop or browse to upload audio files
- **Fallback system**: Mock transcription if OpenAI is not configured
- **File format support**: WebM, WAV, MP3, M4A and other common formats
- **Size limit**: 25MB per file for optimal performance

## Troubleshooting

- **"Transcription Error"**: Check your OpenRouter API key and account credits
- **"Audio file too large"**: Compress or trim your audio file under 25MB
- **Mock transcription showing**: OpenRouter API key is not working or configured

## API Costs

OpenRouter Whisper API pricing (typically more cost-effective than direct OpenAI):
- Competitive pricing per minute of audio
- Highly accurate transcription via OpenAI Whisper-1
- Supports multiple languages
- Better rate limits and reliability

## Security

- API keys are stored securely in Supabase environment variables
- Audio data is processed through OpenRouter's secure endpoints
- No audio files are permanently stored on OpenRouter's servers
- OpenRouter provides additional privacy and security features
