#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const CONTRACT_ID = 'H3-WRITTEN-EXPLANATION-STATIC-QA-20260926-V1';
const RESULT_SCHEMA = 'H3_WRITTEN_EXPLANATION_STATIC_QA_RESULT_V1';
const DEFAULT_FIXTURE = path.join(__dirname, 'written_explanation_static_qa_fixtures.json');

const LEARNER_META_PATTERNS = [
  'あなたの回答','あなたが選んだ','あなたが選択した','今回の回答','今回選んだ',
  '正解できた','正解した','不正解だった','間違えた','誤答した'
];
const TEST_META_PATTERNS = [
  'この設問では','この問題では','内容一致問題では','タイトル選択では','消去法で','選択肢を消去'
];

function canonicalText(value) {
  return String(value == null ? '' : value)
    .normalize('NFC')
    .replace(/\r\n?/g, '\n')
    .replace(/\s+/gu, ' ')
    .trim()
    .replace(/(?:\s*[.!?。！？…])+\s*$/gu, '')
    .trim();
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function similarityText(value, aliases) {
  let text = canonicalText(value);
  const normalizedAliases = (Array.isArray(aliases) ? aliases : [])
    .map(canonicalText)
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);
  const sentinel = '\uE000TARGET\uE001';
  normalizedAliases.forEach(alias => {
    text = text.replace(new RegExp(escapeRegExp(alias), 'gu'), sentinel);
  });
  return text
    .toLowerCase()
    .replace(/[\p{P}\p{S}]+/gu, ' ')
    .replace(new RegExp(sentinel, 'gu'), '__TARGET__')
    .replace(/\s+/gu, ' ')
    .trim();
}

function tokenSet(value) {
  return new Set(String(value || '').split(/\s+/u).filter(Boolean));
}

function jaccard(a, b) {
  const aa = a instanceof Set ? a : new Set(a);
  const bb = b instanceof Set ? b : new Set(b);
  if (!aa.size && !bb.size) return 1;
  let intersection = 0;
  aa.forEach(x => { if (bb.has(x)) intersection += 1; });
  return intersection / (aa.size + bb.size - intersection);
}

function ngrams(value, n) {
  const chars = Array.from(String(value || '').replace(/\s+/gu, ''));
  const out = new Set();
  if (!chars.length) return out;
  if (chars.length < n) {
    out.add(chars.join(''));
    return out;
  }
  for (let i = 0; i <= chars.length - n; i += 1) {
    out.add(chars.slice(i, i + n).join(''));
  }
  return out;
}

function lcsRatio(a, b) {
  const aa = Array.from(String(a || '').replace(/\s+/gu, ''));
  const bb = Array.from(String(b || '').replace(/\s+/gu, ''));
  if (!aa.length && !bb.length) return 1;
  if (!aa.length || !bb.length) return 0;
  let prev = new Array(bb.length + 1).fill(0);
  for (let i = 1; i <= aa.length; i += 1) {
    const cur = new Array(bb.length + 1).fill(0);
    for (let j = 1; j <= bb.length; j += 1) {
      cur[j] = aa[i - 1] === bb[j - 1]
        ? prev[j - 1] + 1
        : Math.max(prev[j], cur[j - 1]);
    }
    prev = cur;
  }
  return prev[bb.length] / Math.max(aa.length, bb.length);
}

function metrics(a, b, aliases) {
  const na = similarityText(a, aliases);
  const nb = similarityText(b, aliases);
  return {
    token_jaccard: Number(jaccard(tokenSet(na), tokenSet(nb)).toFixed(6)),
    char_trigram_jaccard: Number(jaccard(ngrams(na, 3), ngrams(nb, 3)).toFixed(6)),
    normalized_lcs_ratio: Number(lcsRatio(na, nb).toFixed(6))
  };
}

function questionList(payload) {
  if (Array.isArray(payload.questions)) return payload.questions;
  if (Array.isArray(payload.sections)) {
    return payload.sections.map((section, i) => ({
      ...section,
      q_no: Number(section.q_no || i + 1)
    }));
  }
  return [];
}

