/**
 * Pure repository audit for H3_LEARNING_SURFACE_V1.
 * No Sheet/Drive/runtime mutation.
 */

function h3LearningSurfaceAuditAssert_(
  condition,
  code
) {
  if (!condition) {
    throw new Error(
      'LEARNING_SURFACE_AUDIT_FAIL:' +
        code
    );
  }
}

function h3LearningSurfaceAuditExpectThrow_(
  fn,
  code
) {
  var threw = false;
  try {
    fn();
  } catch (err) {
    threw = true;
  }

  h3LearningSurfaceAuditAssert_(
    threw,
    code
  );
}

function auditLearningSurfaceCommonBoundaryV1_() {
  var listeningItems =
    ['K1', 'K2', 'K3', 'K4', 'K5']
      .map(function (section) {
        return { section: section };
      });
  var writtenItems =
    ['D2', 'D3', 'D4', 'D5', 'D6']
      .map(function (section) {
        return { section: section };
      });

  var l5 =
    h3LearningSurfaceMetadataForMode_(
      'LISTENING',
      listeningItems
    );
  var w5 =
    h3LearningSurfaceMetadataForMode_(
      'WRITTEN',
      writtenItems
    );

  h3LearningSurfaceAuditAssert_(
    l5.surface_family === '5L' &&
      l5.item_count === 5 &&
      l5.level === '3級',
    '5L_METADATA'
  );
  h3LearningSurfaceAuditAssert_(
    w5.surface_family === '5W' &&
      w5.item_count === 5 &&
      w5.level === '3級',
    '5W_METADATA'
  );

  h3LearningSurfaceAuditExpectThrow_(
    function () {
      h3LearningSurfaceValidate_(
        {
          learning_surface_schema:
            H3_LEARNING_SURFACE_SCHEMA_,
          provider_kind: 'LISTENING',
          surface_family: '5L',
          level: '3級',
          item_count: 4
        },
        listeningItems.slice(0, 4)
      );
    },
    '5L_CARDINALITY_FAIL_CLOSED'
  );

  h3LearningSurfaceAuditExpectThrow_(
    function () {
      h3LearningSurfaceValidate_(
        {
          learning_surface_schema:
            H3_LEARNING_SURFACE_SCHEMA_,
          provider_kind: 'WRITTEN',
          surface_family: '5W',
          level: '3級',
          item_count: 5
        },
        [
          { section: 'D2' },
          { section: 'D3' },
          { section: 'D4' },
          { section: 'D6' },
          { section: 'D5' }
        ]
      );
    },
    '5W_ORDER_FAIL_CLOSED'
  );

  h3LearningSurfaceValidate_(
    {
      learning_surface_schema:
        H3_LEARNING_SURFACE_SCHEMA_,
      provider_kind: 'WRITTEN',
      surface_family: 'READING',
      level: '準2級',
      item_count: 2
    },
    [
      { section: 'P8' },
      { section: 'P8' }
    ]
  );

  h3LearningSurfaceValidate_(
    {
      learning_surface_schema:
        H3_LEARNING_SURFACE_SCHEMA_,
      provider_kind: 'WRITTEN',
      surface_family: 'TRANSLATION',
      level: '3級',
      item_count: 4
    },
    [
      { section: 'P11' },
      { section: 'P11' },
      { section: 'P12' },
      { section: 'P12' }
    ]
  );

  var legacyW =
    h3LearningSurfaceLegacyReviewMetadata_(
      'WRITTEN'
    );
  h3LearningSurfaceAuditAssert_(
    legacyW.surface_family === '5W' &&
      legacyW.level === '3級',
    'LEGACY_WRITTEN_COMPAT'
  );

  return {
    schema:
      'H3_LEARNING_SURFACE_AUDIT_V1',
    result: 'PASS',
    checks: 7
  };
}
