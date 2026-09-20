/**
 * H3 2026 source-bound new-format registry.
 */

var H3_NEWFMT_LEVEL_CONTRACT_ID_ =
  'H3-NEWFMT-LEVEL-20260921-V2';

var H3_NEWFMT_SOURCE_CONTRACT_ID_ =
  'H3-2026-NEWFMT-SOURCE-20260921-V1';

var H3_NEWFMT_SOURCE_EVIDENCE_SHA256_ =
  '00771e014fab89b5d94416e8687a5b3cc78d93de281164e8d612af156b054096';

var H3_NEWFMT_SOURCE_URL_ =
  'https://hangul.or.jp/cms/wp-content/uploads/2026/03/%E7%AC%AC65%E5%9B%9E%E8%A9%A6%E9%A8%93%E5%95%8F%E9%A1%8C_%E5%BD%A2%E5%BC%8F%E8%A8%AD%E5%95%8F%E9%A1%8C%E5%A4%89%E6%9B%B426.3.6.pdf'
    .replace(
      '%E8%A8%AD%E5%95%8F%E9%A1%8C%E5%A4%89%E6%9B%B4',
      '%E8%A8%AD%E5%95%8F%E5%A4%89%E6%9B%B4'
    );

var H3_NEWFMT_REGISTRY_ = [
  {
    format_id:
      'H3_D2_FILL7',
    level:
      '3級',
    section:
      'D2',
    raw_token:
      'D2_fill7',
    surface_family:
      '5W',
    answer_type:
      'MULTIPLE_CHOICE',
    translation_direction:
      null,
    item_count: 7,
    points_each: 1,
    total_points: 7,
    prompt_semantics:
      'ONE_BLANK_MOST_APPROPRIATE',
    source_status:
      'SOURCE_BOUND',
    source_id:
      'HANGUL_ASSOC_20260306_FORMAT_CHANGE',
    source_published_at:
      '2026-03-06'
  },
  {
    format_id:
      'H3_D5_COMMON2',
    level:
      '3級',
    section:
      'D5',
    raw_token:
      'D5_common2',
    surface_family:
      '5W',
    answer_type:
      'MULTIPLE_CHOICE',
    translation_direction:
      null,
    item_count: 2,
    points_each: 1,
    total_points: 2,
    prompt_semantics:
      'ONE_EXPRESSION_FITS_BOTH_BLANKS',
    source_status:
      'SOURCE_BOUND',
    source_id:
      'HANGUL_ASSOC_20260306_FORMAT_CHANGE',
    source_published_at:
      '2026-03-06'
  },
  {
    format_id:
      'JUN2_D5_COMMON2X2',
    level:
      '準2級',
    section:
      'D5',
    raw_token:
      'D5_common2x2',
    surface_family:
      '5W',
    answer_type:
      'MULTIPLE_CHOICE',
    translation_direction:
      null,
    item_count: 2,
    points_each: 2,
    total_points: 4,
    prompt_semantics:
      'ONE_EXPRESSION_FITS_BOTH_BLANKS',
    source_status:
      'SOURCE_BOUND',
    source_id:
      'HANGUL_ASSOC_20260306_FORMAT_CHANGE',
    source_published_at:
      '2026-03-06'
  },
  {
    format_id:
      'JUN2_D12_JP_TO_KR_4X2',
    level:
      '準2級',
    section:
      'D12',
    raw_token:
      'D12_JPtoKR4x2',
    legacy_raw_tokens: [
      'D12_KRtoJP4x2'
    ],
    legacy_alias_status:
      'DEPRECATED_DIRECTION_MISMATCH',
    surface_family:
      'TRANSLATION',
    answer_type:
      'MULTIPLE_CHOICE',
    translation_direction:
      'JP_TO_KR',
    item_count: 4,
    points_each: 2,
    total_points: 8,
    prompt_semantics:
      'UNDERLINED_JAPANESE_TO_KOREAN_CHOICE',
    source_status:
      'SOURCE_BOUND',
    source_id:
      'HANGUL_ASSOC_20260306_FORMAT_CHANGE',
    source_published_at:
      '2026-03-06'
  }
];