function questionNumber(question, index) {
  return Number(question.q_no || question.q || index + 1);
}

function explanationOf(question) {
  if (question && question.explanation && typeof question.explanation === 'object') {
    return question.explanation;
  }
  if (question && question.review && typeof question.review === 'object') {
    return question.review;
  }
  return {};
}

function sourceContext(question) {
  if (question.qa_meta && question.qa_meta.source_context) return String(question.qa_meta.source_context);
  if (question.source_gate && question.source_gate.body_ko) return String(question.source_gate.body_ko);
  if (question.question_surface && question.question_surface.body) return String(question.question_surface.body);
  return String(question.question || '');
}

function correctChoiceSurface(question) {
  if (question.answer_text) return String(question.answer_text);
  if (question.qa_meta && question.qa_meta.correct_choice_surface) {
    return String(question.qa_meta.correct_choice_surface);
  }
  if (question.correct_answer_text) return String(question.correct_answer_text);
  if (question.source_gate && Array.isArray(question.source_gate.choices_ko)) {
    const pos = Number(question.source_gate.correct_position || 0);
    if (pos >= 1 && pos <= question.source_gate.choices_ko.length) {
      return String(question.source_gate.choices_ko[pos - 1]);
    }
  }
  if (question.question_surface && Array.isArray(question.question_surface.choices)) {
    const pos = Number(question.correct_answer_position || question.correct_answer || 0);
    const choice = question.question_surface.choices.find(x => Number(x.position) === pos);
    if (choice) return String(choice.text || '');
  }
  return '';
}

function completedAnswerSurface(question) {
  if (question.qa_meta && question.qa_meta.completed_answer_surface) {
    return String(question.qa_meta.completed_answer_surface);
  }
  if (question.audio) return String(question.audio);
  if (Array.isArray(question.audio_segments)) {
    return question.audio_segments.map(String).join('\n');
  }
  return String(question.script_text || '');
}

function targetAliases(question) {
  const raw = question.qa_meta && question.qa_meta.target_expressions;
  return Array.isArray(raw) ? raw.map(String).filter(Boolean) : [];
}

function representativeExamples(explanation) {
  const out = [];
  const blocks = Array.isArray(explanation.learning_blocks) ? explanation.learning_blocks : [];
  blocks.forEach((block, blockIndex) => {
    if (!block || typeof block !== 'object') return;
    if (typeof block.example_ko === 'string') {
      block.example_ko.replace(/\r\n?/g, '\n').split('\n').map(x => x.trim()).filter(Boolean)
        .forEach((text, lineIndex) => {
          out.push({
            text,
            field_path: `explanation.learning_blocks[${blockIndex}].example_ko[${lineIndex}]`
          });
        });
    }
    const tagged = block.qa_meta && block.qa_meta.representative_example_ko;
    const values = Array.isArray(tagged) ? tagged : (typeof tagged === 'string' ? [tagged] : []);
    values.map(String).map(x => x.trim()).filter(Boolean).forEach((text, taggedIndex) => {
      out.push({
        text,
        field_path: `explanation.learning_blocks[${blockIndex}].qa_meta.representative_example_ko[${taggedIndex}]`
      });
    });
  });
  return out;
}

function metaTexts(explanation) {
  const out = [];
  if (typeof explanation.reason === 'string') {
    out.push({text: explanation.reason, field_path: 'explanation.reason'});
  }
  const blocks = Array.isArray(explanation.learning_blocks) ? explanation.learning_blocks : [];
  blocks.forEach((block, i) => {
    if (!block || typeof block !== 'object') return;
    ['usage', 'note'].forEach(key => {
      if (typeof block[key] === 'string') {
        out.push({text: block[key], field_path: `explanation.learning_blocks[${i}].${key}`});
      }
    });
  });
  return out;
}

