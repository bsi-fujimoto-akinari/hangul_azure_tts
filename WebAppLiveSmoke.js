/* =========================================================
 * H3 AUTOMATIC READ-ONLY LIVE SMOKE
 * Permanent CI-only execution surface.
 * =======================================================*/

var H3_AUTO_LIVE_SMOKE_REQUEST_SCHEMA_ =
  'H3_AUTOMATIC_LIVE_SMOKE_REQUEST_V1';
var H3_AUTO_LIVE_SMOKE_RESULT_SCHEMA_ =
  'H3_AUTOMATIC_LIVE_SMOKE_RESULT_V1';
var H3_AUTO_LIVE_SMOKE_ALLOWED_SUITES_ = [
  'REVIEW_5W',
  'SYSTEM_TEST_RENDER'
];

function h3AutomaticLiveSmokeRequireSource_(
  request
) {
  var sha =
    String(
      request &&
      request.source_sha ||
      ''
    );
  var digest =
    String(
      request &&
      request.source_digest ||
      ''
    );

  if (
    !/^[0-9a-f]{40}$/.test(sha) ||
    !/^[0-9a-f]{64}$/.test(digest)
  ) {
    throw new Error(
      'AUTO_LIVE_SMOKE_SOURCE_IDENTITY_INVALID'
    );
  }

  var binding =
    h3ObservabilitySourceBindingRead_();

  if (
    !binding ||
    binding.status !== 'READY' ||
    binding.source_sha !== sha ||
    binding.source_digest !== digest
  ) {
    throw new Error(
      'AUTO_LIVE_SMOKE_SOURCE_BINDING_MISMATCH'
    );
  }

  return {
    source_sha:
      sha,
    source_digest:
      digest,
    source_file_count:
      Number(
        binding.source_file_count || 0
      )
  };
}

function h3AutomaticLiveSmokeSuites_(
  request
) {
  if (
    !request ||
    request.schema !==
      H3_AUTO_LIVE_SMOKE_REQUEST_SCHEMA_ ||
    !Array.isArray(request.suites) ||
    request.suites.length < 1
  ) {
    throw new Error(
      'AUTO_LIVE_SMOKE_REQUEST_INVALID'
    );
  }

  var seen = {};
  var suites = [];

  request.suites.forEach(
    function (raw) {
      var suite =
        String(raw || '');
      if (
        H3_AUTO_LIVE_SMOKE_ALLOWED_SUITES_
          .indexOf(suite) < 0
      ) {
        throw new Error(
          'AUTO_LIVE_SMOKE_SUITE_NOT_ALLOWED:' +
          suite
        );
      }
      if (seen[suite]) {
        throw new Error(
          'AUTO_LIVE_SMOKE_SUITE_DUPLICATE:' +
          suite
        );
      }
      seen[suite] = true;
      suites.push(suite);
    }
  );

  return suites;
}

function h3AutomaticLiveSmokeReview5W_() {
  var payload =
    h3GetListeningWebSetCore_({
      schema:
        'H3_WEB_RENDER_REQUEST_V1',
      mode:
        'REVIEW',
      review_kind:
        'WRITTEN',
      surface_family:
        '5W',
      set_id:
        'H3-20260914-03',
      q_no:
        1,
      txn_id:
        null,
      legacy_review_id:
        null
    });

  var sections =
    payload &&
    Array.isArray(
      payload.sections
    )
      ? payload.sections
      : null;

  if (
    !payload ||
    payload.schema !==
      'H3_PERSISTENT_WRITTEN_REVIEW_PAYLOAD_V1' ||
    payload.mode !== 'REVIEW' ||
    payload.kind !== 'WRITTEN' ||
    payload.provider_kind !== 'WRITTEN' ||
    payload.surface_family !== '5W' ||
    Number(
      payload.surface_set_no
    ) !== 6 ||
    !sections ||
    sections.length !== 5 ||
    payload.read_only !== true ||
    payload.persisted !== true
  ) {
    throw new Error(
      'AUTO_LIVE_SMOKE_REVIEW_5W_CONTRACT_MISMATCH'
    );
  }

  return {
    suite:
      'REVIEW_5W',
    status:
      'PASS',
    schema:
      payload.schema,
    mode:
      payload.mode,
    kind:
      payload.kind,
    provider_kind:
      payload.provider_kind,
    surface_family:
      payload.surface_family,
    surface_set_no:
      Number(
        payload.surface_set_no
      ),
    sections_len:
      sections.length,
    read_only:
      true
  };
}

function h3AutomaticLiveSmokeSystemTest_() {
  var payload =
    h3GetListeningWebSetCore_({
      schema:
        'H3_WEB_RENDER_REQUEST_V1',
      mode:
        'SYSTEM_TEST',
      set_id:
        H3_WEB_SYSTEM_TEST_R3_06_SET_ID
    });

  var questions =
    payload &&
    Array.isArray(
      payload.questions
    )
      ? payload.questions
      : null;

  if (
    !payload ||
    payload.schema !==
      'H3_WEB_SET_V1' ||
    payload.mode !==
      'SYSTEM_TEST' ||
    payload.nonlearning !== true ||
    !questions ||
    questions.length !== 5
  ) {
    throw new Error(
      'AUTO_LIVE_SMOKE_SYSTEM_TEST_CONTRACT_MISMATCH'
    );
  }

  return {
    suite:
      'SYSTEM_TEST_RENDER',
    status:
      'PASS',
    schema:
      payload.schema,
    mode:
      payload.mode,
    nonlearning:
      true,
    questions_len:
      questions.length,
    read_only:
      true
  };
}

function h3AutomaticLiveSmoke(request) {
  var errorStatePhase1 =
    h3ErrorStatePhase1SelfTest_();
  var errorStatePhase2 =
    h3ErrorStatePhase2SelfTest_();
  var errorStatePhase3 =
    h3ErrorStatePhase3SelfTest_();
  var errorStatePhase4 =
    h3MonitoringErrorStatePhase4SelfTest_();
  var errorStateObserver =
    h3MonitoringErrorStateSource_(
      SpreadsheetApp.openById(
        H3_WEB_RUNTIME_SPREADSHEET_ID
      ),
      Date.now()
    );
  var source =
    h3AutomaticLiveSmokeRequireSource_(
      request
    );
  var suites =
    h3AutomaticLiveSmokeSuites_(
      request
    );
  var results = [];

  suites.forEach(
    function (suite) {
      if (
        suite ===
        'REVIEW_5W'
      ) {
        results.push(
          h3AutomaticLiveSmokeReview5W_()
        );
        return;
      }

      if (
        suite ===
        'SYSTEM_TEST_RENDER'
      ) {
        results.push(
          h3AutomaticLiveSmokeSystemTest_()
        );
        return;
      }

      throw new Error(
        'AUTO_LIVE_SMOKE_SUITE_UNREACHABLE'
      );
    }
  );

  return {
    schema:
      H3_AUTO_LIVE_SMOKE_RESULT_SCHEMA_,
    status:
      'PASS',
    source_sha:
      source.source_sha,
    source_digest:
      source.source_digest,
    source_file_count:
      source.source_file_count,
    error_state_phase1:
      errorStatePhase1,
    error_state_phase2:
      errorStatePhase2,
    error_state_phase3:
      errorStatePhase3,
    error_state_phase4:
      errorStatePhase4,
    error_state_observer:
      errorStateObserver,
    suites:
      results,
    write_performed:
      false
  };
}
