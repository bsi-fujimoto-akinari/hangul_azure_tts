/**
 * Pure audit for 3級 NEWFMT runtime routing.
 */

function h3WrittenNewfmtAuditAssert_(
  condition,
  code
) {
  if (!condition) {
    throw new Error(
      'WRITTEN_NEWFMT_AUDIT_FAIL:' +
        code
    );
  }
}


function h3WrittenNewfmtAuditExpectThrow_(
  fn,
  code
) {
  var threw = false;
  try {
    fn();
  } catch (_err) {
    threw = true;
  }
  h3WrittenNewfmtAuditAssert_(
    threw,
    code
  );
}


function auditWrittenNewfmtRuntimeV1_() {
  var d2 =
    h3WrittenNewfmtDecorateSlot_({
      q: 1,
      section:
        '筆2／語彙',
      bucket:
        'NEWFMT',
      retest:
        false
    });

  var d5 =
    h3WrittenNewfmtDecorateSlot_({
      q: 4,
      section:
        '筆5／共通',
      bucket:
        'NEWFMT',
      retest:
        true
    });

  h3WrittenNewfmtAuditAssert_(
    d2.format_id ===
      'H3_D2_FILL7' &&
      d2.format_item_count === 7 &&
      d2.format_points_each === 1,
    'D2_ROUTE'
  );

  h3WrittenNewfmtAuditAssert_(
    d5.format_id ===
      'H3_D5_COMMON2' &&
      d5.format_item_count === 2 &&
      d5.format_points_each === 1,
    'D5_ROUTE'
  );

  h3WrittenNewfmtAuditExpectThrow_(
    function () {
      h3WrittenNewfmtDecorateSlot_({
        q: 2,
        section:
          '筆3／文法',
        bucket:
          'NEWFMT'
      });
    },
    'UNSUPPORTED_SECTION'
  );

  h3WrittenNewfmtAuditAssert_(
    h3WrittenNewfmtDecorateSlot_({
      q: 2,
      section:
        '筆3／文法',
      bucket:
        'TOWMI'
    }).format_id ===
      undefined,
    'NON_NEWFMT_UNCHANGED'
  );

  var sourceRows = [
    {
      object:{
        SECTION:
          '筆2／語彙',
        PRIMARY_BUCKET:
          'TOWMI'
      }
    },
    {
      object:{
        SECTION:
          '筆3／文法',
        PRIMARY_BUCKET:
          'TOWMI'
      }
    },
    {
      object:{
        SECTION:
          '筆4／置換',
        PRIMARY_BUCKET:
          'OFFICIAL'
      }
    },
    {
      object:{
        SECTION:
          '筆5／共通',
        PRIMARY_BUCKET:
          'NEWFMT'
      }
    }
  ];

  h3WrittenNewfmtAuditAssert_(
    h3WrittenNewfmtValidateSourceRows_(
      sourceRows
    ) === true,
    'SOURCE_ROWS'
  );

  h3WrittenNewfmtAuditExpectThrow_(
    function () {
      h3WrittenNewfmtValidateSourceRows_(
        sourceRows.concat([
          {
            object:{
              SECTION:
                '筆2／語彙',
              PRIMARY_BUCKET:
                'NEWFMT'
            }
          }
        ])
      );
    },
    'NEWFMT_COUNT'
  );

  var patched =
    h3WrittenNewfmtPatchStageMeta_({
      stage_id:
        'STD-B002-S1',
      planned_slots:[
        {
          q: 4,
          section:
            '筆5／共通',
          bucket:
            'NEWFMT',
          retest:
            true
        }
      ]
    });

  h3WrittenNewfmtAuditAssert_(
    patched.newfmt_runtime_contract_id ===
      H3_WRITTEN_NEWFMT_RUNTIME_CONTRACT_ID_ &&
      patched.planned_slots[0]
        .format_id ===
          'H3_D5_COMMON2',
    'STAGE_PATCH'
  );

  return {
    schema:
      'H3_WRITTEN_NEWFMT_RUNTIME_AUDIT_V1',
    result:
      'PASS',
    checks: 7,
    contract_id:
      H3_WRITTEN_NEWFMT_RUNTIME_CONTRACT_ID_,
    source_contract_id:
      H3_NEWFMT_SOURCE_CONTRACT_ID_
  };
}
