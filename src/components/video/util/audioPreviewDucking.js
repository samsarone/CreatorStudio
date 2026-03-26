const MUSIC_DUCK_FADE_DURATION_SECONDS = 0.5;
const MUSIC_DUCKED_VOLUME_RATIO = 0.225;
const MUSIC_DUCK_MERGE_GAP_SECONDS = MUSIC_DUCK_FADE_DURATION_SECONDS;
const MUSIC_SIDECHAIN_THRESHOLD = 0.009;
const MUSIC_SIDECHAIN_RATIO = 14;
const MUSIC_SIDECHAIN_ATTACK_SECONDS = 0.09;
const MUSIC_SIDECHAIN_RELEASE_SECONDS = 0.9;
const MUSIC_SIDECHAIN_KNEE = 6;

export function clampAudioValue(value, min = 0, max = 1) {
  return Math.min(Math.max(Number(value) || 0, min), max);
}

export function normalizeAudioLayerType(value) {
  if (typeof value !== 'string') {
    return '';
  }

  const normalized = value.trim().toLowerCase();
  if (
    normalized === 'music' ||
    normalized === 'background_music' ||
    normalized === 'background music' ||
    normalized === 'bgm' ||
    normalized === 'backing_track' ||
    normalized === 'backing track'
  ) {
    return 'music';
  }

  if (normalized === 'sound') {
    return 'sound_effect';
  }

  if (normalized === 'lip sync') {
    return 'lip_sync';
  }

  return normalized;
}

export function isMusicLikeAudioType(value) {
  return normalizeAudioLayerType(value) === 'music';
}

export function isSpeechLikeAudioType(value) {
  const normalized = normalizeAudioLayerType(value);
  return (
    normalized === 'speech' ||
    normalized === 'lip_sync' ||
    normalized === 'user_video'
  );
}

export function shouldDuckMusicAgainstAudioType(value) {
  const normalized = normalizeAudioLayerType(value);
  return Boolean(normalized) && normalized !== 'music';
}

export function resolvePreviewLayerBaseVolume(audioLayer = {}) {
  const rawVolume = Number(audioLayer?.volume);
  if (!Number.isFinite(rawVolume) || rawVolume < 0) {
    return 1;
  }

  const normalizedAudioType = normalizeAudioLayerType(audioLayer?.generationType);
  const multiplier = isSpeechLikeAudioType(normalizedAudioType) ? 8 : 2;
  return clampAudioValue((rawVolume * multiplier) / 100, 0, 8);
}

export function isRenderablePreviewAudioLayer(layer = {}) {
  if (!layer) {
    return false;
  }

  const isSelectedLayer = Boolean(layer.isEnabled || layer.defaultSelected);
  return isSelectedLayer && layer.generationStatus !== 'PENDING';
}

export function resolveAudioLayerSourceValue(audioLayer = {}) {
  if (typeof audioLayer.selectedLocalAudioLink === 'string' && audioLayer.selectedLocalAudioLink.trim()) {
    return audioLayer.selectedLocalAudioLink.trim();
  }

  if (Array.isArray(audioLayer.localAudioLinks) && audioLayer.localAudioLinks.length > 0) {
    const localAudioLink = audioLayer.localAudioLinks.find((link) => typeof link === 'string' && link.trim());
    if (localAudioLink) {
      return localAudioLink.trim();
    }
  }

  if (typeof audioLayer.url === 'string' && audioLayer.url.trim()) {
    return audioLayer.url.trim();
  }

  if (typeof audioLayer.selectedRemoteAudioLink === 'string' && audioLayer.selectedRemoteAudioLink.trim()) {
    return audioLayer.selectedRemoteAudioLink.trim();
  }

  if (Array.isArray(audioLayer.remoteAudioLinks) && audioLayer.remoteAudioLinks.length > 0) {
    const remoteAudioLink = audioLayer.remoteAudioLinks.find((link) => typeof link === 'string' && link.trim());
    if (remoteAudioLink) {
      return remoteAudioLink.trim();
    }
  }

  if (Array.isArray(audioLayer.remoteAudioData) && audioLayer.remoteAudioData.length > 0) {
    const remoteAudioData = audioLayer.remoteAudioData.find((audioData) => (
      typeof audioData?.audio_url === 'string' && audioData.audio_url.trim()
    ));
    if (remoteAudioData?.audio_url) {
      return remoteAudioData.audio_url.trim();
    }
  }

  return null;
}

