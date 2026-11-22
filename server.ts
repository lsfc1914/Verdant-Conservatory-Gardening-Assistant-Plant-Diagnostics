import 'dotenv/config';
import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type, Content, Part } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const app = express();

app.use(express.json({ limit: '15mb' }));

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error(
      'GEMINI_API_KEY is not configured. Please check the Settings > Secrets panel.'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function formatApiError(err: unknown): { status: number; message: string } {
  const raw = err instanceof Error ? err.message : String(err);
  if (raw.includes('GEMINI_API_KEY')) {
    return { status: 400, message: raw };
  }
  if (raw.includes('PERMISSION_DENIED') || raw.includes('API_KEY_INVALID') || raw.includes('403')) {
    return {
      status: 403,
      message:
        'The Gemini API key appears invalid or lacks permission. Please verify your key in Settings > Secrets.',
    };
  }
  if (raw.includes('RESOURCE_EXHAUSTED') || raw.includes('429')) {
    return {
      status: 429,
      message:
        'Rate limit or quota reached for the Gemini API. Please wait a moment and try again, or check your quota in Settings > Secrets.',
    };
  }
  return {
    status: 500,
    message: raw || 'An unexpected error occurred while contacting Gemini.',
  };
}

async function withRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      const isRetryable =
        msg.includes('503') ||
        msg.includes('500') ||
        msg.includes('UNAVAILABLE') ||
        msg.includes('ECONNRESET');
      if (!isRetryable || attempt === retries) {
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
    }
  }
  throw lastError;
}

const plantAnalysisSchema = {
  type: Type.OBJECT,
  properties: {
    isPlant: {
      type: Type.BOOLEAN,
      description: 'True if the photo depicts a plant, foliage, flower, tree, succulent, or garden crop.',
    },
    nonPlantMessage: {
      type: Type.STRING,
      description: 'Friendly explanation if isPlant is false.',
    },
    identity: {
      type: Type.OBJECT,
      properties: {
        commonName: { type: Type.STRING },
        scientificName: { type: Type.STRING },
        family: { type: Type.STRING },
        environment: {
          type: Type.STRING,
          description: 'Must be exactly one of: indoor, outdoor, both',
        },
        confidence: {
          type: Type.STRING,
          description: 'Must be exactly one of: High, Moderate, Low',
        },
        summary: { type: Type.STRING },
        nativeRegion: { type: Type.STRING },
      },
      required: [
        'commonName',
        'scientificName',
        'family',
        'environment',
        'confidence',
        'summary',
        'nativeRegion',
      ],
    },
    diagnosis: {
      type: Type.OBJECT,
      properties: {
        healthStatus: {
          type: Type.STRING,
          description: 'Must be exactly one of: healthy, attention, critical',
        },
        statusHeadline: { type: Type.STRING },
        detectedIssues: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
        symptomsObserved: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
        immediateActions: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
        preventionTips: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
      },
      required: [
        'healthStatus',
        'statusHeadline',
        'detectedIssues',
        'symptomsObserved',
        'immediateActions',
        'preventionTips',
      ],
    },
    careGuide: {
      type: Type.OBJECT,
      properties: {
        light: {
          type: Type.OBJECT,
          properties: {
            level: { type: Type.STRING },
            dailyHours: { type: Type.STRING },
            placementTip: { type: Type.STRING },
          },
          required: ['level', 'dailyHours', 'placementTip'],
        },
        watering: {
          type: Type.OBJECT,
          properties: {
            cadenceLabel: { type: Type.STRING },
            frequencyDays: { type: Type.STRING },
            method: { type: Type.STRING },
            moistureCheck: { type: Type.STRING },
          },
          required: ['cadenceLabel', 'frequencyDays', 'method', 'moistureCheck'],
        },
        soilAndPh: {
          type: Type.OBJECT,
          properties: {
            mix: { type: Type.STRING },
            phRange: { type: Type.STRING },
            drainage: { type: Type.STRING },
          },
          required: ['mix', 'phRange', 'drainage'],
        },
        climate: {
          type: Type.OBJECT,
          properties: {
            tempRangeC: { type: Type.STRING },
            tempRangeF: { type: Type.STRING },
            humidityRange: { type: Type.STRING },
          },
          required: ['tempRangeC', 'tempRangeF', 'humidityRange'],
        },
        nutrition: {
          type: Type.OBJECT,
          properties: {
            schedule: { type: Type.STRING },
            npkGuidance: { type: Type.STRING },
          },
          required: ['schedule', 'npkGuidance'],
        },
        maintenance: {
          type: Type.OBJECT,
          properties: {
            pruning: { type: Type.STRING },
            repottingOrMulching: { type: Type.STRING },
            propagation: { type: Type.STRING },
          },
          required: ['pruning', 'repottingOrMulching', 'propagation'],
        },
        toxicity: {
          type: Type.OBJECT,
          properties: {
            petSafe: { type: Type.BOOLEAN },
            notes: { type: Type.STRING },
          },
          required: ['petSafe', 'notes'],
        },
        seasonalCare: {
          type: Type.OBJECT,
          properties: {
            springSummer: { type: Type.STRING },
            fallWinter: { type: Type.STRING },
          },
          required: ['springSummer', 'fallWinter'],
        },
      },
      required: [
        'light',
        'watering',
        'soilAndPh',
        'climate',
        'nutrition',
        'maintenance',
        'toxicity',
        'seasonalCare',
      ],
    },
  },
  required: ['isPlant'],
};

