/**
 * H3 3級 NEWFMT runtime helpers.
 *
 * Pure slot decoration/validation only. No Sheet writes.
 */

var H3_WRITTEN_NEWFMT_RUNTIME_CONTRACT_ID_ =
  'H3-H3-NEWFMT-RUNTIME-20260921-V1';


function h3WrittenNewfmtSlotMetadata_(
  bucket,
  section
) {
  if (
    String(bucket || '') !==
      'NEWFMT'
  ) {
    return null;
  }

  var definition =
    h3NewfmtDefinitionForSlot_(
      '3級',
      section
    );

  if (
    !h3NewfmtCanUseCurrentH3Ratio_(
      definition.format_id
    ) ||
    definition.source_status !==
      'SOURCE_BOUND'
  ) {
    throw new Error(
      'WRITTEN_NEWFMT_SOURCE_NOT_RUNTIME_ELIGIBLE'
    );
  }

  return {
    format_id:
      definition.format_id,
    format_source_contract_id:
      H3_NEWFMT_SOURCE_CONTRACT_ID_,
    format_level:
      definition.level,
    format_item_count:
      definition.item_count,
    format_points_each:
      definition.points_each,
    format_total_points:
      definition.total_points,
    format_answer_type:
      definition.answer_type,
    format_prompt_semantics:
      definition.prompt_semantics,
    format_source_status:
      definition.source_status
  };
}


function h3WrittenNewfmtDecorateSlot_(
  slot
) {
  if (!slot) {
    throw new Error(
      'WRITTEN_NEWFMT_SLOT_INVALID'
    );
  }

  var out =
    Object.assign(
      {},
      slot
    );

  var metadata =
    h3WrittenNewfmtSlotMetadata_(
      out.bucket,
      out.section
    );

  if (!metadata) {
    return out;
  }

  return Object.assign(
    out,
    metadata
  );
}


function h3WrittenNewfmtValidateSourceRows_(
  sourceRows
) {
  var newfmtRows =
    (sourceRows || []).filter(
      function (record) {
        var row =
          record &&
          record.object
            ? record.object
            : record || {};

        return (
          String(
            row.PRIMARY_BUCKET || ''
          ) === 'NEWFMT'
        );
      }
    );

  if (newfmtRows.length !== 1) {
    throw new Error(
      'WRITTEN_NEWFMT_20Q_COUNT_INVALID:' +
        newfmtRows.length
    );
  }

  newfmtRows.forEach(
    function (record) {
      var row =
        record &&
        record.object
          ? record.object
          : record;

      h3WrittenNewfmtSlotMetadata_(
        'NEWFMT',
        row.SECTION
      );
    }
  );

  return true;
}


function h3WrittenNewfmtValidatePlannedSlots_(
  plannedSlots
) {
  (plannedSlots || []).forEach(
    function (slot) {
      if (
        String(
          slot.bucket || ''
        ) !== 'NEWFMT'
      ) {
        return;
      }

      var expected =
        h3WrittenNewfmtSlotMetadata_(
          'NEWFMT',
          slot.section
        );

      Object.keys(
        expected
      ).forEach(
        function (key) {
          if (
            slot[key] !==
              expected[key]
          ) {
            throw new Error(
              'WRITTEN_NEWFMT_SLOT_METADATA_MISMATCH:' +
                key
            );
          }
        }
      );
    }
  );

  return true;
}


function h3WrittenNewfmtPatchStageMeta_(
  meta
) {
  if (
    !meta ||
    !Array.isArray(
      meta.planned_slots
    )
  ) {
    throw new Error(
      'WRITTEN_NEWFMT_STAGE_META_INVALID'
    );
  }

  var out =
    JSON.parse(
      JSON.stringify(meta)
    );

  out.newfmt_runtime_contract_id =
    H3_WRITTEN_NEWFMT_RUNTIME_CONTRACT_ID_;
  out.newfmt_source_contract_id =
    H3_NEWFMT_SOURCE_CONTRACT_ID_;

  out.planned_slots =
    out.planned_slots.map(
      function (slot) {
        return h3WrittenNewfmtDecorateSlot_(
          slot
        );
      }
    );

  h3WrittenNewfmtValidatePlannedSlots_(
    out.planned_slots
  );

  return out;
}
