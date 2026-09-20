/**
 * Pure audit for H3 2026 new-format level registry.
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


function auditNewfmtLevelV1_() {
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
      'JUN2_D12_KR_TO_JP_4X2'
    );

  h3NewfmtAuditAssert_(
    d2.level === '3級' &&
      d2.section === 'D2' &&
      d2.raw_token ===
        'D2_fill7',
    'H3_D2'
  );

  h3NewfmtAuditAssert_(
    h3d5.level === '3級' &&
      h3d5.section === 'D5' &&
      h3d5.raw_token ===
        'D5_common2',
    'H3_D5'
  );

  h3NewfmtAuditAssert_(
    j2d5.level === '準2級' &&
      j2d5.section === 'D5' &&
      j2d5.raw_token ===
        'D5_common2x2',
    'JUN2_D5'
  );

  h3NewfmtAuditAssert_(
    j2d12.level === '準2級' &&
      j2d12.section === 'D12' &&
      j2d12.raw_token ===
        'D12_KRtoJP4x2' &&
      j2d12.surface_family ===
        'TRANSLATION' &&
      j2d12.translation_direction ===
        'KR_TO_JP',
    'JUN2_D12'
  );

  h3NewfmtAuditAssert_(
    h3NewfmtCanUseCurrentH3Ratio_(
      'H3_D2_FILL7'
    ) === true &&
      h3NewfmtCanUseCurrentH3Ratio_(
        'H3_D5_COMMON2'
      ) === true,
    'H3_RATIO_SCOPE'
  );

  h3NewfmtAuditAssert_(
    h3NewfmtCanUseCurrentH3Ratio_(
      'JUN2_D5_COMMON2X2'
    ) === false &&
      h3NewfmtCanUseCurrentH3Ratio_(
        'JUN2_D12_KR_TO_JP_4X2'
      ) === false,
    'JUN2_NO_RATIO_INHERITANCE'
  );

  h3NewfmtAuditExpectThrow_(
    function () {
      h3NewfmtValidateLevel_(
        'JUN2_D5_COMMON2X2',
        '3級'
      );
    },
    'LEVEL_MISMATCH'
  );

  h3NewfmtAuditAssert_(
    h3NewfmtActivationReadiness_(
      'H3_D2_FILL7',
      {
        source_bound: true,
        semantics_verified: true,
        taxonomy_ready: true,
        surface_ready: true,
        scheduler_admitted: true
      }
    ).status ===
      'SOURCE_UNBOUND',
    'SOURCE_LOCK_REQUIRED'
  );

  h3NewfmtAuditAssert_(
    h3NewfmtAssertNoRatioInheritance_(
      'JUN2_D5_COMMON2X2'
    ) === true &&
      h3NewfmtAssertNoRatioInheritance_(
        'JUN2_D12_KR_TO_JP_4X2'
      ) === true,
    'RATIO_ISOLATION'
  );

  return {
    schema:
      'H3_NEWFMT_LEVEL_AUDIT_V1',
    result:
      'PASS',
    checks:
      9,
    contract_id:
      H3_NEWFMT_LEVEL_CONTRACT_ID_
  };
}
