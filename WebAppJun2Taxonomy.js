/**
 * H3 準2級 targeted taxonomy/master.
 *
 * Pure source-bound master projection. No queue or learner writes.
 */

var H3_JUN2_TAXONOMY_CONTRACT_ID_ =
  'H3-JUN2-TAXONOMY-20260921-V1';

var H3_JUN2_MASTER_SHEET_ =
  'jun2_skill_master_v1';

var H3_JUN2_SKILL_MASTER_HEADERS_ = [
  'SKILL_ID',
  'LEVEL',
  'SECTION',
  'KNOWLEDGE_DOMAIN',
  'SKILL_LABEL',
  'KNOWLEDGE_KEY',
  'FORMAT_ID',
  'SURFACE_FAMILY',
  'ANSWER_TYPE',
  'TRANSLATION_DIRECTION',
  'SOURCE_ID',
  'SOURCE_CONTRACT_ID',
  'SOURCE_STATUS',
  'POOL',
  'AUTOGEN_STATUS',
  'NOTES'
];

var H3_JUN2_TAXONOMY_ROWS_ = [
  {
    SKILL_ID:
      'JUN2-D5-SK001',
    LEVEL:
      '準2級',
    SECTION:
      '筆5／共通',
    KNOWLEDGE_DOMAIN:
      'COMMON_EXPRESSION',
    SKILL_LABEL:
      '2つの文の空欄に共通して入る表現を選ぶ',
    KNOWLEDGE_KEY:
      'JUN2:D5:COMMON_EXPRESSION_TWO_BLANKS',
    FORMAT_ID:
      'JUN2_D5_COMMON2X2',
    SURFACE_FAMILY:
      '5W',
    ANSWER_TYPE:
      'MULTIPLE_CHOICE',
    TRANSLATION_DIRECTION:
      '',
    SOURCE_ID:
      'HANGUL_ASSOC_20260306_FORMAT_CHANGE',
    SOURCE_CONTRACT_ID:
      'H3-2026-NEWFMT-SOURCE-20260921-V1',
    SOURCE_STATUS:
      'SOURCE_BOUND',
    POOL:
      'JUN2_CORE',
    AUTOGEN_STATUS:
      'STAGED_NOT_QUEUE_ACTIVE',
    NOTES:
      '2026 spring 65th format change; targeted source-bound format-operation skill; 2 questions x 2 points.'
  },
  {
    SKILL_ID:
      'JUN2-D12-SK001',
    LEVEL:
      '準2級',
    SECTION:
      '筆12／翻訳',
    KNOWLEDGE_DOMAIN:
      'TRANSLATION',
    SKILL_LABEL:
      '下線部の日本語に最も適切な韓国語訳を選ぶ',
    KNOWLEDGE_KEY:
      'JUN2:D12:JP_TO_KR_MULTIPLE_CHOICE',
    FORMAT_ID:
      'JUN2_D12_JP_TO_KR_4X2',
    SURFACE_FAMILY:
      'TRANSLATION',
    ANSWER_TYPE:
      'MULTIPLE_CHOICE',
    TRANSLATION_DIRECTION:
      'JP_TO_KR',
    SOURCE_ID:
      'HANGUL_ASSOC_20260306_FORMAT_CHANGE',
    SOURCE_CONTRACT_ID:
      'H3-2026-NEWFMT-SOURCE-20260921-V1',
    SOURCE_STATUS:
      'SOURCE_BOUND',
    POOL:
      'JUN2_CORE',
    AUTOGEN_STATUS:
      'STAGED_NOT_QUEUE_ACTIVE',
    NOTES:
      '2026 spring 65th format change; targeted source-bound JP_TO_KR skill; 4 questions x 2 points.'
  }
];


function h3Jun2TaxonomyRows_() {
  return JSON.parse(
    JSON.stringify(
      H3_JUN2_TAXONOMY_ROWS_
    )
  );
}


function h3Jun2ValidateTaxonomy_(
  rows
) {
  rows = rows || [];

  if (rows.length !== 2) {
    throw new Error(
      'JUN2_TAXONOMY_ROW_COUNT_INVALID:' +
        rows.length
    );
  }

  var seen = {};

  rows.forEach(
    function (row) {
      var skillId =
        h3LevelRequireSkillId_(
          row.SKILL_ID
        );

      if (
        seen[skillId] ||
        skillId.indexOf(
          'JUN2-'
        ) !== 0
      ) {
        throw new Error(
          'JUN2_TAXONOMY_SKILL_ID_INVALID:' +
            skillId
        );
      }
      seen[skillId] = true;

      if (
        h3LevelNormalize_(
          row.LEVEL
        ) !== '準2級'
      ) {
        throw new Error(
          'JUN2_TAXONOMY_LEVEL_INVALID:' +
            skillId
        );
      }

      if (
        row.SOURCE_CONTRACT_ID !==
          H3_NEWFMT_SOURCE_CONTRACT_ID_ ||
        row.SOURCE_STATUS !==
          'SOURCE_BOUND' ||
        row.POOL !==
          'JUN2_CORE' ||
        row.AUTOGEN_STATUS !==
          'STAGED_NOT_QUEUE_ACTIVE'
      ) {
        throw new Error(
          'JUN2_TAXONOMY_RUNTIME_GATE_INVALID:' +
            skillId
        );
      }

      var definition =
        h3NewfmtDefinition_(
          row.FORMAT_ID
        );

      if (
        definition.level !==
          '準2級' ||
        definition.source_status !==
          'SOURCE_BOUND' ||
        definition.surface_family !==
          row.SURFACE_FAMILY ||
        definition.answer_type !==
          row.ANSWER_TYPE ||
        String(
          definition.translation_direction ||
          ''
        ) !==
          String(
            row.TRANSLATION_DIRECTION ||
            ''
          )
      ) {
        throw new Error(
          'JUN2_TAXONOMY_FORMAT_BINDING_INVALID:' +
            skillId
        );
      }
    }
  );

  if (
    !seen['JUN2-D5-SK001'] ||
    !seen['JUN2-D12-SK001']
  ) {
    throw new Error(
      'JUN2_TAXONOMY_REQUIRED_SKILL_MISSING'
    );
  }

  return true;
}


function h3Jun2MasterValues_() {
  var rows =
    h3Jun2TaxonomyRows_();

  h3Jun2ValidateTaxonomy_(
    rows
  );

  return rows.map(
    function (row) {
      return H3_JUN2_SKILL_MASTER_HEADERS_
        .map(
          function (header) {
            return String(
              row[header] || ''
            );
          }
        );
    }
  );
}


function h3Jun2MasterPlan_() {
  var rows =
    h3Jun2TaxonomyRows_();

  h3Jun2ValidateTaxonomy_(
    rows
  );

  return {
    schema:
      'H3_JUN2_SKILL_MASTER_PLAN_V1',
    contract_id:
      H3_JUN2_TAXONOMY_CONTRACT_ID_,
    sheet_name:
      H3_JUN2_MASTER_SHEET_,
    taxonomy_status:
      'READY',
    queue_status:
      'NOT_ACTIVE',
    scheduler_status:
      'NOT_ACTIVE',
    learner_issue:
      false,
    headers:
      H3_JUN2_SKILL_MASTER_HEADERS_
        .slice(),
    rows:
      h3Jun2MasterValues_()
  };
}
