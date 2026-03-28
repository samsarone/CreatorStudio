import React, { useEffect } from 'react';

import TextStylePanel, {
  buildTextStyleDraft,
  mapTextDraftToConfig,
} from '../../../common/TextStylePanel.jsx';

const STORAGE_KEYS = {
  fontSize: 'selected_text_config_fontSize',
  fontFamily: 'selected_text_config_fontFamily',
  fillColor: 'selected_text_config_fillColor',
  strokeColor: 'selected_text_config_strokeColor',
  strokeWidth: 'selected_text_config_strokeWidth',
  bold: 'selected_text_config_bold',
  italic: 'selected_text_config_italic',
  underline: 'selected_text_config_underline',
  textAlign: 'selected_text_config_textAlign',
  lineHeight: 'selected_text_config_lineHeight',
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
      ...mapTextDraftToConfig(resolvedDraft),
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
    const storedFontSize = localStorage.getItem(STORAGE_KEYS.fontSize);
    const storedFontFamily = localStorage.getItem(STORAGE_KEYS.fontFamily);
    const storedFillColor = localStorage.getItem(STORAGE_KEYS.fillColor);
    const storedStrokeColor = localStorage.getItem(STORAGE_KEYS.strokeColor);
    const storedStrokeWidth = localStorage.getItem(STORAGE_KEYS.strokeWidth);
    const storedBold = localStorage.getItem(STORAGE_KEYS.bold);
    const storedItalic = localStorage.getItem(STORAGE_KEYS.italic);
    const storedUnderline = localStorage.getItem(STORAGE_KEYS.underline);
    const storedTextAlign = localStorage.getItem(STORAGE_KEYS.textAlign);
    const storedLineHeight = localStorage.getItem(STORAGE_KEYS.lineHeight);
    const storedAddText = localStorage.getItem(STORAGE_KEYS.addText);

    const nextConfig = {
      fontSize: storedFontSize ? parseInt(storedFontSize, 10) : undefined,
      fontFamily: storedFontFamily || undefined,
      fillColor: storedFillColor || undefined,
      strokeColor: storedStrokeColor || undefined,
      strokeWidth: storedStrokeWidth ? parseInt(storedStrokeWidth, 10) : undefined,
      bold: storedBold === 'true' ? true : undefined,
      italic: storedItalic === 'true' ? true : undefined,
      underline: storedUnderline === 'true' ? true : undefined,
      textAlign: storedTextAlign || undefined,
      lineHeight: storedLineHeight ? parseFloat(storedLineHeight) : undefined,
    };

    setTextConfig((prev) => ({
      ...(prev || {}),
      ...Object.fromEntries(
        Object.entries(nextConfig).filter(([, value]) => value !== undefined)
      ),
    }));

    if (storedAddText) {
      setAddText(storedAddText);
    }
  }, [setAddText, setTextConfig]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.fontSize, `${draft.fontSize}`);
    localStorage.setItem(STORAGE_KEYS.fontFamily, draft.fontFamily);
    localStorage.setItem(STORAGE_KEYS.fillColor, draft.fillColor);
    localStorage.setItem(STORAGE_KEYS.strokeColor, draft.strokeColor);
    localStorage.setItem(STORAGE_KEYS.strokeWidth, `${draft.strokeWidth}`);
    localStorage.setItem(STORAGE_KEYS.bold, `${draft.bold}`);
    localStorage.setItem(STORAGE_KEYS.italic, `${draft.italic}`);
    localStorage.setItem(STORAGE_KEYS.underline, `${draft.underline}`);
    localStorage.setItem(STORAGE_KEYS.textAlign, draft.textAlign);
    localStorage.setItem(STORAGE_KEYS.lineHeight, `${draft.lineHeight}`);
    localStorage.setItem(STORAGE_KEYS.addText, draft.text || '');
  }, [draft]);

  return (
    <TextStylePanel
      value={draft}
      onChange={handleDraftChange}
      onSubmit={handleSubmit}
      submitLabel="Add text"
      submitDisabled={!`${draft.text || ''}`.trim()}
      editorVariant={editorVariant}
      header={editorVariant === 'imageStudio' ? 'Add Text' : 'Text'}
      helperText={
        editorVariant === 'imageStudio'
          ? 'Pick a font, set text and outline colors, then drop the layer onto the canvas.'
          : 'Set the copy and styling, then add a text layer to the active frame.'
      }
    />
  );
}