app.post('/api/analyze-plant', async (req: Request, res: Response) => {
  try {
    const { imageBase64, mimeType, environmentHint, symptomNotes } = req.body ?? {};

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      res.status(400).json({ error: 'Please upload a valid plant image.' });
      return;
    }

    const safeMime =
      typeof mimeType === 'string' && mimeType.startsWith('image/')
        ? mimeType
        : 'image/jpeg';

    const envHintText =
      environmentHint === 'indoor'
        ? 'The user indicates this is grown as an indoor houseplant.'
        : environmentHint === 'outdoor'
          ? 'The user indicates this is grown in an outdoor garden.'
          : 'Auto-detect whether this plant is typically grown indoors, outdoors, or both.';

    const symptomText =
      typeof symptomNotes === 'string' && symptomNotes.trim()
        ? `User-reported symptoms or context: "${symptomNotes.trim()}".`
        : 'No additional symptom notes were provided by the user.';

    const ai = getGeminiClient();

    const response = await withRetry(() =>
      ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: safeMime,
                data: imageBase64,
              },
            },
            {
              text: [
                'Inspect this image carefully as a master botanist and plant pathologist.',
                'First determine if the image shows a real plant, leaf, flower, tree, succulent, or garden crop.',
                'If it does NOT show a plant, set isPlant to false and provide a helpful nonPlantMessage asking for a clear plant photo.',
                'If it IS a plant, set isPlant to true and fill out identity, diagnosis, and careGuide thoroughly.',
                'Look closely at leaves, stems, buds, and soil for any pests (aphids, spider mites, scale, mealybugs, thrips, whiteflies), fungal/bacterial spots, powdery mildew, chlorosis, sunburn, or watering stress.',
                'If the plant looks healthy with no visible pests or disease, set healthStatus to "healthy", detectedIssues to [] (empty array), and provide preventative care tips.',
                'Use concise, practical, numeric/tabular values where appropriate (e.g., "7–10 days", "pH 6.0–6.8", "18–26 °C", "64–79 °F", "50–65% RH", "4–6 hrs indirect").',
                envHintText,
                symptomText,
              ].join('\n'),
            },
          ],
        },
        config: {
          systemInstruction:
            'You are the senior horticulturist and plant pathologist for Verdant Conservatory, advising on both indoor houseplants and outdoor gardens. Provide accurate botanical taxonomy, honest confidence levels, grounded visual pest/disease diagnosis, and actionable care instructions.',
          responseMimeType: 'application/json',
          responseSchema: plantAnalysisSchema,
        },
      })
    );

    const jsonText = (response.text ?? '').trim();
    if (!jsonText) {
      res.status(502).json({ error: 'Gemini returned an empty analysis response.' });
      return;
    }

    const parsed = JSON.parse(jsonText);
    res.json(parsed);
  } catch (err) {
    const formatted = formatApiError(err);
    res.status(formatted.status).json({ error: formatted.message });
  }
});