export function resolvePreviewMediaUrl(value, baseUrl = '') {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return null;
  }

  if (/^https?:\/\//i.test(trimmedValue)) {
    return trimmedValue;
  }

  const normalizedPath = trimmedValue.startsWith('/') ? trimmedValue : `/${trimmedValue}`;
  const trimmedBaseUrl = typeof baseUrl === 'string'
    ? baseUrl.trim().replace(/\/+$/, '')
    : '';

  if (!trimmedBaseUrl) {
    return normalizedPath;
  }

  return `${trimmedBaseUrl}${normalizedPath}`;
}

export function resolvePreviewAudioUrl(audioLayer = {}, processorApiUrl = '') {
  const sourceValue = resolveAudioLayerSourceValue(audioLayer);
  if (!sourceValue) {
    return null;
  }

  return resolvePreviewMediaUrl(sourceValue, processorApiUrl);
}

export function buildMusicDuckingWindows({
  musicStartTime,
  musicEndTime,
  duckingLayers,
  fadeDurationSeconds = MUSIC_DUCK_FADE_DURATION_SECONDS,
  mergeGapSeconds = MUSIC_DUCK_MERGE_GAP_SECONDS,
}) {
  if (!Array.isArray(duckingLayers) || duckingLayers.length === 0) {
    return [];
  }

  const overlapWindows = duckingLayers
    .map((layer) => {
      const layerStartTime = Number.isFinite(Number(layer?.startTime))
        ? Math.max(0, Number(layer.startTime))
        : 0;
      const layerEndTime = Number.isFinite(Number(layer?.endTime))
        ? Math.max(layerStartTime, Number(layer.endTime))
        : layerStartTime;
      const overlapStart = Math.max(musicStartTime, layerStartTime);
      const overlapEnd = Math.min(musicEndTime, layerEndTime);
      if (overlapEnd <= overlapStart) {
        return null;
      }

      return {
        start: overlapStart,
        end: overlapEnd,
      };
    })
    .filter(Boolean)
    .sort((left, right) => {
      if (left.start !== right.start) {
        return left.start - right.start;
      }
      return left.end - right.end;
    });

  if (overlapWindows.length === 0) {
    return [];
  }

  const mergedWindows = [overlapWindows[0]];
  for (let index = 1; index < overlapWindows.length; index += 1) {
    const currentWindow = overlapWindows[index];
    const previousWindow = mergedWindows[mergedWindows.length - 1];

    if (currentWindow.start <= previousWindow.end + mergeGapSeconds) {
      previousWindow.end = Math.max(previousWindow.end, currentWindow.end);
      continue;
    }

    mergedWindows.push(currentWindow);
  }

  return mergedWindows.map((window) => {
    const windowDuration = Math.max(0, window.end - window.start);
    return {
      start: window.start,
      end: window.end,
      fadeDuration: Math.min(fadeDurationSeconds, windowDuration / 2),
    };
  });
}

