import test from 'node:test';
import assert from 'node:assert/strict';

import {
  extractDeploymentInferenceModelValues,
  filterHostedInferenceModelOptions,
  hasValidatedAlibabaQwenInference,
  labelOptionsForDeploymentInferenceProviders,
  resolveAllowedInferenceModelOption,
} from './deploymentInferencePolicy.mjs';

const MODEL_OPTIONS = [
  { label: 'GPT 5.6 Sol', value: 'gpt-5.6-sol' },
  { label: 'Gemini 3.1 Pro', value: 'gemini-3.1-pro' },
  { label: 'Qwen 3.8 Max Preview', value: 'QWEN3.8' },
];

test('hosted inference exposes the canonical Qwen 3.8 selection', () => {
  assert.deepEqual(
    filterHostedInferenceModelOptions(MODEL_OPTIONS).map((option) => option.value),
    ['gpt-5.6-sol', 'gemini-3.1-pro', 'QWEN3.8'],
  );
});

test('Docker exposes Qwen only with an explicit model and validated Alibaba provenance', () => {
  const validatedPayload = {
    deployment: {
      providers: ['alibabaCloud'],
      models: ['QWEN3.8'],
      modelProviders: { 'QWEN3.8': 'alibabaCloud' },
    },
  };

  assert.equal(hasValidatedAlibabaQwenInference(validatedPayload), true);
  assert.deepEqual(extractDeploymentInferenceModelValues(validatedPayload), ['QWEN3.8']);
  assert.equal(
    labelOptionsForDeploymentInferenceProviders(MODEL_OPTIONS, {
      'QWEN3.8': 'alibabaCloud',
    })[2].label,
    'Qwen 3.8 Max Preview',
  );

  const incompletePayloads = [
    { deployment: { providers: ['alibabaCloud'], modelProviders: { 'QWEN3.8': 'alibabaCloud' } } },
    { deployment: { models: ['QWEN3.8'], modelProviders: { 'QWEN3.8': 'alibabaCloud' } } },
    { deployment: { providers: ['alibabaCloud'], models: ['QWEN3.8'] } },
  ];

  incompletePayloads.forEach((payload) => {
    assert.equal(hasValidatedAlibabaQwenInference(payload), false);
    assert.equal(extractDeploymentInferenceModelValues(payload).includes('QWEN3.8'), false);
  });
});

test('provider fallbacks expose their configured inference models', () => {
  assert.deepEqual(
    extractDeploymentInferenceModelValues({ deployment: { providers: ['samsar'] } }),
    ['gpt-5.6-sol', 'gemini-3.1-pro', 'QWEN3.8'],
  );
  assert.deepEqual(
    extractDeploymentInferenceModelValues({ deployment: { providers: ['openai', 'googleCloud'] } }),
    ['gpt-5.6-sol', 'gemini-3.1-pro'],
  );
  assert.deepEqual(
    extractDeploymentInferenceModelValues({ deployment: { providers: ['alibabaCloud'] } }),
    [],
  );
});

test('OpenRouter alone exposes every inference model with validated Qwen provenance', () => {
  const payload = {
    deployment: {
      providers: ['openrouter'],
      models: ['gpt-5.6-sol', 'gemini-3.1-pro', 'QWEN3.8'],
      modelProviders: {
        'gpt-5.6-sol': 'openrouter',
        'gemini-3.1-pro': 'openrouter',
        'QWEN3.8': 'openrouter',
      },
    },
  };
  assert.equal(hasValidatedAlibabaQwenInference(payload), true);
  assert.equal(
    labelOptionsForDeploymentInferenceProviders(MODEL_OPTIONS, {
      'QWEN3.8': 'openrouter',
    })[2].label,
    'Qwen 3.8 Max Preview',
  );
  assert.deepEqual(extractDeploymentInferenceModelValues(payload), [
    'gpt-5.6-sol',
    'gemini-3.1-pro',
    'QWEN3.8',
  ]);
});

test('model preferences resolve against the allowed options without mutating canonical options', () => {
  const hostedOptions = filterHostedInferenceModelOptions(MODEL_OPTIONS);
  assert.equal(
    resolveAllowedInferenceModelOption('QWEN3.8', hostedOptions)?.value,
    'QWEN3.8',
  );
  assert.equal(
    resolveAllowedInferenceModelOption('QWEN3.8', [{ label: 'Gemini', value: 'gemini-3.1-pro' }])?.value,
    'gemini-3.1-pro',
  );
  assert.equal(
    resolveAllowedInferenceModelOption('qwen-3.7', MODEL_OPTIONS)?.value,
    'QWEN3.8',
  );
  assert.deepEqual(MODEL_OPTIONS.map((option) => option.value), [
    'gpt-5.6-sol',
    'gemini-3.1-pro',
    'QWEN3.8',
  ]);
});
