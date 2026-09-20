/**
 * H3 level runtime boundary.
 *
 * Pure helpers only. No Sheet writes or scheduler activation.
 */

var H3_LEVEL_RUNTIME_CONTRACT_ID_ =
  'H3-LEVEL-RUNTIME-20260921-V1';

var H3_RUNTIME_LEVELS_ = [
  '3級',
  '準2級'
];


function h3LevelNormalize_(
  level
) {
  var normalized =
    String(level || '').trim();

  if (
    H3_RUNTIME_LEVELS_
      .indexOf(normalized) < 0
  ) {
    throw new Error(
      'LEVEL_RUNTIME_LEVEL_INVALID'
    );
  }

  return normalized;
}


function h3LevelRequireSkillId_(
  skillId
) {
  var normalized =
    String(skillId || '').trim();

  if (
    !normalized ||
    normalized.length > 160 ||
    /[\x00-\x1F]/.test(
      normalized
    )
  ) {
    throw new Error(
      'LEVEL_RUNTIME_SKILL_ID_INVALID'
    );
  }

  return normalized;
}


function h3LevelSkillStateKey_(
  level,
  skillId
) {
  return (
    h3LevelNormalize_(level) +
    '|' +
    h3LevelRequireSkillId_(
      skillId
    )
  );
}


function h3LevelAssertNoCrossLevelStateTransfer_(
  fromLevel,
  toLevel
) {
  var from =
    h3LevelNormalize_(
      fromLevel
    );
  var to =
    h3LevelNormalize_(
      toLevel
    );

  if (from !== to) {
    throw new Error(
      'LEVEL_RUNTIME_CROSS_LEVEL_STATE_TRANSFER_FORBIDDEN'
    );
  }

  return true;
}


function h3LevelMasterIndex_(
  masterRows
) {
  var index = {};

  (masterRows || []).forEach(
    function (row) {
      if (!row) {
        return;
      }

      var skillId =
        h3LevelRequireSkillId_(
          row.SKILL_ID
        );
      var level =
        h3LevelNormalize_(
          row.LEVEL
        );

      if (index[skillId]) {
        throw new Error(
          'LEVEL_RUNTIME_MASTER_SKILL_DUPLICATE:' +
            skillId
        );
      }

      index[skillId] = {
        SKILL_ID:
          skillId,
        LEVEL:
          level
      };
    }
  );

  return index;
}


function h3LevelResolveQueueSkill_(
  masterRows,
  queueRow,
  targetLevel
) {
  if (
    !queueRow ||
    !queueRow.SKILL_ID
  ) {
    throw new Error(
      'LEVEL_RUNTIME_QUEUE_SKILL_INVALID'
    );
  }

  var target =
    h3LevelNormalize_(
      targetLevel
    );
  var skillId =
    h3LevelRequireSkillId_(
      queueRow.SKILL_ID
    );
  var master =
    h3LevelMasterIndex_(
      masterRows
    )[skillId];

  if (!master) {
    throw new Error(
      'LEVEL_RUNTIME_MASTER_SKILL_MISSING:' +
        skillId
    );
  }

  if (
    master.LEVEL !== target
  ) {
    throw new Error(
      'LEVEL_RUNTIME_QUEUE_LEVEL_MISMATCH:' +
        skillId
    );
  }

  return {
    state_key:
      h3LevelSkillStateKey_(
        master.LEVEL,
        skillId
      ),
    level:
      master.LEVEL,
    skill_id:
      skillId
  };
}


function h3LevelPromotionPlan_(
  metrics
) {
  metrics = metrics || {};

  var currentLevel =
    h3LevelNormalize_(
      metrics.current_level ||
        '3級'
    );
  var accuracy =
    Number(
      metrics.accuracy
    );
  var stableSets =
    Number(
      metrics.stable_sets
    );

  if (
    !Number.isFinite(accuracy) ||
    accuracy < 0 ||
    accuracy > 1 ||
    !Number.isInteger(
      stableSets
    ) ||
    stableSets < 0
  ) {
    throw new Error(
      'LEVEL_RUNTIME_PROMOTION_METRICS_INVALID'
    );
  }

  if (currentLevel !== '3級') {
    return {
      schema:
        'H3_LEVEL_PROMOTION_PLAN_V1',
      current_level:
        currentLevel,
      action:
        'NO_HIGHER_LEVEL_POLICY',
      jun2_question_count:
        0,
      share_up:
        false
    };
  }

  var action =
    'H3_ONLY';
  var jun2QuestionCount = 0;
  var shareUp = false;

  if (accuracy < 0.70) {
    action =
      'H3_CORE_RETEST';
  } else if (
    accuracy > 0.90 &&
    stableSets >= 5
  ) {
    action =
      'JUN2_SHARE_UP';
    jun2QuestionCount = 1;
    shareUp = true;
  } else if (
    accuracy >= 0.80 &&
    stableSets >= 3
  ) {
    action =
      'ADD_JUN2_ONE';
    jun2QuestionCount = 1;
  }

  return {
    schema:
      'H3_LEVEL_PROMOTION_PLAN_V1',
    current_level:
      currentLevel,
    action:
      action,
    jun2_question_count:
      jun2QuestionCount,
    share_up:
      shareUp
  };
}


function h3LevelActivationReadiness_(
  masterRows,
  targetLevel
) {
  var target =
    h3LevelNormalize_(
      targetLevel
    );
  var rows =
    (masterRows || []).filter(
      function (row) {
        return (
          row &&
          String(
            row.LEVEL || ''
          ) === target
        );
      }
    );

  if (!rows.length) {
    return {
      schema:
        'H3_LEVEL_ACTIVATION_READINESS_V1',
      level:
        target,
      ready:
        false,
      status:
        target === '準2級'
          ? 'BLOCKED_NO_JUN2_TAXONOMY'
          : 'BLOCKED_NO_LEVEL_TAXONOMY',
      skill_count:
        0
    };
  }

  var index =
    h3LevelMasterIndex_(
      rows
    );

  return {
    schema:
      'H3_LEVEL_ACTIVATION_READINESS_V1',
    level:
      target,
    ready:
      true,
    status:
      'TAXONOMY_PRESENT_NOT_RUNTIME_ACTIVATED',
    skill_count:
      Object.keys(index).length
  };
}
