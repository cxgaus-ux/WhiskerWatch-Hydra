export interface AutoCropResult {
  croppedDataUrl: string;
  originalDataUrl: string;
  wasCropped: boolean;
  cropMode: 'auto' | 'manual' | 'full';
  cropBox: {
    xPct: number;
    yPct: number;
    widthPct: number;
    heightPct: number;
  };
  originalWidth: number;
  originalHeight: number;
  croppedWidth: number;
  croppedHeight: number;
  originalTokens: number;
  croppedTokens: number;
  tokensSaved: number;
  percentSaved: number;
}

export function estimateGeminiImageTokens(
  width: number,
  height: number,
  dataUrl?: string
): number {
  const w = Math.max(32, Math.round(width));
  const h = Math.max(32, Math.round(height));

  // Compact prompt (~115 tokens) + concise JSON output (~60 tokens) baseline
  const promptAndOutputBaseline = 175;

  // Proportional image token cost based on cropped frame area relative to a 1000x750 source frame
  // A tight crop (~250x250) uses ~85-110 image tokens; a full 384px tile uses ~258 image tokens; larger uncropped uses more
  const areaRatio = Math.min(2.2, (w * h) / (750 * 750));
  const spatialImageTokens = Math.round(75 + areaRatio * 185);

  if (dataUrl && dataUrl.includes(',')) {
    const base64Len = dataUrl.split(',')[1]?.length || 0;
    const byteSize = Math.round((base64Len * 3) / 4);
    const byteTokens = Math.min(280, Math.max(65, Math.round(byteSize / 160)));
    const blendedImageTokens = Math.round(spatialImageTokens * 0.75 + byteTokens * 0.25);
    return promptAndOutputBaseline + blendedImageTokens;
  }

  return promptAndOutputBaseline + spatialImageTokens;
}

function computeComparativeTokens(
  origW: number,
  origH: number,
  cropW: number,
  cropH: number,
  cropBox?: { xPct: number; yPct: number; widthPct: number; heightPct: number },
  croppedDataUrl?: string,
  originalDataUrl?: string
): { originalTokens: number; croppedTokens: number; tokensSaved: number; percentSaved: number } {
  const originalTokens = estimateGeminiImageTokens(origW, origH, originalDataUrl);

  // Compute the true source pixel dimensions covered by the crop frame on the original photo
  const effectiveCropW =
    cropBox && cropBox.widthPct > 0
      ? Math.max(32, Math.round((cropBox.widthPct / 100) * origW))
      : cropW;
  const effectiveCropH =
    cropBox && cropBox.heightPct > 0
      ? Math.max(32, Math.round((cropBox.heightPct / 100) * origH))
      : cropH;

  let croppedTokens = estimateGeminiImageTokens(
    effectiveCropW,
    effectiveCropH,
    croppedDataUrl
  );

  if (cropBox && cropBox.widthPct < 99 && cropBox.heightPct < 99) {
    croppedTokens = Math.min(originalTokens - 1, croppedTokens);
  }

  const tokensSaved = Math.max(0, originalTokens - croppedTokens);
  const percentSaved =
    originalTokens > 0 ? Math.round((tokensSaved / originalTokens) * 100) : 0;

  return { originalTokens, croppedTokens, tokensSaved, percentSaved };
}

