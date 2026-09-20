/**
 * Pure audit for H3 2026 source-bound new-format registry.
 */

function h3NewfmtAuditAssert_(
  condition,
  code
) {
  if (!condition) {
    throw new Error(
      'NEWFMT_AUDIT_FAIL:' +
        code
    );
  }
}


function h3NewfmtAuditExpectThrow_(
  fn,
  code
) {
  var threw = false;

  try {
    fn();
  } catch (_err) {
    threw = true;
  }

  h3NewfmtAuditAssert_(
    threw,
    code
  );
}


function auditNewfmtLevelV2_() {
  h3NewfmtAuditAssert_(
    H3_NEWFMT_REGISTRY_.length === 4,
    'REGISTRY_COUNT'
  );

  var d2 =
    h3NewfmtDefinition_(
      'H3_D2_FILL7'
    );
  var h3d5 =
    h3NewfmtDefinition_(
      'H3_D5_COMMON2'
    );
  var j2d5 =
    h3NewfmtDefinition_(
      'JUN2_D5_COMMON2X2'
    );
  var j2d12 =
    h3NewfmtDefinition_(
      'JUN2_D12_JP_TO_KR_4X2'
    );

  h3NewfmtAuditAssert_(
    d2.level === '3級' &&
      d2.section === 'D2' &&
      d2.item_count === 7 &&
      d2.points_each === 1 &&
      d2.total_points === 7 &&
      d2.source_status ===
        'SOURCE_BOUND',
    'H3_D2_SOURCE'
  );

  h3NewfmtAuditAssert_(
    h3d5.level === '3級' &&
      h3d5.section === 'D5' &&
      h3d5.item_count === 2 &&
      h3d5.points_each === 1 &&
      h3d5.total_points === 2,
    'H3_D5_SOURCE'
  );

  h3NewfmtAuditAssert_(
    j2d5.level === '準2級' &&
      j2d5.section === 'D5' &&
      j2d5.item_count === 2 &&
      j2d5.points_each === 2 &&
      j2d5.total_points === 4,
    'JUN2_D5_SOURCE'
  );

  h3NewfmtAuditAssert_(
    j2d12.level === '準2級' &&
      j2d12.section === 'D12' &&
      j2d12.item_count === 4 &&
      j2d12.points_each === 2 &&
      j2d12.total_points === 8 &&
      j2d12.surface_family ===
        'TRANSLATION' &&
      j2d12.translation_direction ===
        'JP_TO_KR',
    'JUN2_D12_SOURCE'
  );

  h3NewfmtAuditAssert_(
    h3NewfmtDefinition_(
      'D12_KRtoJP4x2'
    ).format_id ===
      'JUN2_D12_JP_TO_KR_4X2',
    'LEGACY_ALIAS'
  );

  h3NewfmtAuditAssert_(
    h3NewfmtDefinitionForSlot_(
      '3級',
      'D2'
    ).format_id ===
      'H3_D2_FILL7' &&
      h3NewfmtDefinitionForSlot_(
        '3級',
        '筆5／共通'
      ).format_id ===
        'H3_D5_COMMON2',
    'H3_SLOT_ROUTING'
  );

  h3NewfmtAuditExpectThrow_(
    function () {
      h3NewfmtDefinitionForSlot_(
        '3級',
        'D3'
      );
    },
    'NON_NEWFMT_SECTION_REJECTED'
  );

  h3NewfmtAuditAssert_(
    h3NewfmtCanUseCurrentH3Ratio_(
      'H3_D2_FILL7'
    ) === true &&
      h3NewfmtCanUseCurrentH3Ratio_(
        'H3_D5_COMMON2'
      ) === true &&
      h3NewfmtCanUseCurrentH3Ratio_(
        'JUN2_D5_COMMON2X2'
      ) === false,
    'RATIO_SCOPE'
  );

  h3NewfmtAuditAssert_(
    h3NewfmtActivationReadiness_(
      'JUN2_D5_COMMON2X2',
      {
        taxonomy_ready: false,
        surface_ready: true,
        scheduler_admitted: false
      }
    ).status ===
      'SOURCE_BOUND_RUNTIME_GATED',
    'JUN2_RUNTIME_GATE'
  );

  return {
    schema:
      'H3_NEWFMT_LEVEL_AUDIT_V2',
    result:
      'PASS',
    checks:
      9,
    level_contract_id:
      H3_NEWFMT_LEVEL_CONTRACT_ID_,
    source_contract_id:
      H3_NEWFMT_SOURCE_CONTRACT_ID_,
    evidence_sha256:
      H3_NEWFMT_SOURCE_EVIDENCE_SHA256_
  };
}
