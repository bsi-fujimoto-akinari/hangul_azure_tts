/**
 * Pure audit for H3 準2級 targeted taxonomy/master.
 */

function h3Jun2AuditAssert_(
  condition,
  code
) {
  if (!condition) {
    throw new Error(
      'JUN2_TAXONOMY_AUDIT_FAIL:' +
        code
    );
  }
}


function h3Jun2AuditExpectThrow_(
  fn,
  code
) {
  var threw = false;
  try {
    fn();
  } catch (_err) {
    threw = true;
  }
  h3Jun2AuditAssert_(
    threw,
    code
  );
}


function auditJun2TaxonomyV1_() {
  var rows =
    h3Jun2TaxonomyRows_();

  h3Jun2AuditAssert_(
    h3Jun2ValidateTaxonomy_(
      rows
    ) === true,
    'VALIDATE'
  );

  h3Jun2AuditAssert_(
    rows.length === 2 &&
      rows[0].SKILL_ID ===
        'JUN2-D5-SK001' &&
      rows[1].SKILL_ID ===
        'JUN2-D12-SK001',
    'IDENTITIES'
  );

  h3Jun2AuditAssert_(
    rows.every(
      function (row) {
        return (
          row.LEVEL === '準2級' &&
          row.SOURCE_STATUS ===
            'SOURCE_BOUND' &&
          row.AUTOGEN_STATUS ===
            'STAGED_NOT_QUEUE_ACTIVE'
        );
      }
    ),
    'LEVEL_AND_GATE'
  );

  h3Jun2AuditAssert_(
    rows[0].FORMAT_ID ===
      'JUN2_D5_COMMON2X2' &&
      rows[0].SURFACE_FAMILY ===
        '5W' &&
      rows[0].TRANSLATION_DIRECTION ===
        '',
    'D5'
  );

  h3Jun2AuditAssert_(
    rows[1].FORMAT_ID ===
      'JUN2_D12_JP_TO_KR_4X2' &&
      rows[1].SURFACE_FAMILY ===
        'TRANSLATION' &&
      rows[1].TRANSLATION_DIRECTION ===
        'JP_TO_KR',
    'D12'
  );

  h3Jun2AuditAssert_(
    rows.every(
      function (row) {
        return (
          row.SKILL_ID.indexOf(
            'H3-'
          ) !== 0
        );
      }
    ),
    'NO_H3_ID_REUSE'
  );

  var plan =
    h3Jun2MasterPlan_();

  h3Jun2AuditAssert_(
    plan.sheet_name ===
      'jun2_skill_master_v1' &&
      plan.headers.length === 16 &&
      plan.rows.length === 2 &&
      plan.taxonomy_status ===
        'READY' &&
      plan.queue_status ===
        'NOT_ACTIVE' &&
      plan.scheduler_status ===
        'NOT_ACTIVE' &&
      plan.learner_issue === false,
    'MASTER_PLAN'
  );

  h3Jun2AuditExpectThrow_(
    function () {
      var bad =
        h3Jun2TaxonomyRows_();
      bad[1].LEVEL =
        '3級';
      h3Jun2ValidateTaxonomy_(
        bad
      );
    },
    'LEVEL_FAIL_CLOSED'
  );

  h3Jun2AuditExpectThrow_(
    function () {
      var bad =
        h3Jun2TaxonomyRows_();
      bad[1].TRANSLATION_DIRECTION =
        'KR_TO_JP';
      h3Jun2ValidateTaxonomy_(
        bad
      );
    },
    'DIRECTION_FAIL_CLOSED'
  );

  return {
    schema:
      'H3_JUN2_TAXONOMY_AUDIT_V1',
    result:
      'PASS',
    checks: 9,
    contract_id:
      H3_JUN2_TAXONOMY_CONTRACT_ID_,
    skill_count:
      rows.length
  };
}
