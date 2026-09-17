/**
 * K1 Japanese choice-number voice comparison prototype.
 *
 * Scope:
 * - Generates four short MP3 files in VOICE_FOLDER_ID.
 * - Uses the exact K1 number texts and 900 ms trailing gap.
 * - Does not read/write Google Sheets.
 * - Does not change Listening/Written runtime state, logs, scheduler, or pointers.
 * - Does not affect the production K1 default voice (Nanami).
 */

const HQ_K1_JP_VOICE_PROTOTYPES = [
  {
    label: 'Nanami',
    id: 'ja-JP-NanamiNeural',
    rate: '+0%'
  },
  {
    label: 'Aoi',
    id: 'ja-JP-AoiNeural',
    rate: '+0%'
  },
  {
    label: 'Mayu',
    id: 'ja-JP-MayuNeural',
    rate: '+0%'
  },
  {
    label: 'Shiori',
    id: 'ja-JP-ShioriNeural',
    rate: '+0%'
  }
];

function generateK1JapaneseNumberVoicePrototypes() {
  const c = config_();
  const folder = DriveApp.getFolderById(
    c.VOICE_FOLDER_ID
  );

  if (folder.isTrashed()) {
    throw new Error(
      'Voice folder is trashed.'
    );
  }

  const texts = [
    HQ_K1_NUMBER_TEXTS.choice_number1,
    HQ_K1_NUMBER_TEXTS.choice_number2,
    HQ_K1_NUMBER_TEXTS.choice_number3,
    HQ_K1_NUMBER_TEXTS.choice_number4
  ];

  const results = [];

  HQ_K1_JP_VOICE_PROTOTYPES.forEach(
    voice => {
      const fileName =
        'SYSTEM_TEST_K1_JP_NUMBER_VOICE_' +
        voice.label +
        '.mp3';

      const existing =
        folder.getFilesByName(
          fileName
        );

      if (existing.hasNext()) {
        const file = existing.next();

        results.push({
          voice: voice.label,
          voice_id: voice.id,
          file_id: file.getId(),
          audio_url: file.getUrl(),
          reused: true
        });

        return;
      }

      let body = '';

      texts.forEach(
        text => {
          body += azureVoiceBlock_(
            voice,
            text,
            '900ms',
            null
          );
        }
      );

      const ssml =
        '<speak version="1.0" ' +
        'xmlns="http://www.w3.org/2001/10/synthesis" ' +
        'xmlns:mstts="http://www.w3.org/2001/mstts" ' +
        'xml:lang="ja-JP">' +
        body +
        '</speak>';

      const blob = synthesize_(
        ssml,
        c
      );

      blob.setName(
        fileName
      );

      const file =
        folder.createFile(
          blob
        );

      file.setDescription(
        'SYSTEM_TEST_K1_JP_NUMBER_VOICE_PROTOTYPE:' +
        voice.label
      );

      results.push({
        voice: voice.label,
        voice_id: voice.id,
        file_id: file.getId(),
        audio_url: file.getUrl(),
        reused: false
      });
    }
  );

  console.log(
    JSON.stringify(results)
  );

  return results;
}