export function getMusicDuckingVolumeAtTime(timeSeconds, duckingWindows) {
  if (!Array.isArray(duckingWindows) || duckingWindows.length === 0) {
    return 1;
  }

  const time = Number.isFinite(Number(timeSeconds)) ? Math.max(0, Number(timeSeconds)) : 0;

  for (const duckingWindow of duckingWindows) {
    const fadeDuration = Number.isFinite(Number(duckingWindow?.fadeDuration))
      ? Math.max(0, Number(duckingWindow.fadeDuration))
      : 0;
    const duckStart = Number.isFinite(Number(duckingWindow?.start))
      ? Math.max(0, Number(duckingWindow.start))
      : 0;
    const duckEnd = Number.isFinite(Number(duckingWindow?.end))
      ? Math.max(duckStart, Number(duckingWindow.end))
      : duckStart;

    if (duckEnd <= duckStart) {
      continue;
    }

    if (fadeDuration <= 0) {
      if (time >= duckStart && time <= duckEnd) {
        return MUSIC_DUCKED_VOLUME_RATIO;
      }
      continue;
    }

    const fadeInStart = Math.max(0, duckStart - fadeDuration);
    const fadeOutEnd = duckEnd + fadeDuration;

    if (time < fadeInStart || time >= fadeOutEnd) {
      continue;
    }

    if (time < duckStart) {
      const fadeProgress = clampAudioValue((time - fadeInStart) / fadeDuration);
      return 1 - ((1 - MUSIC_DUCKED_VOLUME_RATIO) * fadeProgress);
    }

    if (time < duckEnd) {
      return MUSIC_DUCKED_VOLUME_RATIO;
    }

    const fadeProgress = clampAudioValue((time - duckEnd) / fadeDuration);
    return MUSIC_DUCKED_VOLUME_RATIO + ((1 - MUSIC_DUCKED_VOLUME_RATIO) * fadeProgress);
  }

  return 1;
}

export function measureAnalyserRms(analyser, sampleBuffer) {
  if (!analyser || !sampleBuffer) {
    return 0;
  }

  analyser.getByteTimeDomainData(sampleBuffer);
  let totalPower = 0;

  for (let index = 0; index < sampleBuffer.length; index += 1) {
    const centeredValue = (sampleBuffer[index] - 128) / 128;
    totalPower += centeredValue * centeredValue;
  }

  return Math.sqrt(totalPower / sampleBuffer.length);
}

export function computePreviewSidechainGain(sidechainLevel) {
  const inputLevel = clampAudioValue(sidechainLevel);
  if (inputLevel <= MUSIC_SIDECHAIN_THRESHOLD) {
    return 1;
  }

  const compressedLevel = MUSIC_SIDECHAIN_THRESHOLD
    + ((inputLevel - MUSIC_SIDECHAIN_THRESHOLD) / MUSIC_SIDECHAIN_RATIO);
  const hardKneeGain = clampAudioValue(compressedLevel / inputLevel);

  if (MUSIC_SIDECHAIN_KNEE <= 1) {
    return hardKneeGain;
  }

  const kneeWidth = MUSIC_SIDECHAIN_THRESHOLD * ((MUSIC_SIDECHAIN_KNEE - 1) / 4);
  if (kneeWidth <= 0) {
    return hardKneeGain;
  }

  const kneeStart = Math.max(0, MUSIC_SIDECHAIN_THRESHOLD - (kneeWidth / 2));
  const kneeEnd = MUSIC_SIDECHAIN_THRESHOLD + (kneeWidth / 2);
  if (inputLevel <= kneeStart) {
    return 1;
  }

  if (inputLevel >= kneeEnd) {
    return hardKneeGain;
  }

  const blendProgress = clampAudioValue((inputLevel - kneeStart) / Math.max(kneeEnd - kneeStart, 0.0001));
  return 1 - ((1 - hardKneeGain) * blendProgress * blendProgress);
}

export function smoothPreviewDuckGain(currentGain, targetGain, deltaSeconds) {
  const resolvedCurrentGain = clampAudioValue(currentGain);
  const resolvedTargetGain = clampAudioValue(targetGain);
  const resolvedDeltaSeconds = Number.isFinite(Number(deltaSeconds))
    ? Math.max(0, Number(deltaSeconds))
    : 0;

  if (resolvedDeltaSeconds <= 0) {
    return resolvedTargetGain;
  }

  const isAttacking = resolvedTargetGain < resolvedCurrentGain;
  const timeConstant = isAttacking
    ? MUSIC_SIDECHAIN_ATTACK_SECONDS
    : MUSIC_SIDECHAIN_RELEASE_SECONDS;

  if (timeConstant <= 0) {
    return resolvedTargetGain;
  }

  const coefficient = Math.exp(-resolvedDeltaSeconds / timeConstant);
  return resolvedTargetGain + ((resolvedCurrentGain - resolvedTargetGain) * coefficient);
}