function chars(value) {
  return Array.from(String(value || ''));
}

function finding(code, qNo, fieldPath, detail, blocking) {
  return {
    code,
    q_no: Number(qNo || 0),
    field_path: String(fieldPath || ''),
    detail: detail || {},
    blocking: Boolean(blocking)
  };
}

function validPronBlock(block) {
  if (!block || block.type !== 'pronunciation') return false;
  const okLevel = block.level_band === '3급' || block.level_band === '준2급';
  return Boolean(
    String(block.skill_id || '').trim() &&
    okLevel &&
    String(block.surface || '').trim() &&
    String(block.actual || '').trim() &&
    canonicalText(block.surface) !== canonicalText(block.actual)
  );
}

function validatePayload(payload, options = {}) {
  const mode = options.mode || payload.qa_mode || 'future';
  const future = mode === 'future';
  const hard = [];
  const warnings = [];
  const metricRows = [];
  const questions = questionList(payload);
  const pronSeen = new Set();
  let validPronCount = 0;

  questions.forEach((question, qi) => {
    const qNo = questionNumber(question, qi);
    const exp = explanationOf(question);
    const aliases = targetAliases(question);
    const answerCandidates = [
      {kind: 'correct_choice', value: correctChoiceSurface(question)},
      {kind: 'completed_answer', value: completedAnswerSurface(question)}
    ].filter(x => canonicalText(x.value));

    representativeExamples(exp).forEach(example => {
      const ne = canonicalText(example.text);
      answerCandidates.forEach(answer => {
        if (ne && ne === canonicalText(answer.value)) {
          hard.push(finding(
            'EXPL_EXAMPLE_EXACT_ANSWER_DUPLICATE', qNo, example.field_path,
            {matched_kind: answer.kind, normalized_example: ne, matched_answer_surface: canonicalText(answer.value)},
            future
          ));
        }
      });
      const source = sourceContext(question);
      if (canonicalText(source)) {
        const m = metrics(example.text, source, aliases);
        warnings.push(finding(
          'EXPL_CONTEXT_SIMILARITY', qNo, example.field_path,
          {compare_to: 'source_context', status: 'MEASURED_UNCALIBRATED', metrics: m},
          false
        ));
        metricRows.push({q_no:qNo, kind:'context_similarity', field_path:example.field_path, compare_to:'source_context', metrics:m});
      }
      const completed = completedAnswerSurface(question);
      if (canonicalText(completed)) {
        const m = metrics(example.text, completed, aliases);
        warnings.push(finding(
          'EXPL_CONTEXT_SIMILARITY', qNo, example.field_path,
          {compare_to: 'completed_answer', status: 'MEASURED_UNCALIBRATED', metrics: m},
          false
        ));
        metricRows.push({q_no:qNo, kind:'context_similarity', field_path:example.field_path, compare_to:'completed_answer', metrics:m});
      }
    });

    const meta = metaTexts(exp);
    meta.forEach(entry => {
      LEARNER_META_PATTERNS.forEach(pattern => {
        if (entry.text.includes(pattern)) {
          hard.push(finding(
            'EXPL_LEARNER_ANSWER_META_FORBIDDEN', qNo, entry.field_path,
            {pattern}, future
          ));
        }
      });
      TEST_META_PATTERNS.forEach(pattern => {
        if (entry.text.includes(pattern)) {
          hard.push(finding(
            'EXPL_GENERIC_TEST_META_FORBIDDEN', qNo, entry.field_path,
            {pattern}, future
          ));
        }
      });
      if (/(?:です|ます|でした|ました)[。.!?！？](?:\s|$)/u.test(entry.text)) {
        hard.push(finding(
          'EXPL_META_POLITE_REGISTER', qNo, entry.field_path,
          {matched: 'sentence_final_polite'}, future
        ));
      }
      if (/が合う/u.test(entry.text) || /(?:だ|である)。/u.test(entry.text)) {
        warnings.push(finding(
          'EXPL_META_STYLE_CUE', qNo, entry.field_path,
          {status:'REVIEW_ONLY_UNCALIBRATED'}, false
        ));
      }
    });

    const reason = typeof exp.reason === 'string' ? exp.reason : '';
    const blockMeta = meta.filter(x => x.field_path !== 'explanation.reason');
    if (canonicalText(reason)) {
      blockMeta.forEach(entry => {
        const m = metrics(reason, entry.text, aliases);
        warnings.push(finding(
          'EXPL_REASON_BLOCK_REDUNDANCY', qNo, entry.field_path,
          {compare_to:'explanation.reason', status:'MEASURED_UNCALIBRATED', metrics:m},
          false
        ));
        metricRows.push({q_no:qNo, kind:'reason_block_redundancy', field_path:entry.field_path, metrics:m});
      });
    }

    const blocks = Array.isArray(exp.learning_blocks) ? exp.learning_blocks : [];
    blocks.forEach((block, bi) => {
      if (!block || typeof block !== 'object') return;
      const basePath = `explanation.learning_blocks[${bi}]`;

      if (block.type === 'hanja_network') {
        const target = block.target || {};
        const tw = chars(target.word);
        const th = chars(target.hanja);
        let invalidStructure = false;
        if (!tw.length || !th.length) invalidStructure = true;

        const related = Array.isArray(block.related) ? block.related : [];
        const homophone = Array.isArray(block.homophone) ? block.homophone : [];
        const relatedCoverage = new Set();
        const homophoneCoverage = new Set();

        related.forEach((entry, ri) => {
          const ep = `${basePath}.related[${ri}]`;
          const ew = chars(entry && entry.word);
          const eh = chars(entry && entry.hanja);
          const ti = Number(entry && entry.target_char_index);
          const ei = Number(entry && entry.example_char_index);
          if (!ew.length || !eh.length || !Number.isInteger(ti) || !Number.isInteger(ei) ||
              ti < 0 || ti >= th.length || ei < 0 || ei >= eh.length) {
            invalidStructure = true;
            return;
          }
          relatedCoverage.add(ti);
          if (String(entry.word).includes(String(target.word))) {
            hard.push(finding(
              'EXPL_HANJA_TARGET_CONTAINING_RELATED', qNo, ep,
              {target_word:String(target.word), related_word:String(entry.word)}, future
            ));
          }
          if (th[ti] !== eh[ei]) {
            hard.push(finding(
              'EXPL_HANJA_RELATED_RELATION_INVALID', qNo, ep,
              {target_char:th[ti], related_char:eh[ei], target_char_index:ti, example_char_index:ei},
              future
            ));
          }
        });

        homophone.forEach((entry, hi) => {
          const ep = `${basePath}.homophone[${hi}]`;
          const ew = chars(entry && entry.word);
          const eh = chars(entry && entry.hanja);
          const ti = Number(entry && entry.target_syllable_index);
          const ei = Number(entry && entry.example_syllable_index);
          if (!ew.length || !eh.length || !Number.isInteger(ti) || !Number.isInteger(ei) ||
              ti < 0 || ti >= tw.length || ti >= th.length || ei < 0 || ei >= ew.length || ei >= eh.length) {
            invalidStructure = true;
            return;
          }
          homophoneCoverage.add(ti);
          if (tw[ti] !== ew[ei] || th[ti] === eh[ei]) {
            hard.push(finding(
              'EXPL_HANJA_HOMOPHONE_RELATION_INVALID', qNo, ep,
              {target_syllable:tw[ti], example_syllable:ew[ei], target_hanja:th[ti], example_hanja:eh[ei]},
              future
            ));
          }
        });

        if (invalidStructure) {
          hard.push(finding(
            'EXPL_HANJA_STRUCTURE_INVALID', qNo, basePath,
            {reason:'missing/invalid target or relation indexes'}, future
          ));
        }

        if (th.length > 1) {
          const missing = [];
          for (let i = 0; i < th.length; i += 1) {
            if (!relatedCoverage.has(i) && !homophoneCoverage.has(i)) missing.push(i);
          }
          if (missing.length) {
            warnings.push(finding(
              'EXPL_HANJA_COVERAGE_SHORTFALL', qNo, basePath,
              {missing_target_indexes:missing, status:'REVIEW_ONLY_COMMONNESS_NOT_PROVEN'}, false
            ));
          }
        }
      }

      if (block.type === 'pronunciation') {
        const key = `${String(block.skill_id || '')}\u0000${canonicalText(block.surface)}`;
        const valid = validPronBlock(block);
        if (!valid || pronSeen.has(key)) {
          hard.push(finding(
            'EXPL_PRON_STRUCTURE_INVALID', qNo, basePath,
            {reason: !valid ? 'required field/level/surface-actual invariant failed' : 'duplicate skill_id+surface'},
            future
          ));
        } else {
          pronSeen.add(key);
          validPronCount += 1;
        }
      }
    });
  });

  if (validPronCount === 0) {
    hard.push(finding(
      'EXPL_PRON_COVERAGE_MISSING', 0, 'questions',
      {valid_pronunciation_blocks:0, historical_behavior: future ? null : 'REPORT_ONLY'}, future
    ));
  }

  const sortKey = item => [
    String(item.q_no).padStart(5, '0'),
    item.field_path,
    item.code,
    JSON.stringify(item.detail)
  ].join('\u0000');
  hard.sort((a,b)=>sortKey(a).localeCompare(sortKey(b)));
  warnings.sort((a,b)=>sortKey(a).localeCompare(sortKey(b)));
  metricRows.sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));

  const blockingHardFailures = hard.filter(x => x.blocking);
  return {
    schema: RESULT_SCHEMA,
    contract_id: CONTRACT_ID,
    set_id: String(payload.set_id || ''),
    stage_id: String(payload.stage_id || ''),
    mode,
    result: blockingHardFailures.length ? 'HARD_FAIL' : 'PASS',
    hard_failures: hard,
    warnings,
    metrics: metricRows
  };
}

