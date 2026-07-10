const getIdentifierString = (value) => {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'string' || typeof value === 'number') {
    return String(value);
  }

  if (typeof value === 'object' && typeof value.$oid === 'string') {
    return value.$oid;
  }

  const stringValue = value?.toString?.();
  return stringValue && stringValue !== '[object Object]' ? stringValue : '';
};

const getRecordIdentifier = (record = {}) => (
  record.id ?? record._id
);

const getParentSessionIdentifier = (record = {}) => (
  record.sessionId ??
  record.session_id ??
  record.videoSessionId ??
  record.video_session_id ??
  record.parentSessionId ??
  record.parent_session_id ??
  record.projectId ??
  record.project_id
);

export const getSessionIdentifier = (record = {}) => (
  getIdentifierString(getParentSessionIdentifier(record)) ||
  getIdentifierString(getRecordIdentifier(record))
);

const hasDistinctParentSession = (record = {}) => {
  const parentSessionId = getIdentifierString(getParentSessionIdentifier(record));
  const recordId = getIdentifierString(getRecordIdentifier(record));

  return Boolean(parentSessionId && recordId && parentSessionId !== recordId);
};

const hasSessionMetadata = (record = {}) => [
  'layers',
  'sessionType',
  'sessionName',
  'sessionDescription',
  'aspectRatio',
  'aspect_ratio',
  'videoLink',
  'remoteURL',
  'publishedVideoURL',
  'isExpressGeneration',
  'ispublishedVideo',
  'isPublished',
].some((field) => record[field] !== undefined);

export const isLayerListRecord = (record = {}) => (
  Boolean(
    hasDistinctParentSession(record) ||
    record.layerId ||
    record.layer_id ||
    record.sceneId ||
    record.scene_id ||
    record.imageSession ||
    record.layer ||
    record.scene ||
    record.durationOffset !== undefined ||
    record.layerAiVideoType ||
    record.layerBaseAiImageType ||
    record.connectedLayerId ||
    (record.prompt !== undefined && record.duration !== undefined && !hasSessionMetadata(record))
  )
);

const getEmbeddedSessionRecord = (record = {}) => {
  const embeddedRecord = [record.session, record.videoSession, record.project]
    .find((candidate) => (
      candidate &&
      typeof candidate === 'object' &&
      !Array.isArray(candidate) &&
      getSessionIdentifier(candidate)
    ));

  return embeddedRecord || null;
};

const withSessionIdentifier = (record, sessionIdentifier) => {
  if (!sessionIdentifier) {
    return record;
  }

  const recordIdentifier = getIdentifierString(getRecordIdentifier(record));
  if (recordIdentifier === sessionIdentifier) {
    return record;
  }

  return {
    ...record,
    id: sessionIdentifier,
    _id: record._id ?? sessionIdentifier,
  };
};

export const normalizeSessionListData = (records) => {
  if (!Array.isArray(records)) {
    return [];
  }

  const sessionsById = new Map();

  records.forEach((record) => {
    if (!record || typeof record !== 'object') {
      return;
    }

    const embeddedSession = getEmbeddedSessionRecord(record);
    const isLayerRecord = !embeddedSession && isLayerListRecord(record);
    const parentSessionIdentifier = getIdentifierString(getParentSessionIdentifier(record));
    if (isLayerRecord && !parentSessionIdentifier) {
      return;
    }

    const sessionRecord = embeddedSession || record;
    const sessionIdentifier = getSessionIdentifier(sessionRecord) || getSessionIdentifier(record);
    if (!sessionIdentifier) {
      return;
    }

    const existingRecord = sessionsById.get(sessionIdentifier);
    if (existingRecord && (!existingRecord.isLayerRecord || isLayerRecord)) {
      return;
    }

    sessionsById.set(sessionIdentifier, {
      isLayerRecord,
      record: withSessionIdentifier(sessionRecord, sessionIdentifier),
    });
  });

  return Array.from(sessionsById.values()).map(({ record }) => record);
};