interface IncomingChatMessage {
  role: 'user' | 'model';
  text: string;
}

app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const { message, history, activePlant, imageBase64, mimeType } = req.body ?? {};

    const trimmedMessage = typeof message === 'string' ? message.trim() : '';
    const hasImage = typeof imageBase64 === 'string' && imageBase64.length > 0;

    if (!trimmedMessage && !hasImage) {
      res.status(400).json({ error: 'Message text or an image attachment is required.' });
      return;
    }

    const ai = getGeminiClient();

    let plantContextBlock =
      'No specific plant specimen is currently pinned. Provide versatile advice tailored to indoor houseplants or outdoor gardens, and ask clarifying questions about light, soil, or climate when helpful.';

    if (activePlant && typeof activePlant === 'object' && activePlant.identity) {
      const id = activePlant.identity;
      const diag = activePlant.diagnosis;
      const care = activePlant.careGuide;
      plantContextBlock = [
        `Active Plant Specimen Context:`,
        `- Common Name: ${id.commonName ?? 'Unknown'}`,
        `- Scientific Name: ${id.scientificName ?? 'Unknown'} (${id.family ?? ''})`,
        `- Environment: ${id.environment ?? 'indoor/outdoor'}`,
        diag
          ? `- Health Status: ${diag.healthStatus} — ${diag.statusHeadline}. Detected issues: ${(diag.detectedIssues ?? []).join(', ') || 'None'}.`
          : '',
        care
          ? `- Care Profile: Light (${care.light?.level}, ${care.light?.dailyHours}), Watering (${care.watering?.cadenceLabel}, ${care.watering?.frequencyDays}), Soil (${care.soilAndPh?.mix}, ${care.soilAndPh?.phRange}), Climate (${care.climate?.tempRangeF}, ${care.climate?.humidityRange}).`
          : '',
        activePlant.locationLabel ? `- User Location Tag: ${activePlant.locationLabel}` : '',
        activePlant.userNotes ? `- User Care Notes: ${activePlant.userNotes}` : '',
      ]
        .filter(Boolean)
        .join('\n');
    }

    const systemInstruction = [
      'You are the Head Botanist and Plant Pathologist at Verdant Conservatory.',
      'You specialize in both indoor houseplants and outdoor garden plants (perennials, roses, shrubs, edibles, trees, succulents).',
      'Give practical, evidence-based, structured horticultural advice with clear action steps, organic and conventional pest-control options, watering/soil diagnostics, and seasonal timing.',
      'Keep answers focused, warm, authoritative, and easy to scan using short headings or bullet lists.',
      'If a user asks about pet safety or toxicity, clearly warn when uncertain.',
      '',
      plantContextBlock,
    ].join('\n');

    const safeHistory: Content[] = Array.isArray(history)
      ? (history as IncomingChatMessage[])
          .filter(
            (m) =>
              m &&
              (m.role === 'user' || m.role === 'model') &&
              typeof m.text === 'string' &&
              m.text.trim().length > 0
          )
          .slice(-20)
          .map((m) => ({
            role: m.role,
            parts: [{ text: m.text }],
          }))
      : [];

    const chat = ai.chats.create({
      model: 'gemini-4-hydrogen',
      history: safeHistory,
      config: {
        systemInstruction,
      },
    });

    const parts: Part[] = [];
    if (hasImage) {
      parts.push({
        inlineData: {
          mimeType:
            typeof mimeType === 'string' && mimeType.startsWith('image/')
              ? mimeType
              : 'image/jpeg',
          data: imageBase64,
        },
      });
    }
    parts.push({
      text: trimmedMessage || 'Please inspect this follow-up plant photo and advise on what you see.',
    });

    const response = await withRetry(() =>
      chat.sendMessage({
        message: parts.length === 1 && parts[0].text ? parts[0].text : parts,
      })
    );

    const reply = (response.text ?? '').trim();
    if (!reply) {
      res.status(502).json({ error: 'The botanist returned an empty response.' });
      return;
    }

    res.json({ reply });
  } catch (err) {
    const formatted = formatApiError(err);
    res.status(formatted.status).json({ error: formatted.message });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Verdant Conservatory listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start Verdant Conservatory server:', err);
  process.exit(1);
});
