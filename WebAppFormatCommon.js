/**
 * H3 2026 new-format registry.
 *
 * Pure policy metadata only. All definitions remain source-unbound.
 */

var H3_NEWFMT_LEVEL_CONTRACT_ID_ =
  'H3-NEWFMT-LEVEL-20260921-V1';

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
    translation_direction:
      null,
    source_status:
      'SOURCE_UNBOUND'
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
    translation_direction:
      null,
    source_status:
      'SOURCE_UNBOUND'
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
    translation_direction:
      null,
    source_status:
      'SOURCE_UNBOUND'
  },
  {
    format_id:
      'JUN2_D12_KR_TO_JP_4X2',
    level:
      '準2級',
    section:
      'D12',
    raw_token:
      'D12_KRtoJP4x2',
    surface_family:
      'TRANSLATION',
    translation_direction:
      'KR_TO_JP',
    source_status:
      'SOURCE_UNBOUND'
  }
];


function h3NewfmtDefinition_(
  formatId
) {
  var id =
    String(formatId || '').trim();
  var matches =
    H3_NEWFMT_REGISTRY_.filter(
      function (item) {
        return (
          item.format_id === id
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
      '5W'
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
      'SOURCE_BOUND' ||
    evidence.source_bound !== true ||
    evidence.semantics_verified !==
      true ||
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
        'SOURCE_UNBOUND'
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
