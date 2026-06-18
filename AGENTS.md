# Agent Instructions

Add project-specific agent instructions here.

<!-- HARNESS:BEGIN -->

## Harness

Repo này **CÀI Harness** (xem `_harness/.harness-manifest`). Toàn bộ **tầng vận
hành** của Harness nằm gọn trong MỘT thư mục:

- `_harness/` — engine (`_harness/bin/harness-cli`, `_harness/schema/`), CSDL vận
  hành (`_harness/harness.db`), tài liệu khung + template (`_harness/docs/`), và
  skill. Đây **KHÔNG** phải mã nguồn sản phẩm của repo: đừng sửa/test/review/
  refactor như source, đừng mô tả như "the codebase" trong orient/wiki. Chỉ chạm
  khi tác vụ là **Harness Delta**.

➡️ **MỌI THỨ NGOÀI `_harness/` là của repo này** — gồm mã nguồn sản phẩm và tài
liệu sản phẩm trong `docs/` (`product/`, `stories/`, `decisions/`, `wiki/`,
`KNOWLEDGE_INDEX.md`) mà Harness chỉ quản lý ĐỊNH DẠNG; được sửa khi làm story.

**GATE (chặn cứng — không bỏ qua):** Hành động ĐẦU TIÊN của bạn trong repo này là
đọc `_harness/00-AGENTS.md`. Khi chưa đọc xong: KHÔNG đọc code, KHÔNG lập kế
hoạch, KHÔNG sửa/chạy bất cứ thứ gì. Áp dụng cho MỌI tác vụ — kể cả tác vụ trông
như một dòng. File đó định nghĩa quy trình bắt buộc của repo; bỏ qua = output sai
quy trình.
<!-- HARNESS:END -->
