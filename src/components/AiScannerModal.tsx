import React, { useState } from 'react';
import {
  Camera,
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import {
  AiCatAnalysisResult,
  CatProfile,
  HYDRA_ZONES,
  HydraZone,
} from '../types';

interface AiScannerPanelProps {
  existingCats: CatProfile[];
  onApplyToNewCat: (
    result: AiCatAnalysisResult,
    zone: HydraZone,
    file: File | null,
    previewDataUrl: string
  ) => void;
  onApplyToSighting: (
    result: AiCatAnalysisResult,
    zone: HydraZone,
    matchedCat: CatProfile | undefined,
    previewDataUrl: string
  ) => void;
}

export const AiScannerPanel: React.FC<AiScannerPanelProps> = ({
  existingCats,
  onApplyToNewCat,
  onApplyToSighting,
}) => {
  const [selectedZone, setSelectedZone] = useState<HydraZone>('Hydra Port');
  const [fieldNotes, setFieldNotes] = useState(
    'Adult orange and white tabby spotted near the stone clocktower steps in Hydra Port. Left ear appears cleanly tipped. Good appetite, mild squinting in right eye.'
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewDataUrl, setPreviewDataUrl] = useState<string>('');
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AiCatAnalysisResult | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setError(null);

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPreviewDataUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRunAiAnalysis = async (e: React.FormEvent) => {
    e.preventDefault();
    setAnalyzing(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/analyze-cat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: previewDataUrl || undefined,
          mimeType: selectedFile?.type || 'image/jpeg',
          fieldNotes,
          zone: selectedZone,
          existingCats: existingCats.map((c) => ({
            name: c.name,
            colonyZone: c.colonyZone,
            coatPattern: c.coatPattern,
            tnrStatus: c.tnrStatus,
            markingsDescription: c.markingsDescription,
          })),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'AI analysis request failed.');
      }
      setResult(data as AiCatAnalysisResult);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to complete AI analysis right now.'
      );
    } finally {
      setAnalyzing(false);
    }
  };

  const matchedCat = result
    ? existingCats.find(
        (c) =>
          c.name.toLowerCase() === result.matchedCatName.toLowerCase()
      )
    : undefined;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Left Column: Input Form */}
      <form
        onSubmit={handleRunAiAnalysis}
        className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-6 space-y-5"
      >
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-slate-900">
            WhiskerWatch AI Feline Identification & Triage
          </h2>
          <p className="text-sm text-slate-600">
            Upload a field photograph from Hydra or describe visual markings to
            detect coat pattern, surgical ear-tip TNR state, and match against
            registered Hydra Island colony records.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Hydra Island Zone
            </label>
            <select
              value={selectedZone}
              onChange={(e) => setSelectedZone(e.target.value as HydraZone)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-700"
            >
              {HYDRA_ZONES.map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Field Photograph (Optional)
            </label>
            <label className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-300 border-dashed rounded-lg cursor-pointer hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0">
              <Upload className="w-3.5 h-3.5 text-slate-500" />
              <span className="truncate">
                {selectedFile ? selectedFile.name : 'Choose Cat Photo'}
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {previewDataUrl && (
          <div className="relative h-48 rounded-lg overflow-hidden border border-slate-200 bg-slate-900">
            <img
              src={previewDataUrl}
              alt="Selected Hydra cat for AI analysis"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
            <button
              type="button"
              onClick={() => {
                setSelectedFile(null);
                setPreviewDataUrl('');
              }}
              className="absolute top-2 right-2 px-2.5 py-1 text-xs font-medium bg-slate-900/80 text-white rounded-md hover:bg-slate-900 whitespace-nowrap shrink-0"
            >
              Clear Photo
            </button>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1.5">
            Caretaker Field Observations & Markings
          </label>
          <textarea
            rows={4}
            value={fieldNotes}
            onChange={(e) => setFieldNotes(e.target.value)}
            required
            maxLength={600}
            placeholder="Describe coat colors, ear-tip visibility, eye/respiratory signs, and location near Hydra landmarks..."
            className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-700"
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-slate-500">
            Roster comparison: <span className="tabular-nums">{existingCats.length}</span> registered Hydra cats
          </span>
          <button
            type="submit"
            disabled={analyzing}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-teal-700 rounded-lg hover:bg-teal-800 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
          >
            {analyzing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Running AI Biometric Triage...
              </>
            ) : (
              <>
                <Camera className="w-3.5 h-3.5" />
                Analyze Cat & Match Roster
              </>
            )}
          </button>
        </div>
      </form>

      {/* Right Column: Structured AI Triage Output */}
      <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              Biometric & Veterinary Triage Report
            </h3>
            <p className="text-xs text-slate-500">
              Automated coat classification, TNR ear-tip check, and Hydra colony match
            </p>
          </div>
          {result && (
            <span className="text-xs font-mono tabular-nums text-teal-800">
              Match Confidence: {result.matchConfidence}%
            </span>
          )}
        </div>

        {!result ? (
          <div className="py-12 text-center space-y-2">
            <p className="text-sm font-medium text-slate-700">
              Ready for Field Inspection
            </p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Submit a photo or caretaker description on the left to generate a
              structured identification and veterinary triage report.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 py-3 border-b border-slate-100 text-xs">
              <div>
                <div className="text-slate-500">Detected Match</div>
                <div className="font-semibold text-slate-900 mt-0.5">
                  {result.matchedCatName}
                </div>
              </div>
              <div>
                <div className="text-slate-500">Coat Pattern</div>
                <div className="font-semibold text-slate-900 mt-0.5">
                  {result.coatPattern}
                </div>
              </div>
              <div>
                <div className="text-slate-500">Estimated Age · Sex</div>
                <div className="font-semibold text-slate-900 mt-0.5">
                  {result.estimatedAge} · {result.sexGuess}
                </div>
              </div>
              <div>
                <div className="text-slate-500">Ear-Tip Detected</div>
                <div className="font-semibold text-slate-900 mt-0.5 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-700" />
                  <span>{result.earTipDetected ? 'Yes (Sterilized)' : 'No (Intact)'}</span>
                </div>
              </div>
              <div>
                <div className="text-slate-500">Recommended TNR</div>
                <div className="font-semibold text-slate-900 mt-0.5">
                  {result.recommendedTnrStatus}
                </div>
              </div>
              <div>
                <div className="text-slate-500">Health Triage</div>
                <div className="font-semibold text-slate-900 mt-0.5">
                  {result.recommendedHealthStatus}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-medium text-slate-700">
                Visual Markings Summary
              </div>
              <p className="text-sm text-slate-700 leading-relaxed">
                {result.markingsSummary}
              </p>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-medium text-slate-700">
                Veterinary Triage & Care Recommendation
              </div>
              <p className="text-sm text-slate-700 leading-relaxed">
                {result.triageAssessment}
              </p>
            </div>

            <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  onApplyToNewCat(
                    result,
                    selectedZone,
                    selectedFile,
                    previewDataUrl
                  )
                }
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
              >
                <span>Register as New Hydra Cat</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              {existingCats.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    onApplyToSighting(
                      result,
                      selectedZone,
                      matchedCat || existingCats[0],
                      previewDataUrl
                    )
                  }
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors whitespace-nowrap shrink-0"
                >
                  <span>
                    Log Sighting for {matchedCat ? matchedCat.name : existingCats[0].name}
                  </span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