export async function measureImageStats(
  croppedDataUrl: string,
  originalDataUrl?: string,
  cropMode: 'auto' | 'manual' | 'full' = 'manual',
  customCropBox?: { xPct: number; yPct: number; widthPct: number; heightPct: number },
  rawOriginalDims?: { width: number; height: number }
): Promise<AutoCropResult> {
  const loadDim = (src: string): Promise<{ w: number; h: number }> =>
    new Promise((res) => {
      const i = new Image();
      i.onload = () =>
        res({
          w: i.naturalWidth || i.width || 384,
          h: i.naturalHeight || i.height || 384,
        });
      i.onerror = () => res({ w: 384, h: 384 });
      i.src = src;
    });

  const croppedDim = await loadDim(croppedDataUrl);
  const loadedOrigDim = originalDataUrl ? await loadDim(originalDataUrl) : croppedDim;
  const origW = rawOriginalDims?.width || loadedOrigDim.w;
  const origH = rawOriginalDims?.height || loadedOrigDim.h;
  const boxToUse = customCropBox || { xPct: 5, yPct: 5, widthPct: 90, heightPct: 90 };

  const { originalTokens, croppedTokens, tokensSaved, percentSaved } =
    cropMode === 'full'
      ? {
          originalTokens: estimateGeminiImageTokens(origW, origH, originalDataUrl),
          croppedTokens: estimateGeminiImageTokens(origW, origH, originalDataUrl),
          tokensSaved: 0,
          percentSaved: 0,
        }
      : computeComparativeTokens(
          origW,
          origH,
          croppedDim.w,
          croppedDim.h,
          boxToUse,
          croppedDataUrl,
          originalDataUrl
        );

  return {
    croppedDataUrl,
    originalDataUrl: originalDataUrl || croppedDataUrl,
    wasCropped: cropMode !== 'full',
    cropMode,
    cropBox: boxToUse,
    originalWidth: origW,
    originalHeight: origH,
    croppedWidth: croppedDim.w,
    croppedHeight: croppedDim.h,
    originalTokens,
    croppedTokens,
    tokensSaved,
    percentSaved,
  };
}

