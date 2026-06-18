# Skill: <kebab-case-name>

- **Trigger:** `IF [<điều kiện kích hoạt: Type / Lane / Giai đoạn / sự kiện>]`
- **Lane áp dụng:** tiny | normal | high-risk (hoặc "mọi lane")
- **Giai đoạn:** GĐ<n> (gắn vào bước nào của workflow)

## INPUT (gom context trước — Discovery Before Shape)

- <context/file/record BẮT BUỘC đọc trước khi chạy>

## STEPS (mệnh lệnh, có thứ tự)

1. <bước 1>
2. <bước 2>

## VERIFY (bằng chứng cơ học)

- <lệnh proof; gắn `harness-cli story verify <ID>` nếu có code>

## ARTIFACTS (đầu ra)

- <docs/records sinh ra: docs/product/_, docs/stories/_, decision, trace...>

## FRICTION HOOKS

- `IF [<tình huống>]`: ghi friction (GĐ5) + cân nhắc backlog (GĐ6).

## EXIT (tiêu chí xong)

- <điều kiện coi là hoàn tất>
