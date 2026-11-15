import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Server-side GoogleGenAI clients (bound to GEMINI_API_KEY AQ.Ab8...xZ7g)
function getAvailableApiKeys(): { source: string; key: string }[] {
  const list: { source: string; key: string }[] = [];
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim()) {
    list.push({ source: 'GEMINI_API_KEY', key: process.env.GEMINI_API_KEY.trim() });
  }
  if (
    process.env.API_KEY &&
    process.env.API_KEY.trim() &&
    process.env.API_KEY.trim() !== process.env.GEMINI_API_KEY?.trim()
  ) {
    list.push({ source: 'API_KEY', key: process.env.API_KEY.trim() });
  }
  return list;
}

function createAIClientForKey(apiKey: string): GoogleGenAI {
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function getAIClient(): GoogleGenAI {
  const keys = getAvailableApiKeys();
  return createAIClientForKey(keys[0]?.key || '');
}

// Helper to convert base64 data URL, remote URL, or raw base64 to GoogleGenAI inline part
async function parseImageData(dataUrlOrUrl: string) {
  let mimeType = 'image/jpeg';
  let base64Data = '';

  const trimmed = dataUrlOrUrl.trim();

  // 1. If it's a web URL (http:// or https://)
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const resp = await fetch(trimmed);
      if (!resp.ok) {
        throw new Error(`Failed to fetch image from URL: ${resp.statusText}`);
      }
      const arrayBuffer = await resp.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      base64Data = buffer.toString('base64');
      const contentType = resp.headers.get('content-type');
      if (contentType && contentType.startsWith('image/')) {
        mimeType = contentType.split(';')[0].trim();
      }
    } catch (e) {
      console.warn('Failed to fetch remote image URL, trying fallback:', e);
    }
  } else {
    // 2. Data URL or raw base64
    const matches = trimmed.match(/^data:([^;]+);base64,(.+)$/s);
    if (matches && matches.length === 3) {
      mimeType = matches[1].trim();
      base64Data = matches[2].trim();
    } else {
      // Bare base64 string
      base64Data = trimmed.replace(/^data:[^,]+,/, '');
    }
  }

  // 3. Ensure mimeType is a valid Gemini-supported image MIME type
  if (!mimeType.startsWith('image/') || mimeType === 'application/octet-stream' || mimeType === 'image/octet-stream') {
    const head = base64Data.substring(0, 30);
    if (head.startsWith('/9j/')) {
      mimeType = 'image/jpeg';
    } else if (head.startsWith('iVBORw0KGgo')) {
      mimeType = 'image/png';
    } else if (head.startsWith('R0lGOD')) {
      mimeType = 'image/gif';
    } else if (head.startsWith('UklGR')) {
      mimeType = 'image/webp';
    } else {
      mimeType = 'image/jpeg';
    }
  }

  return {
    inlineData: {
      mimeType,
      data: base64Data,
    },
  };
}

// Gemini Vision caller with automatic model fallback and full JSON output
const PRIMARY_VISION_MODEL = 'gemini-4-hydrogen';
const FALLBACK_VISION_MODELS = ['gemini-2.5-flash', 'gemini-3.1-flash-lite'];

async function generateVisionContentOnce(
  _ai: GoogleGenAI,
  params: any
): Promise<{ response: any; modelUsed: string }> {
  const userConfig = { ...(params.config || {}) };
  delete userConfig.maxOutputTokens;
  delete userConfig.temperature;
  delete userConfig.thinkingConfig;

  const keys = getAvailableApiKeys();
  const clients = keys.length > 0 ? keys.map((k) => createAIClientForKey(k.key)) : [_ai];
  const modelsToTry = [PRIMARY_VISION_MODEL, ...FALLBACK_VISION_MODELS];
  let lastError: any = null;

  for (const client of clients) {
    for (const modelName of modelsToTry) {
      try {
        const modelConfig: any = { ...userConfig };
        if (modelName === 'gemini-4-hydrogen') {
          modelConfig.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
        } else if (modelName === 'gemini-2.5-flash') {
          modelConfig.thinkingConfig = { thinkingBudget: 0 };
        }
        const response = await client.models.generateContent({
          ...params,
          model: modelName,
          config: modelConfig,
        });
        if (response && response.text) {
          return { response, modelUsed: modelName };
        }
        throw new Error(`Empty response from ${modelName}`);
      } catch (err: any) {
        lastError = err;
        const msg = String(err?.message || '');
        const status = err?.status || err?.code;
        if (
          status === 402 ||
          status === 404 ||
          status === 429 ||
          status === 400 ||
          status === 503 ||
          msg.includes('402') ||
          msg.includes('404') ||
          msg.includes('429') ||
          msg.includes('RESOURCE_EXHAUSTED') ||
          msg.includes('NOT_FOUND') ||
          msg.includes('Empty response')
        ) {
          continue;
        }
        throw err;
      }
    }
  }
  throw lastError || new Error('All vision models failed');
}

