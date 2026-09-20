/**
 * Common learning-surface contract helpers.
 *
 * Phase 1 introduces provider/family/level/cardinality metadata without
 * changing current 5L or 5W source-lock, grading, scheduler, media, or
 * transaction ownership.
 */

var H3_LEARNING_SURFACE_SCHEMA_ =
  'H3_LEARNING_SURFACE_V1';

var H3_LEARNING_SURFACE_FAMILIES_ = [
  '5L',
  '5W',
  'READING',
  'TRANSLATION'
];

var H3_LEARNING_SURFACE_LEVELS_ = [
  '3級',
  '準2級'
];

var H3_LEARNING_SURFACE_MODE_DEFAULTS_ = {
  LISTENING: {
    provider_kind: 'LISTENING',
    surface_family: '5L',
    level: '3級'
  },
  WRITTEN: {
    provider_kind: 'WRITTEN',
    surface_family: '5W',
    level: '3級'
  }
};

function h3LearningSurfaceExpectedSections_(
  surfaceFamily
) {
  if (surfaceFamily === '5L') {
    return ['K1', 'K2', 'K3', 'K4', 'K5'];
  }

  if (surfaceFamily === '5W') {
    return ['D2', 'D3', 'D4', 'D5', 'D6'];
  }

  return null;
}

function h3LearningSurfaceValidate_(
  metadata,
  items
) {
  if (
    !metadata ||
    typeof metadata !== 'object' ||
    Array.isArray(metadata)
  ) {
    throw new Error(
      'LEARNING_SURFACE_METADATA_REQUIRED'
    );
  }

  if (
    String(metadata.learning_surface_schema || '') !==
      H3_LEARNING_SURFACE_SCHEMA_
  ) {
    throw new Error(
      'LEARNING_SURFACE_SCHEMA_INVALID'
    );
  }

  var providerKind =
    String(metadata.provider_kind || '');
  var surfaceFamily =
    String(metadata.surface_family || '');
  var level =
    String(metadata.level || '');
  var itemCount =
    Number(metadata.item_count);

  if (
    ['LISTENING', 'WRITTEN']
      .indexOf(providerKind) < 0
  ) {
    throw new Error(
      'LEARNING_SURFACE_PROVIDER_INVALID'
    );
  }

  if (
    H3_LEARNING_SURFACE_FAMILIES_
      .indexOf(surfaceFamily) < 0
  ) {
    throw new Error(
      'LEARNING_SURFACE_FAMILY_INVALID'
    );
  }

  if (
    H3_LEARNING_SURFACE_LEVELS_
      .indexOf(level) < 0
  ) {
    throw new Error(
      'LEARNING_SURFACE_LEVEL_INVALID'
    );
  }

  if (
    surfaceFamily === '5L' &&
    providerKind !== 'LISTENING'
  ) {
    throw new Error(
      'LEARNING_SURFACE_PROVIDER_FAMILY_MISMATCH'
    );
  }

  if (
    surfaceFamily !== '5L' &&
    providerKind !== 'WRITTEN'
  ) {
    throw new Error(
      'LEARNING_SURFACE_PROVIDER_FAMILY_MISMATCH'
    );
  }

  if (
    !Number.isInteger(itemCount) ||
    itemCount < 1
  ) {
    throw new Error(
      'LEARNING_SURFACE_ITEM_COUNT_INVALID'
    );
  }

  if (!Array.isArray(items)) {
    throw new Error(
      'LEARNING_SURFACE_ITEMS_REQUIRED'
    );
  }

  if (items.length !== itemCount) {
    throw new Error(
      'LEARNING_SURFACE_ITEM_COUNT_MISMATCH'
    );
  }

  var expectedSections =
    h3LearningSurfaceExpectedSections_(
      surfaceFamily
    );

  if (expectedSections) {
    if (itemCount !== 5) {
      throw new Error(
        'LEARNING_SURFACE_FIXED_CARDINALITY_INVALID'
      );
    }

    items.forEach(function (item, index) {
      if (
        !item ||
        String(item.section || '') !==
          expectedSections[index]
      ) {
        throw new Error(
          'LEARNING_SURFACE_SECTION_ORDER_INVALID'
        );
      }
    });
  }

  return true;
}

function h3LearningSurfaceMetadataForMode_(
  mode,
  items
) {
  var normalizedMode =
    String(mode || '');
  var defaults =
    H3_LEARNING_SURFACE_MODE_DEFAULTS_[
      normalizedMode
    ];

  if (!defaults) {
    throw new Error(
      'LEARNING_SURFACE_MODE_INVALID'
    );
  }

  var metadata = {
    learning_surface_schema:
      H3_LEARNING_SURFACE_SCHEMA_,
    provider_kind:
      defaults.provider_kind,
    surface_family:
      defaults.surface_family,
    level:
      defaults.level,
    item_count:
      Array.isArray(items)
        ? items.length
        : 0
  };

  h3LearningSurfaceValidate_(
    metadata,
    items
  );

  return metadata;
}

function h3LearningSurfaceLegacyReviewMetadata_(
  providerKind
) {
  var normalized =
    String(providerKind || '');

  if (normalized === 'LISTENING') {
    return {
      learning_surface_schema:
        H3_LEARNING_SURFACE_SCHEMA_,
      provider_kind: 'LISTENING',
      surface_family: '5L',
      level: '3級'
    };
  }

  if (normalized === 'WRITTEN') {
    return {
      learning_surface_schema:
        H3_LEARNING_SURFACE_SCHEMA_,
      provider_kind: 'WRITTEN',
      surface_family: '5W',
      level: '3級'
    };
  }

  throw new Error(
    'LEARNING_SURFACE_LEGACY_PROVIDER_INVALID'
  );
}
