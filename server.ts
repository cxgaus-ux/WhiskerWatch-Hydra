import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '15mb' }));

  // Health & Isolation Verification Endpoint
  app.get('/api/environment', (_req, res) => {
    res.json({
      application: 'WhiskerWatch Hydra',
      sanctuaryRegion: 'Hydra Island, Saronic Gulf, Greece',
      isolatedInstance: true,
      koiladaConnection: 'NONE (Zero-Link Isolated Architecture)',
    });
  });

  // WhiskerWatch AI Vision & Triage Endpoint
  app.post('/api/ai/analyze-cat', async (req, res) => {
    try {
      const { imageBase64, mimeType, fieldNotes, zone, existingCats } = req.body;

      const existingRosterText = Array.isArray(existingCats) && existingCats.length > 0
        ? existingCats
            .map(
              (c: { name?: string; colonyZone?: string; coatPattern?: string; tnrStatus?: string; markingsDescription?: string }) =>
                `- ${c.name} (${c.colonyZone}): Coat=${c.coatPattern}, TNR=${c.tnrStatus}, Markings=${c.markingsDescription}`
            )
            .join('\n')
        : 'No cats registered in this caretaker roster yet.';

      const promptText = `You are the WhiskerWatch Hydra AI Veterinary & Feline Identification Engine for Hydra Island, Greece.
Analyze the provided feline image (if attached) and caretaker field notes to identify coat pattern, ear-tip TNR status, health triage state, and potential match against the Hydra colony roster.

Target Hydra Zone: ${zone || 'Hydra Port'}
Caretaker Field Notes: ${fieldNotes || 'Visual inspection requested.'}

Registered Hydra Colony Roster:
${existingRosterText}

Return a structured JSON assessment matching the required schema.`;

      const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];

      if (imageBase64 && typeof imageBase64 === 'string') {
        const cleanBase64 = imageBase64.includes(',')
          ? imageBase64.split(',')[1]
          : imageBase64;
        parts.push({
          inlineData: {
            mimeType: mimeType || 'image/jpeg',
            data: cleanBase64,
          },
        });
      }
      parts.push({ text: promptText });

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: { parts },
        config: {
          systemInstruction:
            'You are a veterinary triage and feline colony biometric assistant operating exclusively for WhiskerWatch Hydra on Hydra Island, Greece. Be concise, medically grounded, and accurate with TNR ear-tip recognition.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              coatPattern: {
                type: Type.STRING,
                description: 'Detected coat color and pattern (max 70 chars).',
              },
              estimatedAge: {
                type: Type.STRING,
                description: 'Estimated age bracket e.g. ~2 years, ~6 months (max 35 chars).',
              },
              sexGuess: {
                type: Type.STRING,
                description: 'Must be one of: Female, Male, Unknown',
              },
              earTipDetected: {
                type: Type.BOOLEAN,
                description: 'Whether a surgical TNR ear-tip is visible or indicated.',
              },
              recommendedTnrStatus: {
                type: Type.STRING,
                description:
                  'Must be one of: Sterilized (Ear-Tipped), Intact - Priority TNR, Kitten - Underage, Scheduled',
              },
              recommendedHealthStatus: {
                type: Type.STRING,
                description:
                  'Must be one of: Healthy, Monitor, Needs Vet Care, In Treatment',
              },
              markingsSummary: {
                type: Type.STRING,
                description: 'Distinguishing markings, facial blaze, socks, tail, and ear profile (max 450 chars).',
              },
              triageAssessment: {
                type: Type.STRING,
                description: 'Veterinary triage assessment and recommended care action (max 500 chars).',
              },
              matchedCatName: {
                type: Type.STRING,
                description: 'Closest matching cat name from the Hydra roster, or "New Unregistered Cat".',
              },
              matchConfidence: {
                type: Type.INTEGER,
                description: 'Confidence score from 0 to 100.',
              },
            },
            required: [
              'coatPattern',
              'estimatedAge',
              'sexGuess',
              'earTipDetected',
              'recommendedTnrStatus',
              'recommendedHealthStatus',
              'markingsSummary',
              'triageAssessment',
              'matchedCatName',
              'matchConfidence',
            ],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      res.json(parsed);
    } catch (error) {
      console.error('WhiskerWatch Hydra AI Analysis Error:', error);
      res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : 'Failed to run WhiskerWatch AI analysis.',
      });
    }
  });

  // WhiskerWatch Hydra Colony Operations Briefing Endpoint
  app.post('/api/ai/colony-briefing', async (req, res) => {
    try {
      const { cats, sightings, stations } = req.body;

      const summaryPrompt = `Generate an operational field briefing for WhiskerWatch Hydra based on current live data from our isolated Hydra Island database:
- Total Registered Cats: ${Array.isArray(cats) ? cats.length : 0}
- Recent Sightings Logged: ${Array.isArray(sightings) ? sightings.length : 0}
- Active Feeding Stations: ${Array.isArray(stations) ? stations.length : 0}

Cats Data: ${JSON.stringify((cats || []).slice(0, 15))}
Stations Data: ${JSON.stringify((stations || []).slice(0, 10))}

Provide a concise operational briefing with TNR priorities, veterinary attention alerts, and feeding station logistics across Hydra Port, Kamini Harbor, Vlychos, Kaminia, Kiafa, and Mandraki.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: summaryPrompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              headline: {
                type: Type.STRING,
                description: 'Single-sentence operational status headline for Hydra Island.',
              },
              tnrPriorities: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '2-3 specific TNR sterilization priorities by Hydra zone.',
              },
              medicalWatchlist: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '2-3 specific medical triage follow-ups.',
              },
              supplyActions: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '2-3 feeding & fresh water station refill actions.',
              },
            },
            required: ['headline', 'tnrPriorities', 'medicalWatchlist', 'supplyActions'],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      res.json(parsed);
    } catch (error) {
      console.error('WhiskerWatch Hydra Briefing Error:', error);
      res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : 'Failed to generate Hydra colony briefing.',
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`WhiskerWatch Hydra server listening on http://localhost:${PORT}`);
  });
}

startServer();
