/**
 * Pure audit for H3 level runtime boundary.
 */

function h3LevelAuditAssert_(
  condition,
  code
) {
  if (!condition) {
    throw new Error(
      'LEVEL_RUNTIME_AUDIT_FAIL:' +
        code
    );
  }
}


function h3LevelAuditExpectThrow_(
  fn,
  code
) {
  var threw = false;
  try {
    fn();
  } catch (_err) {
    threw = true;
  }
  h3LevelAuditAssert_(
    threw,
    code
  );
}


function auditLevelRuntimeV2_() {
  h3LevelAuditAssert_(
    h3LevelNormalize_('3級') ===
      '3級' &&
      h3LevelNormalize_('準2級') ===
        '準2級',
    'LEVELS'
  );

  h3LevelAuditAssert_(
    h3LevelMasterAuthority_(
      '3級'
    ) ===
      'skill_master_v1' &&
      h3LevelMasterAuthority_(
        '準2級'
      ) ===
        'jun2_skill_master_v1',
    'MASTER_AUTHORITIES'
  );

  h3LevelAuditAssert_(
    h3LevelSkillStateKey_(
      '3級',
      'SK-001'
    ) ===
      '3級|SK-001' &&
      h3LevelSkillStateKey_(
        '準2級',
        'SK-001'
      ) ===
        '準2級|SK-001',
    'STATE_KEY'
  );

  h3LevelAuditExpectThrow_(
    function () {
      h3LevelNormalize_(
        '준2급'
      );
    },
    'NONCANONICAL_LEVEL_REJECTED'
  );

  h3LevelAuditExpectThrow_(
    function () {
      h3LevelAssertNoCrossLevelStateTransfer_(
        '3級',
        '準2級'
      );
    },
    'CROSS_LEVEL_TRANSFER_REJECTED'
  );

  h3LevelAuditAssert_(
    h3LevelAssertNoCrossLevelStateTransfer_(
      '3級',
      '3級'
    ) === true,
    'SAME_LEVEL_TRANSFER'
  );

  var master = [
    {
      SKILL_ID:
        'H3-P2-SK001',
      LEVEL:
        '3級'
    },
    {
      SKILL_ID:
        'JUN2-P2-SK001',
      LEVEL:
        '準2級'
    }
  ];

  var resolved =
    h3LevelResolveQueueSkill_(
      master,
      {
        SKILL_ID:
          'JUN2-P2-SK001'
      },
      '準2級'
    );

  h3LevelAuditAssert_(
    resolved.state_key ===
      '準2級|JUN2-P2-SK001',
    'QUEUE_RESOLVE'
  );

  h3LevelAuditExpectThrow_(
    function () {
      h3LevelResolveQueueSkill_(
        master,
        {
          SKILL_ID:
            'JUN2-P2-SK001'
        },
        '3級'
      );
    },
    'QUEUE_LEVEL_MISMATCH'
  );

  h3LevelAuditExpectThrow_(
    function () {
      h3LevelMasterIndex_([
        {
          SKILL_ID:
            'SAME',
          LEVEL:
            '3級'
        },
        {
          SKILL_ID:
            'SAME',
          LEVEL:
            '準2級'
        }
      ]);
    },
    'DUPLICATE_SKILL_ID'
  );

  h3LevelAuditAssert_(
    h3LevelPromotionPlan_({
      accuracy: 0.69,
      stable_sets: 10,
      current_level: '3級'
    }).action ===
      'H3_CORE_RETEST',
    'PROMOTION_LT70'
  );

  h3LevelAuditAssert_(
    h3LevelPromotionPlan_({
      accuracy: 0.79,
      stable_sets: 10,
      current_level: '3級'
    }).action ===
      'H3_ONLY',
    'PROMOTION_LT80'
  );

  h3LevelAuditAssert_(
    h3LevelPromotionPlan_({
      accuracy: 0.80,
      stable_sets: 3,
      current_level: '3級'
    }).action ===
      'ADD_JUN2_ONE',
    'PROMOTION_80'
  );

  h3LevelAuditAssert_(
    h3LevelPromotionPlan_({
      accuracy: 0.91,
      stable_sets: 4,
      current_level: '3級'
    }).action ===
      'ADD_JUN2_ONE',
    'PROMOTION_MONOTONIC_HIGH'
  );

  var share =
    h3LevelPromotionPlan_({
      accuracy: 0.91,
      stable_sets: 5,
      current_level: '3級'
    });

  h3LevelAuditAssert_(
    share.action ===
      'JUN2_SHARE_UP' &&
      share.share_up === true,
    'PROMOTION_SHARE_UP'
  );

  var blocked =
    h3LevelActivationReadiness_(
      [],
      '準2級'
    );

  h3LevelAuditAssert_(
    blocked.ready === false &&
      blocked.status ===
        'BLOCKED_NO_JUN2_TAXONOMY' &&
      blocked.master_sheet ===
        'jun2_skill_master_v1' &&
      blocked.skill_count === 0,
    'ACTIVATION_BLOCKED'
  );

  var jun2Present =
    h3LevelActivationReadiness_(
      [
        {
          SKILL_ID:
            'JUN2-D5-SK001',
          LEVEL:
            '準2級'
        },
        {
          SKILL_ID:
            'JUN2-D12-SK001',
          LEVEL:
            '準2級'
        }
      ],
      '準2級'
    );

  h3LevelAuditAssert_(
    jun2Present.ready === true &&
      jun2Present.status ===
        'TAXONOMY_PRESENT_NOT_RUNTIME_ACTIVATED' &&
      jun2Present.master_sheet ===
        'jun2_skill_master_v1' &&
      jun2Present.skill_count === 2,
    'JUN2_TAXONOMY_PRESENT'
  );

  return {
    schema:
      'H3_LEVEL_RUNTIME_AUDIT_V2',
    result:
      'PASS',
    checks:
      16,
    contract_id:
      H3_LEVEL_RUNTIME_CONTRACT_ID_
  };
}