function h3NewfmtResolveFormatId_(
  value
) {
  var id =
    String(value || '').trim();

  if (
    id ===
      'D12_KRtoJP4x2' ||
    id ===
      'D12_JPtoKR4x2'
  ) {
    return (
      'JUN2_D12_JP_TO_KR_4X2'
    );
  }

  return id;
}


function h3NewfmtDefinition_(
  formatId
) {
  var id =
    h3NewfmtResolveFormatId_(
      formatId
    );

  var matches =
    H3_NEWFMT_REGISTRY_.filter(
      function (item) {
        return (
          item.format_id === id ||
          item.raw_token === id ||
          (
            Array.isArray(
              item.legacy_raw_tokens
            ) &&
            item.legacy_raw_tokens
              .indexOf(id) >= 0
          )
        );
      }
    );

  if (matches.length !== 1) {
    throw new Error(
      'NEWFMT_FORMAT_ID_INVALID'
    );
  }

  return Object.assign(
    {},
    matches[0]
  );
}


function h3NewfmtValidateLevel_(
  formatId,
  level
) {
  var definition =
    h3NewfmtDefinition_(
      formatId
    );

  var canonicalLevel =
    h3LevelNormalize_(
      level
    );

  if (
    definition.level !==
      canonicalLevel
  ) {
    throw new Error(
      'NEWFMT_LEVEL_MISMATCH'
    );
  }

  return definition;
}


function h3NewfmtDefinitionForSlot_(
  level,
  section
) {
  var canonicalLevel =
    h3LevelNormalize_(
      level
    );
  var normalizedSection =
    String(section || '')
      .trim()
      .replace(
        /^筆(\d+).*/,
        'D$1'
      );

  var matches =
    H3_NEWFMT_REGISTRY_
      .filter(
        function (item) {
          return (
            item.level ===
              canonicalLevel &&
            item.section ===
              normalizedSection
          );
        }
      );

  if (matches.length !== 1) {
    throw new Error(
      'NEWFMT_SLOT_FORMAT_COUNT:' +
        canonicalLevel +
        ':' +
        normalizedSection +
        ':' +
        matches.length
    );
  }

  var definition =
    matches[0];

  if (
    definition.source_status !==
      'SOURCE_BOUND'
  ) {
    throw new Error(
      'NEWFMT_SOURCE_NOT_BOUND'
    );
  }

  return Object.assign(
    {},
    definition
  );
}


function h3NewfmtCanUseCurrentH3Ratio_(
  formatId
) {
  var definition =
    h3NewfmtDefinition_(
      formatId
    );

  return (
    definition.level === '3級' &&
    definition.surface_family ===
      '5W' &&
    definition.source_status ===
      'SOURCE_BOUND'
  );
}


function h3NewfmtActivationReadiness_(
  formatId,
  evidence
) {
  var definition =
    h3NewfmtDefinition_(
      formatId
    );

  evidence = evidence || {};

  if (
    definition.source_status !==
      'SOURCE_BOUND'
  ) {
    return {
      schema:
        'H3_NEWFMT_ACTIVATION_READINESS_V1',
      format_id:
        definition.format_id,
      level:
        definition.level,
      ready:
        false,
      status:
        'SOURCE_UNBOUND'
    };
  }

  if (
    evidence.taxonomy_ready !==
      true ||
    evidence.surface_ready !==
      true ||
    evidence.scheduler_admitted !==
      true
  ) {
    return {
      schema:
        'H3_NEWFMT_ACTIVATION_READINESS_V1',
      format_id:
        definition.format_id,
      level:
        definition.level,
      ready:
        false,
      status:
        'SOURCE_BOUND_RUNTIME_GATED'
    };
  }

  return {
    schema:
      'H3_NEWFMT_ACTIVATION_READINESS_V1',
    format_id:
      definition.format_id,
    level:
      definition.level,
    ready:
      true,
    status:
      'READY'
  };
}


function h3NewfmtAssertNoRatioInheritance_(
  formatId
) {
  var definition =
    h3NewfmtDefinition_(
      formatId
    );

  if (
    definition.level === '準2級' &&
    h3NewfmtCanUseCurrentH3Ratio_(
      formatId
    )
  ) {
    throw new Error(
      'NEWFMT_CROSS_LEVEL_RATIO_INHERITANCE'
    );
  }

  return true;
}
