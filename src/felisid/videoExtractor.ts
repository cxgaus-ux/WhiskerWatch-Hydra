export interface ExtractedVideoFrame {
  id: string;
  videoName: string;
  timestampSeconds: number;
  dataUrl: string;
}

export async function extractFramesFromVideo(
  file: File,
  frameCount: number = 3
): Promise<ExtractedVideoFrame[]> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    const objectUrl = URL.createObjectURL(file);
    video.src = objectUrl;

    const frames: ExtractedVideoFrame[] = [];

    video.onloadedmetadata = async () => {
      const duration = video.duration || 1;
      const timestamps: number[] = [];
      for (let i = 1; i <= frameCount; i++) {
        timestamps.push(Math.min(duration - 0.1, (duration * i) / (frameCount + 1)));
      }

      for (let i = 0; i < timestamps.length; i++) {
        const time = timestamps[i];
        await new Promise<void>((resSeek) => {
          const onSeeked = () => {
            video.removeEventListener('seeked', onSeeked);

            const canvas = document.createElement('canvas');
            const maxDim = 1000;
            let w = video.videoWidth || 640;
            let h = video.videoHeight || 480;

            if (w > maxDim || h > maxDim) {
              if (w > h) {
                h = Math.round((h * maxDim) / w);
                w = maxDim;
              } else {
                w = Math.round((w * maxDim) / h);
                h = maxDim;
              }
            }

            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(video, 0, 0, w, h);
              frames.push({
                id: `frame-${Date.now()}-${i}`,
                videoName: file.name,
                timestampSeconds: Math.round(time * 10) / 10,
                dataUrl: canvas.toDataURL('image/jpeg', 0.85),
              });
            }
            resSeek();
          };

          video.addEventListener('seeked', onSeeked);
          video.currentTime = time;
        });
      }

      URL.revokeObjectURL(objectUrl);
      resolve(frames);
    };

    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve([]);
    };
  });
}