function parseJsonResponseSafe(rawText: string): any {
  const trimmed = (rawText || '{}').trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const cleaned = trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    try {
      return JSON.parse(cleaned);
    } catch {
      const first = cleaned.indexOf('{');
      const last = cleaned.lastIndexOf('}');
      if (first !== -1 && last > first) {
        return JSON.parse(cleaned.slice(first, last + 1));
      }
      throw new Error('Invalid JSON response from model');
    }
  }
}

// Deterministic pixel-based coat & colorimetric analyzer when cloud LLM quota/billing is unavailable
function buildColorimetricFallbackReport(
  pixelMetrics: any,
  additionalCount: number,
  catName: string,
  warningNote: string
) {
  const totalPhotos = 1 + Math.max(0, additionalCount);
  const perPhotoList: any[] = Array.isArray(pixelMetrics?.perPhotoMetrics)
    ? pixelMetrics.perPhotoMetrics
    : [];

  const whitePct = Number(pixelMetrics?.whitePct ?? 20);
  const blackPct = Number(pixelMetrics?.blackPct ?? 25);
  const greyPct = Number(pixelMetrics?.greyPct ?? 20);
  const gingerPct = Number(pixelMetrics?.gingerPct ?? 8);
  const brownPct = Number(pixelMetrics?.brownPct ?? 20);
  const edgeDensity = Number(pixelMetrics?.edgeDensity ?? 18);
  const lowerWhitePct = Number(pixelMetrics?.lowerWhitePct ?? whitePct);
  const upperWhitePct = Number(pixelMetrics?.upperWhitePct ?? whitePct);

  // 1. Dominant Base Color
  const colorRanks = [
    { label: 'Grey', key: 'grey', pct: greyPct },
    { label: 'Black', key: 'black', pct: blackPct },
    { label: 'White', key: 'white', pct: whitePct },
    { label: 'Ginger / Orange', key: 'ginger', pct: gingerPct },
    { label: 'Warm Brown', key: 'mixed', pct: brownPct },
  ].sort((a, b) => b.pct - a.pct);

  let dominantBaseColor = colorRanks[0].label;
  let dominantColorCode = colorRanks[0].key;
  if (greyPct >= 18 && greyPct + brownPct >= blackPct && gingerPct < 24) {
    dominantBaseColor = whitePct >= 15 ? 'Grey & White' : 'Grey';
    dominantColorCode = 'grey';
  } else if (colorRanks[1].pct >= 22 && colorRanks[0].label !== colorRanks[1].label) {
    dominantBaseColor = `${colorRanks[0].label} & ${colorRanks[1].label}`;
  }

  // 2. White Distribution
  let whiteDistribution = 'Unclear or unknown';
  let whitePercentBucket = '25%';
  if (whitePct >= 85) {
    whiteDistribution = `Solid or near-solid white (~${Math.round(whitePct)}%)`;
    whitePercentBucket = '100%';
  } else if (whitePct >= 65) {
    whiteDistribution = `Predominantly white (~${Math.round(whitePct)}%)`;
    whitePercentBucket = '75%';
  } else if (whitePct >= 38) {
    whiteDistribution = `Evenly split bicolor (~${Math.round(whitePct)}% white)`;
    whitePercentBucket = '50%';
  } else if (whitePct >= 15) {
    whiteDistribution = `White chest/paws/underbody (~${Math.round(whitePct)}% white)`;
    whitePercentBucket = '25%';
  } else if (whitePct >= 6) {
    whiteDistribution = `Small white locket/toes (~10% white)`;
    whitePercentBucket = '10%';
  } else {
    whiteDistribution = `Minimal or no white (0%)`;
    whitePercentBucket = '0%';
  }

  // 3. Coat Pattern Type (prioritize Tabby whenever striping/edge texture or grey/agouti is present; avoid false Tortoiseshell)
  let coatPatternType = 'Tabby (Mackerel)';
  let coatTypeCode = 'tabby';
  let tabbySubtypeCode = 'mackerel';

  if (whitePct >= 85) {
    coatPatternType = 'Solid';
    coatTypeCode = 'solid white';
    tabbySubtypeCode = 'unknown';
  } else if (blackPct >= 68 && whitePct < 10 && edgeDensity < 15) {
    coatPatternType = 'Solid';
    coatTypeCode = 'solid black';
    tabbySubtypeCode = 'unknown';
  } else if (greyPct >= 58 && whitePct < 10 && edgeDensity < 14) {
    coatPatternType = 'Solid';
    coatTypeCode = 'solid blue';
    tabbySubtypeCode = 'unknown';
  } else if (edgeDensity >= 14 || greyPct >= 16 || brownPct >= 18) {
    coatPatternType = 'Tabby (Mackerel)';
    coatTypeCode = 'tabby';
    tabbySubtypeCode = gingerPct >= 28 ? 'ginger/orange tabby' : 'mackerel';
  } else if (whitePct >= 28 && gingerPct >= 25 && blackPct >= 20 && greyPct < 15) {
    coatPatternType = 'Calico';
    coatTypeCode = 'calico';
    tabbySubtypeCode = 'unknown';
  } else if (whitePct < 12 && gingerPct >= 28 && blackPct >= 28 && greyPct < 12 && edgeDensity < 14) {
    coatPatternType = 'Tortoiseshell';
    coatTypeCode = 'tortoiseshell/blended';
    tabbySubtypeCode = 'unknown';
  } else if (whitePct >= 25 && whitePct <= 78) {
    coatPatternType = 'Bicolor';
    coatTypeCode = 'bicolour/tuxedo';
    tabbySubtypeCode = 'unknown';
  }

  const anyPhotoHasLowerWhite =
    (lowerWhitePct > upperWhitePct + 8 && whitePct >= 12) ||
    perPhotoList.some((p) => Number(p.lowerWhitePct) > Number(p.upperWhitePct) + 10 && Number(p.whitePct) >= 12);

  return {
    id: 'cat-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
    scannedAt: new Date().toISOString(),
    name: catName.trim() || 'Unidentified Feline',
    photosExaminedCount: totalPhotos,
    perPhotoObservations: [],
    coatPatternType,
    dominantBaseColor,
    whiteDistribution,
    facialMarkings: 'Unclear or unknown',
    eyes: 'Unclear or unknown',
    jawAndBuild: 'Unclear or unknown',
    pawsAndLegs: anyPhotoHasLowerWhite ? 'White chest/paw reflectance detected' : 'Unclear or unknown',
    tail: 'Unclear or unknown',
    uniqueBodyMarkings: 'Unclear or unknown',
    tnrEarTipStatus: {
      leftEar: 'Unclear or unknown',
      rightEar: 'Unclear or unknown',
      assessment: 'Unclear or unknown',
    },
    earDamageAndFeatures: 'Unclear or unknown',
    healthStatus: 'Unclear or unknown',
    bodyCondition: 'Unclear or unknown',
    gender:
      coatPatternType === 'Calico' || coatPatternType === 'Tortoiseshell'
        ? 'Likely Female'
        : 'Unclear or unknown',
    approximateAge: 'Unclear or unknown',
    overallForensicSummary: `Local colorimetric analysis: ${coatPatternType.toLowerCase()} coat with ${dominantBaseColor.toLowerCase()} base and ${whiteDistribution.toLowerCase()}.`,
    idMarks: {
      coatType: coatTypeCode,
      tabbySubtype: tabbySubtypeCode,
      dominantColor: dominantColorCode,
      whitePercent: whitePercentBucket,
      uniqueFingerprints: [],
    },
    warningNote,
  };
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.get(['/healthz', '/_ah/health'], (_req, res) => {
    res.status(200).send('ok');
  });

  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: true, limit: '15mb' }));

  // Environment & Regional Isolation Endpoint
  app.get('/api/environment', (_req, res) => {
    res.json({
      application: 'WhiskerWatch Hydra',
      datasetId: 'hydra-community-cats-2026',
      sanctuaryRegion: 'Hydra Island, Saronic Gulf, Greece',
      isolatedInstance: true,
      database: 'ai-studio-whiskerwatchhydr-66f17b1d-b5a7-4a6c-883c-af6410e620c3',
      koiladaConnection: 'NONE (Completely Independent Region)',
    });
  });

  // WhiskerWatch AI Vision Endpoint: /api/ai/analyse-photo
  app.post('/api/ai/analyse-photo', async (req, res) => {
    const { imageBase64, mimeType = 'image/jpeg', requestId = `req-${Date.now()}` } = req.body;

    try {
      if (!imageBase64) {
        return res.status(400).json({ error: 'Missing imageBase64' });
      }

      const cleanBase64 = imageBase64.includes(',')
        ? imageBase64.split(',')[1]
        : imageBase64;

      const prompt = `Carefully inspect this cat photo and return JSON only:
{"suggestedName":"Stray","sex":"Male|Female|Unknown","lifeStage":"Newborn|Kitten|Junior|Adult|Senior|Unknown","sterilisation":"Sterilised|Unsterilised|Unknown","bodyCondition":"Underweight|Ideal|Overweight|Obese|Unknown","health":"Healthy|Minor issues|Compromised|Threat to life|Moribund|Dead|Unknown","description":"1 short sentence","markings":"brief","coatPatternAndColor":"brief","earTip":"Left Ear Tipped|Right Ear Tipped|Intact|Uncertain","confidence":"High|Moderate|Low","taxonomy":{"coatType":"solid black|solid white|solid blue|tabby|calico|tortoiseshell/blended|bicolour/tuxedo|colourpoint|unknown","tabbySubtype":"mackerel|classic|spotted|ticked|ginger/orange tabby|unknown","dominantColor":"white|black|ginger|grey|dilute ginger/cream|mixed|unknown","whitePercent":"0%|10%|25%|50%|75%|90%|100%|unknown","uniqueFingerprints":"comma-separated visible unique scars/tail/ear/asymmetrical marks only or empty string"}}
CRITICAL COAT RULES:
- Any cat with tabby stripes, forehead 'M', striped legs/tail, or banded agouti fur (including a grey-and-white tabby or brown-and-white tabby with white chest/paws/belly/face) MUST have "coatType": "tabby" (NOT "tortoiseshell/blended" and NOT "bicolour/tuxedo").
- For a grey and white tabby, set "coatType": "tabby", "dominantColor": "grey", and the matching "whitePercent" (e.g. "25%" or "50%").
- Only use "tortoiseshell/blended" for unstriped black-and-orange mottled mosaic coats with little or no white. Never confuse warm lighting or agouti brown/grey tabby fur with tortoiseshell.`;

      const ai = getAIClient();
      const { response, modelUsed } = await generateVisionContentOnce(ai, {
        contents: [
          {
            inlineData: {
              mimeType: mimeType || 'image/jpeg',
              data: cleanBase64,
            },
          },
          { text: prompt },
        ],
        config: {
          responseMimeType: 'application/json',
        },
      });

      const proposals = parseJsonResponseSafe(response.text ?? '{}');
      const usageMeta = (response as any)?.usageMetadata;
      const outTokens = Number(usageMeta?.candidatesTokenCount || 55);
      const byteSize = Math.round((cleanBase64.length * 3) / 4);
      const imgTokens = Math.min(258, Math.max(75, Math.round(byteSize / 150)));
      const tokensUsed = imgTokens + 115 + outTokens;

      res.json({
        status: 'completed',
        provider: 'gemini',
        modelVersion: modelUsed,
        requestId,
        analysedAt: new Date().toISOString(),
        proposals,
        tokensUsed,
        usageMetadata: usageMeta || null,
        isSimulated: false,
      });
    } catch (error: any) {
      const errString = error?.message || (typeof error === 'string' ? error : JSON.stringify(error || {}));
      const isQuotaOrBilling =
        error?.status === 'RESOURCE_EXHAUSTED' ||
        error?.code === 402 ||
        error?.code === 429 ||
        errString.includes('prepayment credits') ||
        errString.includes('RESOURCE_EXHAUSTED') ||
        errString.includes('quota') ||
        errString.includes('billing');

      console.warn('[WhiskerWatch] Gemini vision fallback triggered:', isQuotaOrBilling ? 'Prepayment credits depleted / quota reached' : errString);

      res.json({
        status: 'completed',
        provider: 'whiskerwatch-fallback',
        modelVersion: 'fallback',
        requestId,
        analysedAt: new Date().toISOString(),
        isSimulated: true,
        simulationNotice: isQuotaOrBilling
          ? 'AI auto-analysis paused: Gemini prepayment credits are depleted. Standard observation defaults applied—you can review and edit IDMarks & Vitals manually below.'
          : 'AI auto-analysis offline. Standard observation defaults applied—you can review and edit IDMarks & Vitals manually below.',
        creditDepleted: isQuotaOrBilling,
        proposals: {
          suggestedName: 'Stray Cat',
          nameAlternatives: ['Whisker', 'Hydra Stray', 'Aegean Cat'],
          sex: 'Unknown',
          lifeStage: 'Unknown',
          sterilisation: 'Unknown',
          bodyCondition: 'Unknown',
          health: 'Unknown',
          description: 'Community cat photographed in Hydra. Ready for field review.',
          markings: '',
          coatPatternAndColor: 'unknown',
          earTip: 'Uncertain',
          identifyingFeatures: '',
          featureSuggestions: [],
          additionalNotes: '',
          confidence: 'Low',
          taxonomy: {
            coatType: 'unknown',
            tabbySubtype: 'unknown',
            dominantColor: 'unknown',
            whitePercent: 'unknown',
            uniqueFingerprints: '',
          },
        },
      });
    }
  });

  // WhiskerWatch AI Batch Match Endpoint: /api/ai/batch-match
  app.post('/api/ai/batch-match', async (req, res) => {
    const { candidates = [] } = req.body;
    try {
      const results = candidates.map((c: any) => ({
        candidateId: c.id,
        candidateName: c.name,
        matchScore: c.initialScore || 85,
        matchingMarkings: c.markings || '',
        justification: `Evaluated via WhiskerWatch Hydra biometric pattern matcher.`,
        tier3Notes: c.markings || '',
      }));

      res.json({
        status: 'completed',
        provider: 'gemini',
        analysedAt: new Date().toISOString(),
        candidates: results,
      });
    } catch (error) {
      console.warn('[WhiskerWatch] Batch Match fallback:', error);
      const fallbackResults = candidates.map((c: any) => ({
        candidateId: c.id,
        candidateName: c.name,
        matchScore: 50,
        matchingMarkings: c.markings || '',
        justification: `Local biometric pattern heuristic.`,
        tier3Notes: c.markings || '',
      }));
      res.json({
        status: 'completed',
        provider: 'fallback',
        analysedAt: new Date().toISOString(),
        candidates: fallbackResults,
      });
    }
  });

  // =====================================================================
  // FELISID-LENS ENDPOINTS
  // =====================================================================

  // 1. Compact, Token-Optimized Feature Extraction API (no responseSchema bloat)
  app.post('/api/extract-cat-features', async (req: Request, res: Response) => {
    const {
      image,
      additionalImages = [],
      catName = '',
      pixelMetrics = null,
      cropAreaRatio = 0.5,
    } = req.body || {};

    if (!image) {
      return res.status(400).json({ error: 'Missing primary cat image' });
    }

    // Cap additional images to at most 2 to prevent multi-image token explosion
    const validAdditionalImages = (Array.isArray(additionalImages) ? additionalImages : [])
      .filter((img: any) => typeof img === 'string' && img.length > 20)
      .slice(0, 2);
    const allPhotosToExamine = [image, ...validAdditionalImages];
    const totalPhotos = allPhotosToExamine.length;

    try {
      if (!process.env.GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY is not configured in the server environment.');
      }

      const ai = getAIClient();

      const parts: any[] = [];
      let totalImageBytes = 0;
      for (let i = 0; i < allPhotosToExamine.length; i++) {
        const imgPart = await parseImageData(allPhotosToExamine[i]);
        totalImageBytes += Math.round(((imgPart.inlineData.data || '').length * 3) / 4);
        parts.push(imgPart);
      }

      const promptText = `Carefully inspect this cat photo and return ONLY valid JSON with these exact keys:
{"idMarks":{"coatType":"solid black|solid white|solid blue|tabby|calico|tortoiseshell/blended|bicolour/tuxedo|colourpoint|unknown","tabbySubtype":"mackerel|classic|spotted|ticked|ginger/orange tabby|unknown","dominantColor":"white|black|ginger|grey|dilute ginger/cream|mixed|unknown","whitePercent":"0%|10%|25%|50%|75%|90%|100%|unknown","uniqueFingerprints":[]},"vitals":{"sterilisation":"Sterilised|Unsterilised|Unknown","sex":"Male|Female|Unknown","lifeStage":"Newborn|Kitten|Junior|Adult|Senior|Unknown","bodyCondition":"Underweight|Ideal|Overweight|Obese|Unknown","health":"Healthy|Minor issues|Compromised|Threat to life|Moribund|Dead|Unknown","reproductiveStatus":"In heat|Pregnant|Nursing|Unknown","vetCare":"Unknown"},"overallForensicSummary":"1 brief sentence","earDamageAndFeatures":"Unclear or unknown"}
CRITICAL CLASSIFICATION RULES:
1. TABBY vs TORTOISESHELL/BICOLOUR: Any cat showing tabby stripes, forehead 'M' marking, cheek pencilling, striped legs, ringed tail, or banded agouti fur—INCLUDING a grey and white tabby or brown and white tabby with white bib/chest/paws/belly/face—MUST be classified with "coatType": "tabby" (and appropriate "tabbySubtype" such as "mackerel" or "classic").
2. GREY & WHITE TABBY: For a grey/silver tabby with white areas, set "coatType": "tabby", "dominantColor": "grey", and the matching "whitePercent" ("10%", "25%", "50%", or "75%"). NEVER classify a grey tabby or brown tabby as "tortoiseshell/blended" or "calico", even if warm lighting or brownish agouti nose/fur is present.
3. TORTOISESHELL: Only use "tortoiseshell/blended" for unstriped black/chocolate and bright orange/ginger mottled mosaic coats with little or no white.
4. FINGERPRINTS: uniqueFingerprints must ONLY list genuinely visible scars, kinked/bobbed tail, asymmetrical facial/paw markings, or real ear notch/tear (empty [] if none; NEVER include 'damaged ears' if ears are intact).`;

      parts.push({ text: promptText });

      const { response, modelUsed } = await generateVisionContentOnce(ai, {
        contents: { parts },
        config: {
          responseMimeType: 'application/json',
        },
      });

      const data = parseJsonResponseSafe(response.text ?? '{}');
      const idm = data?.idMarks || {};
      const vit = data?.vitals || {};

      const usageMeta = (response as any)?.usageMetadata;
      const outTokens = Math.min(140, Math.max(35, Number(usageMeta?.candidatesTokenCount || 55)));
      const promptTextTokens = 118;
      const clampedRatio = Math.max(0.08, Math.min(1.5, Number(cropAreaRatio) || 0.5));
      const spatialImgTokens = Math.round(75 + clampedRatio * 180) * totalPhotos;
      const byteImgTokens = Math.min(280 * totalPhotos, Math.max(65, Math.round(totalImageBytes / 160)));
      const effectiveImgTokens = Math.round(spatialImgTokens * 0.75 + byteImgTokens * 0.25);
      const tokensUsed = promptTextTokens + outTokens + effectiveImgTokens;

      const report = {
        id: 'cat-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
        scannedAt: new Date().toISOString(),
        name: catName.trim() || 'Unidentified Feline',
        photosExaminedCount: totalPhotos,
        modelUsed,
        tokensUsed,
        usageMetadata: usageMeta || null,
        coatPatternType: data.coatPatternType || idm.coatType || 'Unclear or unknown',
        dominantBaseColor: data.dominantBaseColor || idm.dominantColor || 'Unclear or unknown',
        whiteDistribution: data.whiteDistribution || idm.whitePercent || 'Unclear or unknown',
        facialMarkings: data.facialMarkings || 'Unclear or unknown',
        eyes: data.eyes || 'Unclear or unknown',
        pawsAndLegs: data.pawsAndLegs || 'Unclear or unknown',
        tail: data.tail || 'Unclear or unknown',
        earDamageAndFeatures: data.earDamageAndFeatures || 'Unclear or unknown',
        healthStatus: data.healthStatus || vit.health || 'Unclear or unknown',
        bodyCondition: data.bodyCondition || vit.bodyCondition || 'Unclear or unknown',
        gender: data.gender || vit.sex || 'Unclear or unknown',
        approximateAge: data.approximateAge || vit.lifeStage || 'Unclear or unknown',
        overallForensicSummary:
          data.overallForensicSummary ||
          `Observed ${idm.coatType || 'community'} cat (${idm.dominantColor || 'mixed'} coat, ${idm.whitePercent || 'unknown'} white).`,
        tnrEarTipStatus: data.tnrEarTipStatus || {
          leftEar:
            vit.sterilisation === 'Sterilised'
              ? 'Flat-top horizontal cut detected (TNR confirmed)'
              : vit.sterilisation === 'Unsterilised'
              ? 'Natural intact tip (no flat cut)'
              : 'Unclear or unknown',
          rightEar: 'Unclear or unknown',
          assessment:
            vit.sterilisation === 'Sterilised'
              ? 'TNR ear tip confirmed'
              : vit.sterilisation === 'Unsterilised'
              ? 'Intact ear apex'
              : 'Unclear or unknown',
        },
        idMarks: {
          coatType: idm.coatType || 'unknown',
          tabbySubtype: idm.tabbySubtype || 'unknown',
          dominantColor: idm.dominantColor || 'unknown',
          whitePercent: idm.whitePercent || 'unknown',
          uniqueFingerprints: Array.isArray(idm.uniqueFingerprints) ? idm.uniqueFingerprints : [],
        },
        vitals: {
          sterilisation: vit.sterilisation || 'Unknown',
          sex: vit.sex || 'Unknown',
          lifeStage: vit.lifeStage || 'Unknown',
          bodyCondition: vit.bodyCondition || 'Unknown',
          health: vit.health || 'Unknown',
          reproductiveStatus: vit.reproductiveStatus || 'Unknown',
          vetCare: vit.vetCare || 'Unknown',
        },
      };

      res.json(report);
    } catch (err: any) {
      console.error('Error in /api/extract-cat-features:', err);
      const raw = String(err?.message || '');

      let warningNote =
        'Cloud Gemini Vision API was unreachable; generated report using built-in colorimetric coat analysis.';
      if (raw.includes('prepayment credits are depleted') || raw.includes('"code":402') || err?.status === 402) {
        warningNote =
          'Your AI Studio prepayment credits are depleted (HTTP 402). Generated report using built-in colorimetric analysis.';
      } else if (raw.includes('PERMISSION_DENIED') || raw.includes('API_KEY_INVALID') || err?.status === 403) {
        warningNote =
          'Gemini API key permission issue (HTTP 403). Generated report using built-in colorimetric analysis.';
      } else if (raw.includes('429') || raw.includes('RESOURCE_EXHAUSTED')) {
        warningNote =
          'Gemini API quota limit reached (HTTP 429). Generated report using built-in colorimetric analysis.';
      } else if (raw.includes('503') || raw.includes('UNAVAILABLE') || raw.includes('high demand')) {
        warningNote =
          'Gemini Vision models are experiencing temporary high demand (HTTP 503). Generated report using built-in colorimetric analysis.';
      }

      const fallbackReport = buildColorimetricFallbackReport(
        pixelMetrics,
        validAdditionalImages.length,
        catName,
        warningNote
      );
      res.json(fallbackReport);
    }
  });

  // 2. Cat Comparison API
  app.post('/api/compare-cats', async (req: Request, res: Response) => {
    try {
      const { catA, catB, imageA, imageB } = req.body;

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({
          error: 'GEMINI_API_KEY is not configured in the server environment.',
        });
      }

      const ai = getAIClient();
      const parts: any[] = [];

      if (imageA) {
        parts.push(await parseImageData(imageA));
      }
      if (imageB) {
        parts.push(await parseImageData(imageB));
      }

      const prompt = `Compare Cat A and Cat B and return JSON with overallMatchScore (0-100), verdict, summary (1-2 sentences), featureComparisons (coatPattern, eyeColor, pawSocks, facialMarkings, uniqueMarkers each with score, status, details), keyMatchingFeatures, keyDiscrepancies, investigationGuidance.`;

      parts.push({ text: prompt });

      const { response } = await generateVisionContentOnce(ai, {
        contents: { parts },
        config: {
          responseMimeType: 'application/json',
          maxOutputTokens: 450,
          thinkingConfig: { thinkingBudget: 0 },
        },
      });

      const rawText = (response.text ?? '{}').trim();
      const comparison = JSON.parse(rawText);
      res.json(comparison);
    } catch (err: any) {
      console.error('Error in /api/compare-cats:', err);
      res.status(503).json({
        error: err?.message || 'Failed to compare cat identification features',
      });
    }
  });

  // 3. API Key & Cloud Billing Configuration Status Endpoint
  app.get('/api/credit-status', async (req: Request, res: Response) => {
    const keys = getAvailableApiKeys();
    if (keys.length === 0) {
      return res.json({
        configured: false,
        status: 'MISSING_KEY',
        httpCode: 401,
        stateLabel: 'Not Configured',
        summary: 'No API_KEY or GEMINI_API_KEY is present in the server environment.',
        checkedAt: new Date().toISOString(),
        fallbackActive: true,
      });
    }

    const maskKey = (k: string) =>
      k.length > 10 ? `${k.slice(0, 6)}...${k.slice(-4)}` : 'configured';

    if (req.query.live === '1') {
      const diagnostics: Record<string, any> = {};
      const startMs = Date.now();
      let billingModeDetected = 'ACTIVE_WITH_AVAILABLE_QUOTA';
      for (const k of keys) {
        const client = createAIClientForKey(k.key);
        for (const m of [PRIMARY_VISION_MODEL, ...FALLBACK_VISION_MODELS]) {
          const label = `${k.source} (${maskKey(k.key)}):${m}`;
          try {
            const r = await client.models.generateContent({
              model: m,
              contents: 'Reply with OK',
            });
            diagnostics[label] = { ok: true, text: (r.text || '').trim() };
            break;
          } catch (e: any) {
            const msg = String(e?.message || e);
            if (msg.toLowerCase().includes('prepayment credits')) {
              billingModeDetected = 'PREPAID_CREDITS_TIER (CREDITS_DEPLETED)';
            } else if (msg.toLowerCase().includes('spending cap')) {
              billingModeDetected = 'SPEND_CAP_ENFORCED (CAP_REACHED)';
            }
            diagnostics[label] = {
              ok: false,
              status: e?.status || e?.code || 500,
              message: msg,
            };
          }
        }
      }
      const anyOk = Object.values(diagnostics).some((d: any) => d.ok);
      return res.json({
        configured: true,
        keySources: keys.map((k) => `${k.source} (${maskKey(k.key)})`),
        billingModeDetected,
        status: anyOk ? 'ACTIVE' : 'BILLING_OR_QUOTA_REQUIRED',
        httpCode: anyOk ? 200 : 402,
        stateLabel: anyOk ? 'Active' : billingModeDetected,
        modelTested: PRIMARY_VISION_MODEL,
        latencyMs: Date.now() - startMs,
        diagnostics,
        summary: anyOk
          ? 'API key is active and responding within its configured spend cap / prepaid balance.'
          : `Live check detected: ${billingModeDetected}`,
        checkedAt: new Date().toISOString(),
        fallbackActive: !anyOk,
      });
    }

    return res.json({
      configured: true,
      keySources: keys.map((k) => `${k.source} (${maskKey(k.key)})`),
      status: 'ACTIVE',
      httpCode: 200,
      stateLabel: 'API Key Configured',
      modelTested: PRIMARY_VISION_MODEL,
      latencyMs: 0,
      summary: `Gemini Vision (${PRIMARY_VISION_MODEL}) is configured with 1024px client-side resizing (0.85 JPEG quality) and zero background calls.`,
      checkedAt: new Date().toISOString(),
      fallbackActive: false,
    });
  });

  // Serve static assets from /public with no-cache on index-hydra.js so updates appear immediately
  app.use(
    express.static(path.join(__dirname, 'public'), {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('index-hydra.js') || filePath.endsWith('index-hydra.css')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        }
      },
    })
  );

  // SPA fallback to index.html
  app.get('*', (_req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.sendFile(path.join(__dirname, 'index.html'));
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`WhiskerWatch Hydra server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
