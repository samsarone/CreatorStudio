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
  record.parent_session_id
);

export const getSessionIdentifier = (record = {}) => (
  getIdentifierString(getRecordIdentifier(record))
);

const hasSessionMetadata = (record = {}) => [
  'name',
  'layers',
  'sessionType',
  'sessionName',
  'thumbnail',
  'thumbnailUrl',
  'thumbnailURL',
  'previewImageUrl',
  'previewImageURL',
  'videoLink',
  'remoteURL',
  'publishedVideoURL',
  'isExpressGeneration',
  'sessionOwnerId',
  'isSessionOwner',
  'isImportedSession',
].some((field) => record[field] !== undefined);

export const isLayerListRecord = (record = {}) => (
  Boolean(
    getParentSessionIdentifier(record) ||
    record.layerId ||
    record.layer_id ||
    record.sceneId ||
    record.scene_id ||
    record.imageSession ||
    record.layer ||
    record.scene ||
    record.durationOffset !== undefined ||
    record.duration !== undefined ||
    record.prompt !== undefined ||
    record.status !== undefined ||
    record.frames !== undefined ||
    record.layerAiVideoType ||
    record.layerBaseAiImageType ||
    record.connectedLayerId
  )
);

export const isSessionListRecord = (record = {}) => (
  Boolean(
    record &&
    typeof record === 'object' &&
    getIdentifierString(getRecordIdentifier(record)) &&
    !isLayerListRecord(record) &&
    (
      typeof record.name === 'string' ||
      typeof record.sessionName === 'string' ||
      Array.isArray(record.layers) ||
      record.sessionType === 'video'
    ) &&
    hasSessionMetadata(record)
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
    const sessionRecord = embeddedSession || record;
    // A scene/layer row is never promoted into a project tile. Only a
    // session-shaped record from the list endpoint may reach the grid.
    if (!embeddedSession && !isSessionListRecord(record)) {
      return;
    }

    const sessionIdentifier = getSessionIdentifier(sessionRecord);
    if (!sessionIdentifier) {
      return;
    }

    if (sessionsById.has(sessionIdentifier)) {
      return;
    }

    sessionsById.set(sessionIdentifier, sessionRecord);
  });

  return Array.from(sessionsById.values());
};
