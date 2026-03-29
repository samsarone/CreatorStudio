import React, { useEffect } from 'react';

import TextStylePanel, {
  buildTextStyleDraft,
  loadStoredTextStyleConfig,
  mapTextDraftToConfig,
  mapTextDraftToStyleConfig,
  persistTextStyleConfig,
} from '../../../common/TextStylePanel.jsx';

const STORAGE_KEYS = {
  addText: 'selected_text_config_addText',
};

export default function AddText(props) {
  const {
    setAddText,
    submitAddText,
    addText,
    textConfig,
    setTextConfig,
    editorVariant = 'videoStudio',
  } = props;

  const draft = buildTextStyleDraft({
    text: addText || '',
    ...(textConfig || {}),
  });

  const handleDraftChange = (nextDraft) => {
    const resolvedDraft = buildTextStyleDraft(nextDraft);
    setAddText(resolvedDraft.text);
    setTextConfig((prev) => ({
      ...(prev || {}),
      ...mapTextDraftToStyleConfig(resolvedDraft),
    }));
  };

  const handleSubmit = () => {
    const normalizedText = `${draft.text || ''}`.trim();
    if (!normalizedText) return;

    submitAddText?.({
      text: normalizedText,
      config: mapTextDraftToConfig(draft),
    });
  };

  useEffect(() => {
    const storedStyleConfig = loadStoredTextStyleConfig();
    const storedAddText = localStorage.getItem(STORAGE_KEYS.addText);

    setTextConfig((prev) => ({
      ...(prev || {}),
      ...storedStyleConfig,
    }));

    if (storedAddText) {
      setAddText(storedAddText);
    }
  }, [setAddText, setTextConfig]);

  useEffect(() => {
    persistTextStyleConfig(draft);
    localStorage.setItem(STORAGE_KEYS.addText, draft.text || '');
  }, [draft]);

  return (
    <TextStylePanel
      value={draft}
      onChange={handleDraftChange}
      onSubmit={handleSubmit}
      submitLabel="Add"
      submitDisabled={!`${draft.text || ''}`.trim()}
      editorVariant={editorVariant}
      header="Text"
      density="compact"
    />
  );
}
