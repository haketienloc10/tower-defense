# Skill: tdd-red-green

- **Trigger:** `IF [GĐ3, TRƯỚC khi viết code logic, task khóa-behavior]` (bug
  fix chống tái phát, business/permission/auth rule, parser/mapper/converter,
  workflow nhiều state, refactor rủi ro phá behavior, core dùng lại, nhiều edge
  khó kiểm bằng mắt). Bỏ qua nếu UI-layout/CSS, prototype/spike, CRUD tầm
  thường, script một lần, docs/config không đổi runtime.
- **Lane:** normal | high-risk (tiny: bỏ qua, dùng verification nhẹ GĐ4).
- **Giai đoạn:** Mở đầu GĐ3, TRƯỚC Cửa ải `skills/quality-gate-review.md`.

Coi TDD là công cụ kiểm soát rủi ro, KHÔNG phải nghi thức cho mọi task. CHỈ khóa
behavior bằng test-first khi test thật sự giảm rủi ro regression.

## INPUT (đọc trước khi chạy)

- Intake (GĐ1): Lane + Risk Flags / Hard Gates → quyết TDD hay verification nhẹ.
- Story packet `validation.md` (Test Plan / Fixtures) nếu có; `02-STANDARDS.md`
  Test Matrix để chọn tier (unit/integration/e2e/platform) cho hành vi này.
- File/unit sẽ đổi; bug report tái hiện được nếu là bug fix.

## STEPS

1. **CLASSIFY:** Phân loại task theo Trigger: TDD hay không. KHÔNG chắc → chọn
   TDD nhẹ, đừng bỏ. KHÔNG cần TDD → THOÁT skill, theo Validation Ladder GĐ4;
   ghi lý do bỏ TDD + rủi ro còn lại ở trace GĐ5.
2. **CONTRACT (test-first):** Ghi ngắn: behavior chính, input hợp lệ / không hợp
   lệ, edge, failure, invariant không được phá, out-of-scope, test cases dự
   kiến. Có `validation.md` → bổ sung vào đó, KHÔNG nhân bản.
3. **RED:** Viết test TRƯỚC; kiểm behavior, KHÔNG kiểm implementation detail;
   KHÔNG mock unit đang test. Chạy test runner trực tiếp (chưa cần
   `story verify` — GĐ4 mới gắn `--verify`). ĐỌC log fail; xác nhận fail vì
   thiếu/sai implementation, KHÔNG phải lỗi setup test. Pass ngay → giải thích.
4. **GREEN:** Viết code TỐI THIỂU để pass. KHÔNG mở rộng scope; KHÔNG refactor
   lớn; KHÔNG sửa test sau khi implement (trừ khi test sai requirement — ghi rõ
   lý do). Chạy lại test runner → pass.
5. **REFACTOR (tùy chọn):** KHÔNG đổi behavior / public contract ngoài scope.
   Chạy lại test; fail → sửa code hoặc rollback refactor.

## VERIFY

- ĐỌC log test runner: phải thấy fail ở RED → pass ở GREEN/sau REFACTOR. KHÔNG
  chạy `harness-cli story verify <ID>` ở đây — Cửa ải `quality-gate-review` +
  GĐ4 hợp nhất proof.
- **GATE:** Chưa thấy RED→GREEN thật → CẤM coi GREEN là xong, CẤM rời inner
  loop. (Proof `1` / sang GĐ4 do GĐ4 + `quality-gate-review` gác.)
- KHÔNG kiểm chất lượng test ở đây (missing tier, proof lệch claim, mock che
  bug, negative/failure path) — giao Lens 3 `skills/quality-gate-review.md`.

## ARTIFACTS

- File test (RED) + file code (GREEN) → `git status --short`.
- Behavior Contract → story `validation.md` (nếu có) hoặc trace GĐ5 `--notes`.
- Trace GĐ5: ghi `"skill: tdd-red-green"` ở `--actions`/`--notes`.

## FRICTION HOOKS

- `IF [test pass ngay ở RED mà không rõ lý do]` HOẶC
  `[phải sửa test sau GREEN để code pass]` HOẶC
  `[mock quá sâu che hành vi thật]` HOẶC
  `[viết test SAU khi implement rồi gọi là TDD]`: ghi friction (GĐ5) + cân nhắc
  backlog (GĐ6), theo Failure Attribution ở GĐ5.

## EXIT

- Đã CLASSIFY là task cần TDD (nếu không cần → đã thoát skill ở STEP 1).
- RED (fail đã đọc, đúng lý do) → GREEN (pass đã đọc) → REFACTOR (nếu làm thì
  test vẫn pass).
- Test kiểm behavior, có negative path khi áp dụng.
- Rủi ro còn lại + missing test (nếu có) đã ghi rõ.