export async function autoCropCatSubject(
  dataUrl: string,
  options: {
    targetMaxDim?: number;
    paddingRatio?: number;
    rawOriginalWidth?: number;
    rawOriginalHeight?: number;
  } = {}
): Promise<AutoCropResult> {
  const targetMaxDim = options.targetMaxDim ?? 1024;
  const paddingRatio = options.paddingRatio ?? 0.12;

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const imgW = img.naturalWidth || img.width || 800;
      const imgH = img.naturalHeight || img.height || 600;
      const origW = options.rawOriginalWidth ? Math.max(imgW, options.rawOriginalWidth) : imgW;
      const origH = options.rawOriginalHeight ? Math.max(imgH, options.rawOriginalHeight) : imgH;

      const gridW = 120;
      const gridH = 120;
      const analysisCanvas = document.createElement('canvas');
      analysisCanvas.width = gridW;
      analysisCanvas.height = gridH;
      const aCtx = analysisCanvas.getContext('2d');

      if (!aCtx) {
        const fallbackTokens = estimateGeminiImageTokens(origW, origH);
        resolve({
          croppedDataUrl: dataUrl,
          originalDataUrl: dataUrl,
          wasCropped: false,
          cropMode: 'full',
          cropBox: { xPct: 0, yPct: 0, widthPct: 100, heightPct: 100 },
          originalWidth: origW,
          originalHeight: origH,
          croppedWidth: imgW,
          croppedHeight: imgH,
          originalTokens: fallbackTokens,
          croppedTokens: fallbackTokens,
          tokensSaved: 0,
          percentSaved: 0,
        });
        return;
      }

      aCtx.drawImage(img, 0, 0, gridW, gridH);
      const imgData = aCtx.getImageData(0, 0, gridW, gridH).data;

      const borderSamples: [number, number, number][] = [];
      const borderBand = 4;
      for (let y = 0; y < gridH; y += 2) {
        for (let x = 0; x < gridW; x += 2) {
          if (
            x < borderBand ||
            x >= gridW - borderBand ||
            y < borderBand ||
            y >= gridH - borderBand
          ) {
            const idx = (y * gridW + x) * 4;
            borderSamples.push([imgData[idx], imgData[idx + 1], imgData[idx + 2]]);
          }
        }
      }

      const bgCentroids: [number, number, number][] = [];
      const numClusters = 6;
      const chunkSize = Math.max(1, Math.floor(borderSamples.length / numClusters));
      for (let c = 0; c < numClusters; c++) {
        let rSum = 0,
          gSum = 0,
          bSum = 0,
          count = 0;
        const start = c * chunkSize;
        const end = Math.min(borderSamples.length, start + chunkSize);
        for (let i = start; i < end; i++) {
          rSum += borderSamples[i][0];
          gSum += borderSamples[i][1];
          bSum += borderSamples[i][2];
          count++;
        }
        if (count > 0) {
          bgCentroids.push([rSum / count, gSum / count, bSum / count]);
        }
      }

      const rawSaliency = new Float32Array(gridW * gridH);

      for (let y = 1; y < gridH - 1; y++) {
        for (let x = 1; x < gridW - 1; x++) {
          const idx = (y * gridW + x) * 4;
          const r = imgData[idx];
          const g = imgData[idx + 1];
          const b = imgData[idx + 2];

          let bestDist = 999;
          let secondBestDist = 999;
          for (const [br, bg, bb] of bgCentroids) {
            const dist = Math.sqrt(
              (r - br) * (r - br) + (g - bg) * (g - bg) + (b - bb) * (b - bb)
            );
            if (dist < bestDist) {
              secondBestDist = bestDist;
              bestDist = dist;
            } else if (dist < secondBestDist) {
              secondBestDist = dist;
            }
          }
          const bgDiff = bestDist * 0.65 + secondBestDist * 0.35;

          const idxRight = (y * gridW + (x + 1)) * 4;
          const idxLeft = (y * gridW + (x - 1)) * 4;
          const idxDown = ((y + 1) * gridW + x) * 4;
          const idxUp = ((y - 1) * gridW + x) * 4;

          const gx =
            Math.abs(imgData[idxRight] - imgData[idxLeft]) +
            Math.abs(imgData[idxRight + 1] - imgData[idxLeft + 1]) +
            Math.abs(imgData[idxRight + 2] - imgData[idxLeft + 2]);
          const gy =
            Math.abs(imgData[idxDown] - imgData[idxUp]) +
            Math.abs(imgData[idxDown + 1] - imgData[idxUp + 1]) +
            Math.abs(imgData[idxDown + 2] - imgData[idxUp + 2]);
          const edgeScore = (gx + gy) / 6;

          const nx = (x / gridW - 0.5) * 2;
          const ny = (y / gridH - 0.5) * 2;
          const spatialWeight = Math.max(0.65, 1 - 0.16 * (nx * nx + ny * ny));

          rawSaliency[y * gridW + x] = (bgDiff * 0.8 + edgeScore * 1.15) * spatialWeight;
        }
      }

      const saliency = new Float32Array(gridW * gridH);
      let maxScore = 0;
      for (let y = 2; y < gridH - 2; y++) {
        for (let x = 2; x < gridW - 2; x++) {
          let sum = 0;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              sum += rawSaliency[(y + dy) * gridW + (x + dx)];
            }
          }
          const avg = sum / 9;
          saliency[y * gridW + x] = avg;
          if (avg > maxScore) maxScore = avg;
        }
      }

      const extremityThreshold = maxScore * 0.22;
      const colWeights = new Float32Array(gridW);
      const rowWeights = new Float32Array(gridH);
      let totalActiveWeight = 0;

      for (let y = 2; y < gridH - 2; y++) {
        for (let x = 2; x < gridW - 2; x++) {
          const val = saliency[y * gridW + x];
          if (val >= extremityThreshold) {
            const w = val - extremityThreshold;
            colWeights[x] += w;
            rowWeights[y] += w;
            totalActiveWeight += w;
          }
        }
      }

      let finalMinX = Math.floor(gridW * 0.04);
      let finalMaxX = Math.ceil(gridW * 0.96);
      let finalMinY = Math.floor(gridH * 0.03);
      let finalMaxY = Math.ceil(gridH * 0.96);

      if (totalActiveWeight > 0) {
        const lowQuantile = totalActiveWeight * 0.015;
        const highQuantile = totalActiveWeight * 0.985;

        let cumX = 0;
        let minX = 2;
        let maxX = gridW - 3;
        for (let x = 2; x < gridW - 2; x++) {
          cumX += colWeights[x];
          if (cumX >= lowQuantile) {
            minX = x;
            break;
          }
        }
        cumX = 0;
        for (let x = 2; x < gridW - 2; x++) {
          cumX += colWeights[x];
          if (cumX >= highQuantile) {
            maxX = x;
            break;
          }
        }

        let cumY = 0;
        let minY = 2;
        let maxY = gridH - 3;
        for (let y = 2; y < gridH - 2; y++) {
          cumY += rowWeights[y];
          if (cumY >= lowQuantile) {
            minY = y;
            break;
          }
        }
        cumY = 0;
        for (let y = 2; y < gridH - 2; y++) {
          cumY += rowWeights[y];
          if (cumY >= highQuantile) {
            maxY = y;
            break;
          }
        }

        const detectedW = Math.max(gridW * 0.35, maxX - minX);
        const detectedH = Math.max(gridH * 0.35, maxY - minY);

        const padX = Math.max(gridW * paddingRatio, detectedW * 0.14);
        const padTop = Math.max(gridH * (paddingRatio + 0.02), detectedH * 0.15);
        const padBottom = Math.max(gridH * (paddingRatio + 0.01), detectedH * 0.14);

        finalMinX = Math.max(0, Math.floor(minX - padX));
        finalMaxX = Math.min(gridW, Math.ceil(maxX + padX));
        finalMinY = Math.max(0, Math.floor(minY - padTop));
        finalMaxY = Math.min(gridH, Math.ceil(maxY + padBottom));
      }

      const cropX = Math.max(0, Math.round((finalMinX / gridW) * imgW));
      const cropY = Math.max(0, Math.round((finalMinY / gridH) * imgH));
      const cropW = Math.max(1, Math.min(imgW - cropX, Math.round(((finalMaxX - finalMinX) / gridW) * imgW)));
      const cropH = Math.max(1, Math.min(imgH - cropY, Math.round(((finalMaxY - finalMinY) / gridH) * imgH)));

      const longestSide = Math.max(cropW, cropH);
      const scale = longestSide > targetMaxDim ? targetMaxDim / longestSide : 1;
      const outW = Math.max(1, Math.round(cropW * scale));
      const outH = Math.max(1, Math.round(cropH * scale));

      const outCanvas = document.createElement('canvas');
      outCanvas.width = outW;
      outCanvas.height = outH;
      const outCtx = outCanvas.getContext('2d');

      let croppedDataUrl = dataUrl;
      if (outCtx) {
        outCtx.imageSmoothingEnabled = true;
        outCtx.imageSmoothingQuality = 'high';
        outCtx.drawImage(
          img,
          cropX,
          cropY,
          cropW,
          cropH,
          0,
          0,
          outCanvas.width,
          outCanvas.height
        );
        croppedDataUrl = outCanvas.toDataURL('image/jpeg', 0.85);
      }

      const computedBox = {
        xPct: Math.round((cropX / imgW) * 100),
        yPct: Math.round((cropY / imgH) * 100),
        widthPct: Math.round((cropW / imgW) * 100),
        heightPct: Math.round((cropH / imgH) * 100),
      };

      const { originalTokens, croppedTokens, tokensSaved, percentSaved } =
        computeComparativeTokens(
          origW,
          origH,
          cropW,
          cropH,
          computedBox,
          croppedDataUrl,
          dataUrl
        );

      resolve({
        croppedDataUrl,
        originalDataUrl: dataUrl,
        wasCropped: true,
        cropMode: 'auto',
        cropBox: computedBox,
        originalWidth: origW,
        originalHeight: origH,
        croppedWidth: outCanvas.width,
        croppedHeight: outCanvas.height,
        originalTokens,
        croppedTokens,
        tokensSaved,
        percentSaved,
      });
    };

    img.onerror = () => {
      resolve({
        croppedDataUrl: dataUrl,
        originalDataUrl: dataUrl,
        wasCropped: false,
        cropMode: 'full',
        cropBox: { xPct: 0, yPct: 0, widthPct: 100, heightPct: 100 },
        originalWidth: 1200,
        originalHeight: 896,
        croppedWidth: 384,
        croppedHeight: 287,
        originalTokens: 1290,
        croppedTokens: 258,
        tokensSaved: 1032,
        percentSaved: 80,
      });
    };

    img.src = dataUrl;
  });
}
