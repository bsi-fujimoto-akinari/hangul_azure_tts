# H3 2026 Official New-Format Source Contract

Version: H3-2026-NEWFMT-SOURCE-20260921-V1
Status: SOURCE_BOUND_VERIFIED
Evidence SHA256: 00771e014fab89b5d94416e8687a5b3cc78d93de281164e8d612af156b054096

## 1. Authorities

Primary authority:
- Organization: 特定非営利活動法人 ハングル能力検定協会
- Document: 2026年春季第65回試験問題からの一部出題形式や設問の変更について
- Published: 2026-03-06
- URL: https://hangul.or.jp/cms/wp-content/uploads/2026/03/%E7%AC%AC65%E5%9B%9E%E8%A9%A6%E9%A8%93%E5%95%8F%E9%A1%8C_%E5%BD%A2%E5%BC%8F%E8%A8%AD%E5%95%8F%E5%A4%89%E6%9B%B426.3.6.pdf

Direction cross-check for 準2級 D12:
- Organization: ハングル能力検定協会
- Document: 準2級 問題冊子見本
- URL: https://www.hangul.or.jp/cms2019/wp-content/uploads/2019/07/samplej2kyu.pdf
- The sample D12 presents a Japanese source sentence and Korean answer choices. The 2026 change document changes the number of D12 items, not the translation direction. Therefore the canonical direction remains JP_TO_KR.

## 2. Bound format facts

| FORMAT_ID | LEVEL | SECTION | FORMAT | ITEM_COUNT | POINTS_EACH | TOTAL_POINTS | SURFACE | DIRECTION |
| --- | --- | --- | --- | ---: | ---: | ---: | --- | --- |
| H3_D2_FILL7 | 3級 | D2 | one blank; choose the most appropriate option | 7 | 1 | 7 | 5W | - |
| H3_D5_COMMON2 | 3級 | D5 | choose one expression that can fit both blanks | 2 | 1 | 2 | 5W | - |
| JUN2_D5_COMMON2X2 | 準2級 | D5 | choose one expression that can fit both blanks | 2 | 2 | 4 | 5W | - |
| JUN2_D12_JP_TO_KR_4X2 | 準2級 | D12 | choose the most appropriate translation of the underlined Japanese text | 4 | 2 | 8 | TRANSLATION | JP_TO_KR |

All four formats apply from the 2026 spring 65th examination.

## 3. Legacy-token correction

The earlier project token `D12_KRtoJP4x2` has the direction reversed relative to the official 準2級 sample.

Compatibility behavior:
- legacy raw token: `D12_KRtoJP4x2`
- canonical raw token: `D12_JPtoKR4x2`
- canonical format ID: `JUN2_D12_JP_TO_KR_4X2`
- alias status: `DEPRECATED_DIRECTION_MISMATCH`

The legacy token may be accepted only as an input alias. It must never determine runtime direction.

## 4. Source binding fields

Every source-bound format carries:
- source_id = HANGUL_ASSOC_20260306_FORMAT_CHANGE
- source_status = SOURCE_BOUND
- source_published_at = 2026-03-06
- source_url
- item_count
- points_each
- total_points
- prompt_semantics
- answer_type = MULTIPLE_CHOICE
- translation_direction where applicable

## 5. Non-inference rule

Only the four facts above are source-bound by this contract.

This contract does not infer:
- actual 2026 question wording;
- answer content;
- distractor content;
- skill taxonomy beyond the tested format operation;
- any 準2級 section not covered by the official change document.

## 6. Runtime consequences

3級:
- H3_D2_FILL7 and H3_D5_COMMON2 are eligible for the existing NEWFMT primary bucket, subject to the 1/20Q ratio and section-aware routing.

準2級:
- JUN2_D5_COMMON2X2 and JUN2_D12_JP_TO_KR_4X2 become valid authoritative seeds for a separate 準2級 taxonomy/master.
- They do not inherit the 3級 11/6/2/1 ratio.
