import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Process base64 in chunks to prevent memory issues
function processBase64Chunks(base64String: string, chunkSize = 32768) {
  const chunks: Uint8Array[] = [];
  let position = 0;
  
  while (position < base64String.length) {
    const chunk = base64String.slice(position, position + chunkSize);
    const binaryChunk = atob(chunk);
    const bytes = new Uint8Array(binaryChunk.length);
    
    for (let i = 0; i < binaryChunk.length; i++) {
      bytes[i] = binaryChunk.charCodeAt(i);
    }
    
    chunks.push(bytes);
    position += chunkSize;
  }

  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { audio } = await req.json();
    
    if (!audio) {
      throw new Error('No audio data provided');
    }

    console.log('Processing audio transcription request...');

    // For demo purposes, return a mock transcription
    // In production, you would integrate with OpenAI Whisper or similar service
    const mockTranscript = `
Thank you for taking the time to speak with me today. I understand you're looking for a solution to help streamline your sales process. 

Based on our conversation, it sounds like your current process involves a lot of manual work and you're looking to automate some of these qualification steps. You mentioned having a budget of around $10,000 per month and wanting to implement something within the next quarter.

You also indicated that the decision would involve yourself and the VP of Sales, and that solving this problem is quite urgent for your team - you rated it as an 8 out of 10 in terms of priority.

The main pain points you're experiencing seem to be around lead qualification taking too much time and not having consistent scoring across your sales team. You mentioned looking at a couple of other solutions but haven't made a decision yet.

Overall, it sounds like there's a strong need and good timing for a solution like ours.
    `.trim();

    return new Response(
      JSON.stringify({ text: mockTranscript }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in transcribe-audio function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});