function uniqueCodes(items) {
  return [...new Set(items.map(x => x.code))].sort();
}

function assertFixture(caseDef, result) {
  const expected = caseDef.expect || {};
  if (expected.result && result.result !== expected.result) {
    throw new Error(`${caseDef.id}: result ${result.result} != ${expected.result}`);
  }
  const actualHard = uniqueCodes(result.hard_failures);
  const expectedHard = [...(expected.hard_codes || [])].sort();
  if (JSON.stringify(actualHard) !== JSON.stringify(expectedHard)) {
    throw new Error(`${caseDef.id}: hard codes ${JSON.stringify(actualHard)} != ${JSON.stringify(expectedHard)}`);
  }
}

function runFixtures(filePath) {
  const fixture = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (fixture.contract_id !== CONTRACT_ID) {
    throw new Error(`fixture contract mismatch: ${fixture.contract_id}`);
  }
  const summaries = [];
  fixture.cases.forEach(caseDef => {
    const result = validatePayload(caseDef.payload, {mode:caseDef.mode});
    assertFixture(caseDef, result);
    summaries.push({
      id:caseDef.id,
      mode:caseDef.mode,
      result:result.result,
      hard_codes:uniqueCodes(result.hard_failures),
      warning_count:result.warnings.length
    });
  });
  return summaries;
}

if (require.main === module) {
  const filePath = process.argv[2] || DEFAULT_FIXTURE;
  const summaries = runFixtures(filePath);
  process.stdout.write(JSON.stringify({
    contract_id:CONTRACT_ID,
    fixture_file:path.basename(filePath),
    result:'PASS',
    case_count:summaries.length,
    cases:summaries
  }, null, 2) + '\n');
}

module.exports = {
  CONTRACT_ID,
  canonicalText,
  similarityText,
  metrics,
  validatePayload,
  runFixtures
};
