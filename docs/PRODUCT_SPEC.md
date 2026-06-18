# ĐẶC TẢ SẢN PHẨM CHI TIẾT (PRODUCT / FUNCTIONAL SPEC)
## Auto-battler Tower Defense — Bản hoàn thiện v1.0

> Tài liệu này đi cùng **TECHNICAL_SPEC.md** (kiến trúc, game loop, render, ECS, pathfinding).
> Ở đây tập trung vào **"xây cái gì"**: số liệu cân bằng cụ thể, roster nội dung, từng màn hình UI, yêu cầu art/audio, và tiêu chí nghiệm thu (Definition of Done) để có thể hoàn thiện và phát hành.
>
> Mọi con số là **giá trị khởi điểm để cân bằng** (baseline), không phải số cuối — phần 18 mô tả cách tinh chỉnh.

---

## 0. Phạm vi & cột mốc sản phẩm

| Bản | Nội dung | Mục tiêu |
| --- | --- | --- |
| **MVP (chơi được)** | 1 chapter, 12 lính, 4 synergy, 3 đồ hoàn chỉnh, 6 quái + 1 miniboss + 1 boss, kinh tế đầy đủ, save cơ bản | Vòng lặp cốt lõi vui, hoàn chỉnh 1 màn |
| **v1.0 (phát hành)** | 3 chapter, ~18 lính, đầy đủ item grid, toàn bộ boss/miniboss GDD, meta + cây kỹ năng, thử thách, audio + polish | Sản phẩm hoàn thiện theo GDD mục 1–7 |
| **Hậu v1.0** | Tính năng GDD mục 8 (địa hình, thẻ bài, lai tạo), chapter 4+, localization mở rộng | Mở rộng chiều sâu |

---

## 1. Luồng người chơi tổng thể (Player Flow)

```
[Boot/Logo] → [Main Menu] ──► [Bản đồ Chiến dịch (Campaign Map)]
                  │                       │ chọn màn
                  │                       ▼
                  │              [Vào Trận (Battle)]
                  │             ┌──────────────────────────┐
                  │             │  Pha Chuẩn Bị  ⇄  Pha     │  (lặp mỗi wave)
                  │             │  (Setup)          Chiến Đấu│
                  │             └──────────┬───────────────┘
                  │                        ▼
                  │              [Kết Quả Trận (Result: 1–3★ / Thua)]
                  │                        ▼
                  └──────────► [Cây Kỹ Năng / Meta] ──► quay lại Campaign Map
[Settings] truy cập từ mọi màn qua nút Cài Đặt.
```

Người chơi luôn quay về Campaign Map giữa các trận. Tiến trình meta cập nhật sau mỗi trận (thắng hay thua đều nhận Mảnh Tinh Thể, thắng nhiều hơn).

---

## 2. Kinh tế — công thức & bảng số đầy đủ

### 2.1 Vàng mỗi wave

```
vàng nhận đầu wave = base + lãi + thưởng_chuỗi
  base          = 5
  lãi           = min( floor(gold_hiện_có / 10), 5 )      // tối đa 5
  thưởng_chuỗi  = tra bảng dưới theo |streak|
```

| |streak| | 0–1 | 2 | 3 | 4 | ≥5 |
| --- | --- | --- | --- | --- | --- |
| Thưởng | 0 | +1 | +1 | +2 | +3 |

- **Win streak**: tăng khi qua wave mà Nhà Chính **không mất máu**. **Loss streak**: tăng khi Nhà Chính mất máu trong wave (vẫn sống). Một trong hai luôn chạy → cơ chế comeback PvE.
- Thắng wave (sạch quái, nhà không mất máu) thưởng thêm **+1 vàng**.

### 2.2 Cấp độ & Kinh nghiệm (level = số lính tối đa trên sân)

| Cấp | Số lính tối đa | EXP cần lên cấp |
| --- | --- | --- |
| 1 | 3 | 2 |
| 2 | 4 | 2 |
| 3 | 5 | 6 |
| 4 | 6 | 10 |
| 5 | 7 | 20 |
| 6 | 8 | 36 |
| 7 | 9 | 56 |
| 8 | 10 | 80 |
| 9 | 11 | — (tối đa) |

- Mỗi wave tự nhận **+2 EXP**. Mua EXP: **4 vàng → +4 EXP**.

### 2.3 Tỉ lệ Shop theo cấp (xác suất ra lính theo tier giá)

| Cấp | T1 | T2 | T3 | T4 | T5 |
| --- | --- | --- | --- | --- | --- |
| 1–2 | 100% | – | – | – | – |
| 3 | 75% | 25% | – | – | – |
| 4 | 55% | 30% | 15% | – | – |
| 5 | 45% | 33% | 20% | 2% | – |
| 6 | 30% | 40% | 25% | 5% | – |
| 7 | 19% | 35% | 30% | 14% | 2% |
| 8 | 18% | 25% | 32% | 20% | 5% |
| 9 | 10% | 20% | 25% | 35% | 10% |

- **Reroll** (làm mới 5 ô): **2 vàng**.
- **Pool dùng chung trong run** (số bản sao mỗi lính theo tier): T1=22, T2=16, T3=13, T4=10, T5=6. Mua lính làm cạn pool → tạo giá trị cho việc "gom 3 sao" dù PvE.

### 2.4 Bán lính (refund)

```
refund = tổng_vàng_đã_đầu_tư − 1     (tối thiểu = cost của lính 1★)
1★ = cost ;  2★ = cost×3 − 1 ;  3★ = cost×9 − 1
```
Khi bán lính có trang bị: nhả trả lại **toàn bộ trang bị hoàn chỉnh + mảnh** vào túi đồ.

---

## 3. Roster Lính — chỉ số khởi điểm (MVP: 12 lính)

**Vai trò (role = AI nhắm mục tiêu):** `Tanker` chặn quái gần nhất • `Marksman` bắn quái sát Nhà Chính nhất • `Mage` AoE vào cụm đông nhất • `Assassin` nhảy ra sau lưng quái yếu/giá trị cao.
**Scaling sao:** HP và ATK ×1.8 mỗi sao (2★ = ×1.8, 3★ = ×3.24). Chỉ số khác giữ nguyên.

| Lính | Giá | Vai trò | Tộc/Hệ | HP | ATK | Tốc đánh | Tầm | Giáp | Năng lượng | Kỹ năng (tóm tắt) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Vệ Binh Sắt | 1 | Tanker | Đấu Sĩ, Công Nghệ | 650 | 40 | 0.60 | 1 | 30 | 0/60 | *Khiên Chắn:* tạo lá chắn = 30% HP tối đa, 4s |
| Cung Thủ Tập Sự | 1 | Marksman | Băng Giá | 450 | 45 | 0.75 | 4 | 10 | 0/50 | *Mũi Tên Buốt:* 1 mũi xuyên, 80% sát thương + làm chậm 30% |
| Dao Găm | 1 | Assassin | Sát Thủ | 500 | 55 | 0.70 | 1 | 15 | 0/40 | *Đâm Lén:* 180% sát thương lên mục tiêu sau lưng |
| Hiệp Sĩ Băng | 2 | Tanker | Đấu Sĩ, Băng Giá | 800 | 50 | 0.60 | 1 | 35 | 30/100 | *Va Băng:* gây dmg + đóng băng quái trước mặt 1s |
| Pháp Sư Lửa | 2 | Mage | Công Nghệ | 500 | 40 | 0.65 | 3 | 12 | 0/80 | *Cầu Lửa:* nổ AoE bán kính 1.5 ô, 250% AP |
| Sát Thủ Bóng | 2 | Assassin | Sát Thủ, Băng Giá | 550 | 60 | 0.75 | 1 | 18 | 0/50 | *Lướt Bóng:* dịch chuyển sau lưng + crit đảm bảo |
| Xạ Thủ Laser | 3 | Marksman | Công Nghệ | 600 | 60 | 0.80 | 4 | 15 | 0/60 | *Tia Xuyên:* tia laser xuyên cả hàng dọc |
| Vệ Thần Băng Giá | 3 | Tanker | Đấu Sĩ, Băng Giá | 950 | 55 | 0.60 | 1 | 45 | 40/120 | *Hào Băng:* đóng băng mọi quái quanh 1 ô, 1.5s |
| Pháp Sư Băng | 3 | Mage | Băng Giá | 600 | 50 | 0.65 | 3 | 15 | 30/90 | *Bão Tuyết:* AoE lớn + đóng băng 2s |
| Đại Pháp Sư | 4 | Mage | Công Nghệ | 700 | 65 | 0.70 | 3 | 18 | 0/100 | *Thiên Thạch:* AoE bán kính 2.5 ô, 400% AP |
| Hành Quyết Giả | 4 | Assassin | Sát Thủ | 750 | 85 | 0.85 | 1 | 25 | 0/60 | *Trảm:* xử tử quái dưới 20% HP, nếu giết được reset năng lượng |
| Đại Tướng Cơ Khí | 5 | Tanker/Carry | Đấu Sĩ, Công Nghệ | 1100 | 90 | 0.75 | 1 | 50 | 50/130 | *Khai Hỏa:* triệu 4 pháo laser bắn 6s, +25% giáp toàn đội |

**Cách nạp năng lượng:** +10 mỗi đòn đánh ra, +5% năng lượng tối đa mỗi lần nhận sát thương. Khi đầy → cast, reset về giá trị bắt đầu (cột "Năng lượng" dạng `start/max`).

> Phân bố trait đảm bảo đạt breakpoint trong MVP: Đấu Sĩ ×4, Công Nghệ ×5, Băng Giá ×5, Sát Thủ ×3. Breakpoint "6" của Đấu Sĩ/Sát Thủ thuộc **post-MVP** (cần thêm lính ở chapter 2–3).

---

## 4. Synergy — hiệu ứng chính xác từng mốc

Synergy đếm theo **số lính khác `id` (distinct)** mang trait đó trên sân.

| Tộc/Hệ | Mốc | Hiệu ứng (chính xác) |
| --- | --- | --- |
| **Đấu Sĩ** | 2 | Toàn đội +15% HP tối đa, +10 Giáp |
| | 4 | Toàn đội +30% HP tối đa, +25 Giáp |
| | 6 *(post-MVP)* | Toàn đội +50% HP, +45 Giáp, giảm 15% sát thương nhận |
| **Sát Thủ** | 3 | Lính Sát Thủ +25% tỉ lệ chí mạng; vào trận tự nhảy ra sau lưng quái |
| | 6 *(post-MVP)* | +50% chí mạng, +40% sát thương chí mạng |
| **Băng Giá** | 3 | Đòn đánh toàn đội có **20%** đóng băng 1.5s |
| | 5 | **35%** đóng băng 2s; quái đang bị đóng băng nhận **+15%** sát thương |
| **Công Nghệ** | 2 | Nhà Chính hồi **1% HP/giây** và bắn 1 laser mỗi 3s (gây 150 dmg) |
| | 4 | Hồi **2% HP/giây**; laser mỗi 2s, mạnh hơn (300 dmg) và bắn 2 mục tiêu |

Buff cộng dồn với trang bị và Nhà Chính "Thức Tỉnh". HUD hiển thị trait nào đang sáng và còn thiếu mấy lính tới mốc kế.

---

## 5. Trang bị — mảnh, công thức ghép, chỉ số

### 5.1 Mảnh cơ bản (component)

| Mảnh | Chỉ số cộng |
| --- | --- |
| Kiếm B.F | +15 ATK |
| Cung Gỗ | +12% Tốc đánh |
| Giáp Lưới | +20 Giáp |
| Đai Máu | +150 HP |
| Nước Mắt | +15 Năng lượng bắt đầu |
| Gậy Phép | +20% Sức mạnh kỹ năng (AP) |

### 5.2 Đồ hoàn chỉnh (2 mảnh → 1 đồ)

| Đồ | Công thức | Chỉ số + Hiệu ứng | Hợp với |
| --- | --- | --- | --- |
| **Cuồng Đao** | Kiếm B.F + Cung Gỗ | +15 ATK, +12% AS; mỗi đòn +5% tốc đánh, cộng dồn tối đa 6 lần | Xạ Thủ |
| **Áo Choàng Gai** | Giáp Lưới + Đai Máu | +20 Giáp, +150 HP; phản **15%** sát thương vật lý nhận về kẻ đánh | Đấu Sĩ tanker |
| **Trượng Thiên Sứ** | Nước Mắt + Gậy Phép | +20% AP, +15 năng lượng đầu; hồi thêm 15 năng lượng mỗi đòn đánh ra | Pháp Sư |

> Khung đầy đủ là lưới ghép 6×6 (mọi cặp component → 1 completed). MVP triển khai 3 công thức trên; v1.0 mở rộng dần. Quy tắc: tối đa **3 đồ/lính**, không tháo trừ khi bán lính.

---

## 6. Kẻ địch — roster & cấu thành wave

### 6.1 Quái thường (chỉ số gốc @ wave 1)

| Quái | Hành vi | HP | ATK | Giáp | Tốc | Tầm | Thưởng | Ghi chú |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Slime Con | walker | 250 | 20 | 0 | chậm | 1 | 1 vàng | bia tập |
| Goblin Chạy | walker | 180 | 15 | 0 | nhanh | 1 | 1 vàng | né nhanh tới nhà |
| Orc Trâu | walker | 600 | 35 | 20 | chậm | 1 | 2 vàng | đỡ đòn |
| Dơi Bay | flyer | 220 | 25 | 5 | nhanh | 1 | 1 vàng | bỏ qua chặn mặt đất |
| Lính Khiên | walker | 400 | 30 | 35 | TB | 1 | 2 vàng | giáp cao, cần xuyên giáp |
| Bom Tự Sát | walker | 200 | – | 0 | TB | 0 | 1 vàng | nổ AoE khi chạm lính/nhà |

### 6.2 Scaling theo wave

```
hp_quái   = hp_gốc  × (1 + 0.18 × (wave − 1))
atk_quái  = atk_gốc × (1 + 0.12 × (wave − 1))
số lượng spawn tăng dần theo WaveDef từng màn.
```

### 6.3 Ví dụ cấu thành Chapter 1 (10 wave)

| Wave | Thành phần | Vàng phát |
| --- | --- | --- |
| 1 | 6 Slime Con | 5 |
| 2 | 8 Slime + 3 Goblin Chạy | 5 |
| 3 | 10 Goblin + 2 Orc Trâu | 6 |
| 4 | 6 Lính Khiên + 6 Dơi Bay | 6 |
| **5** | **MINIBOSS: Vua Slime** + 6 Slime | 8 |
| 6 | 12 Goblin + 4 Orc + 3 Bom | 6 |
| 7 | 8 Lính Khiên + 8 Dơi | 7 |
| 8 | 6 Orc + 10 Goblin + 4 Bom | 7 |
| 9 | hỗn hợp đông (sóng áp lực) | 8 |
| **10** | **BOSS: Rồng Máy Khổng Lồ** | 10 |

---

## 7. Boss & Mini-boss — cơ chế chi tiết

Mỗi chiêu boss có **telegraph** (báo hiệu 1–1.5s trước khi ra đòn: vùng sáng/đường ngắm) để người chơi đọc được — quan trọng cho cảm giác công bằng dù auto.

### Mini-boss

| Tên | HP (×quái thường) | Cơ chế chính | Chu kỳ |
| --- | --- | --- | --- |
| Vua Slime | ×12 | Khi chết tách **8 Slime nhỏ** (×2 tốc độ) lao vào Nhà Chính | onDeath |
| Xe Tải Golem | ×18 | Húc: hất văng lính cận chiến **2 ô** ngược hướng, làm lộ hàng sau | mỗi 6s |
| Bóng Ma Sát Thủ | ×8 | Tàng hình (không bị nhắm), đi xuyên chặn, nhắm **lính HP thấp nhất** | liên tục |

### Boss chính

| Tên | HP (×quái thường) | Cơ chế chính | Telegraph | Đối phó |
| --- | --- | --- | --- | --- |
| Rồng Máy Khổng Lồ | ×40 | Khạc lửa thiêu **trọn 1 cột dọc** bàn cờ | sáng cột 1.5s | dàn trải đội hình |
| Phù Thủy Không Gian | ×35 | Mở cổng "bắt cóc" 1 lính ném ra góc xa + **khóa** 1 lính ngẫu nhiên 4s | vòng tròn dịch chuyển | đặt carry tránh rìa |
| Cỗ Máy Khoan Đất | ×50 | Bỏ qua lính, bắn **mìn thẳng vào Nhà Chính** liên tục | tia ngắm tới nhà | dồn DPS diệt cực nhanh |

---

## 8. Cấu trúc Chiến dịch (Campaign)

| Chapter | Khu vực | Số wave | Mini-boss (wave) | Boss cuối (wave) |
| --- | --- | --- | --- | --- |
| 1 | Khu Rừng Khởi Đầu | 10 | Vua Slime (5) | Rồng Máy (10) |
| 2 | Sa Mạc Nóng Bỏng | 12 | Xe Tải Golem (4), Bóng Ma (8) | Phù Thủy Không Gian (12) |
| 3 | Pháo Đài Hư Không | 15 | Xe Tải (5), Bóng Ma (10) | Cỗ Máy Khoan Đất (15) |

**Chấm sao** (theo % HP Nhà Chính còn lại khi thắng):

| Sao | Điều kiện |
| --- | --- |
| ⭐⭐⭐ | ≥ 80% HP |
| ⭐⭐ | ≥ 40% HP |
| ⭐ | > 0% HP |
| Thua | HP = 0 → chơi lại màn |

Nhà Chính HP gốc = **30** "mạng" (mỗi quái lọt trừ HP tùy loại); meta nâng lên tới 50.

---

## 9. Meta-progression

### 9.1 Mảnh Tinh Thể (tiền meta)

```
thưởng = 10 (qua màn lần đầu) + 5 × số_sao + 2 × số_wave_sống_sót (nếu thua)
```

### 9.2 Cây Kỹ Năng (Skill Tree) — node khởi điểm

| Node | Bậc | Chi phí (Mảnh) | Hiệu ứng |
| --- | --- | --- | --- |
| Khởi Đầu Giàu | 1–3 | 15 / 30 / 60 | Vàng khởi đầu +1 / +2 / +3 |
| Lính Khỏe | 1–3 | 20 / 40 / 80 | Toàn lính +3% / +6% / +10% HP & ATK |
| Nhà Vững | 1–3 | 20 / 40 / 80 | Nhà Chính +5 / +12 / +20 HP |
| Mài Giũa | 1–2 | 30 / 60 | Bắt đầu run với 1 / 2 mảnh trang bị ngẫu nhiên |
| Mở Khóa: Lính mới | – | 50 mỗi lính | Thêm lính vào pool |
| Tinh Mắt | 1–2 | 25 / 50 | Reroll rẻ hơn 1 vàng / miễn phí 1 reroll mỗi wave |

### 9.3 Chế độ Thử Thách (mở khi đạt 3★ một màn)

Áp `RunModifier` lên màn: ví dụ **Nhà Chính 1 máu**, **cấm Xạ Thủ**, **quái +50% tốc độ**, **không lãi suất**. Hoàn thành thưởng Mảnh gấp đôi + huy hiệu.

---

## 10. UI / UX — đặc tả từng màn hình

### 10.1 Main Menu
Nút: **Chơi** (→ Campaign Map), **Cây Kỹ Năng**, **Cài Đặt**, **Thoát**. Hiển thị tổng Mảnh Tinh Thể.

### 10.2 Campaign Map
- Bản đồ các node màn theo chapter, đường nối tuyến tính + nhánh phụ.
- Mỗi node hiện sao đã đạt (0–3⭐), khóa nếu chưa mở.
- Tap node → popup: tên màn, số wave, boss, sao cao nhất, nút **Bắt đầu** / **Thử thách** (nếu mở).

### 10.3 Màn Trận — Pha Chuẩn Bị (Setup HUD)
Bố cục đề xuất (16:9, responsive):
- **Trên cùng:** Vàng | Cấp + thanh EXP | HP Nhà Chính | Wave hiện tại/tổng | bộ đếm thời gian chuẩn bị (tùy chọn) + nút **Bắt đầu Chiến Đấu**.
- **Trái:** bảng **Synergy** đang kích hoạt (trait, số lính/mốc, sáng/tối).
- **Giữa:** **bàn cờ isometric** + Nhà Chính + cổng quái (hiện trước hướng spawn wave tới).
- **Dưới:** **Shop** 5 ô lính (giá, tộc/hệ, chỉ số tóm tắt) + nút **Reroll (2)** + nút **Mua EXP (4)** + **Băng ghế dự bị** (bench) + **túi trang bị**.
- Tương tác: kéo-thả lính shop→bench/board, bench↔board; kéo item lên lính; tap lính xem chi tiết; nút bán (kéo vào vùng bán).

### 10.4 Màn Trận — Pha Chiến Đấu (Combat HUD)
- Khóa thao tác sắp xếp; chỉ còn xem + (nếu Nhà Chính Thức Tỉnh) nút **Nâng cấp Nhà (tốn vàng)**.
- Hiện thanh máu trên đầu mọi entity, biểu tượng status (đóng băng/khóa), telegraph chiêu boss.
- Tốc độ trận: nút **×1 / ×2** (chỉ ảnh hưởng render-speed, không phá determinism vì sim theo tick).

### 10.5 Bảng chi tiết Lính (tap vào lính)
Tên, sao, tộc/hệ, chỉ số đầy đủ, kỹ năng + mô tả năng lượng, 3 ô trang bị, nút **Bán (+vàng)**.

### 10.6 Kết Quả Trận
Thắng: số sao, % HP còn lại, Mảnh nhận được, nút **Tiếp tục**. Thua: wave đạt được, Mảnh an ủi, nút **Chơi lại** / **Về bản đồ**.

### 10.7 Cây Kỹ Năng / Settings
- Skill tree: sơ đồ node, chi phí, trạng thái (đã mua/đủ tiền/khóa), nút mua + xác nhận.
- Settings: âm lượng (nhạc/SFX), tốc độ mặc định, ngôn ngữ (Tiếng Việt/English), bật/tắt rung màn hình, chế độ mù màu (đổi màu synergy sang ký hiệu).

---

## 11. Điều khiển (Input)

| Hành động | Chuột/cảm ứng | Phím tắt (desktop) |
| --- | --- | --- |
| Chọn/kéo lính | nhấn giữ + kéo | – |
| Reroll | tap nút | D |
| Mua EXP | tap nút | F |
| Bắt đầu chiến đấu | tap nút | Space |
| Bán lính | kéo vào vùng bán | E (khi đang chọn) |
| Xem chi tiết | tap lính | – |
| Tốc độ ×2 | tap nút | Tab |
| Kéo/zoom camera | kéo nền / cuộn | phím mũi tên / +,− |

Hỗ trợ cả chuột (desktop) và cảm ứng (mobile/tablet); layout co giãn theo tỉ lệ màn hình.

---

## 12. Yêu cầu Art (asset spec)

### 12.1 Quy chuẩn pixel
- **Ô bản đồ:** footprint 64×32 px (iso 2:1).
- **Nhân vật/lính/quái:** khung ~48×64 px, neo đáy giữa.
- **Bảng màu:** pixel-art giới hạn ~32–48 màu, đồng nhất giữa các chapter (mỗi chapter có biến thể tông màu nền).

### 12.2 Hướng & animation
- **4 hướng iso** (NE, NW, SE, SW); vẽ 2 hướng + lật ngang để ra 4 (tiết kiệm).
- State mỗi entity: `idle` (4–6 frame), `walk` (6–8), `attack` (4–6), `cast` (4–6, lính có skill), `hurt` (2), `death` (6–8).
- Lính 3★ có **biến thể ngoại hình** (đổi màu/hiệu ứng hào quang) theo GDD.

### 12.3 VFX & tile
- VFX: đóng băng (lớp băng + vỡ), lửa/cầu lửa, tia laser, đạn cung, vụ nổ bom, hào quang Nhà Chính Thức Tỉnh, hiệu ứng gộp sao (star burst).
- Tile bộ: cỏ/đất (Ch1), cát/đá (Ch2), kim loại/hư không (Ch3); ô đặc biệt **dung nham** và **bụi rậm** (cho post-MVP địa hình).
- **Atlas:** đóng gói spritesheet + JSON tọa độ frame; nhóm theo entity để cull/swap nhanh.

### 12.4 UI art
Khung shop, ô lính (viền màu theo tier giá), icon trait, icon trang bị, thanh HP/năng lượng, sao, nút, bản đồ chiến dịch.

---

## 13. Yêu cầu Audio

- **Nhạc nền:** menu (1), mỗi chapter (3), nhạc boss (1 dồn dập), nhạc thắng/thua (2 stinger ngắn).
- **SFX:** mua/bán lính, reroll, gộp sao (đặc trưng, đã mãn), đặt lính, bắt đầu trận, đòn đánh (cận/xa), kỹ năng (lửa/băng/laser), đóng băng, quái chết, Nhà Chính trúng đòn, cảnh báo HP nhà thấp, boss xuất hiện, telegraph chiêu, lên cấp, nhận sao kết quả.
- Mix: nhạc nền âm lượng thấp hơn SFX; có thanh chỉnh riêng nhạc/SFX trong Settings.

---

## 14. Bản địa hóa & Trợ năng

- **Ngôn ngữ:** Tiếng Việt (mặc định) + English; mọi chuỗi tách ra file `i18n/{vi,en}.json`, không hardcode text.
- **Trợ năng:** chế độ mù màu (trait dùng kèm icon/ký hiệu chứ không chỉ màu), scale cỡ chữ, tắt rung màn hình, tooltip giải thích synergy/đồ.

---

## 15. Save & Cài đặt (lưu trữ)

- **SaveProfile** (meta, bền): Mảnh Tinh Thể, cây kỹ năng, lính mở khóa, sao từng màn, thử thách mở khóa.
- **RunState** (trận đang chơi, cho phép thoát giữa chừng tiếp tục): seed, level, wave, vàng, đội hình, HP nhà, streak.
- **Settings**: âm lượng, ngôn ngữ, tốc độ mặc định, trợ năng.
- Lưu qua `localStorage` (web) / file JSON (desktop). Có **nút reset tiến trình** trong Settings (xác nhận 2 bước).

---

## 16. Hiệu năng & mục tiêu kỹ thuật

| Chỉ tiêu | Mục tiêu |
| --- | --- |
| Khung hình | 60 fps ổn định ở mật độ cao nhất (boss wave) |
| Số entity đồng thời | ≥ 150 quái + 11 lính + đạn không tụt khung |
| Thời gian tải vào trận | < 2 giây |
| Bộ nhớ | < 300 MB (web) |
| Determinism | cùng seed + đội hình → kết quả pha chiến đấu y hệt 100% |

Nếu vượt ngưỡng entity ở chapter 3, bật lớp render WebGL2 (đã nêu trong technical spec) mà không đổi simulation.

---

## 17. Tiêu chí nghiệm thu (Definition of Done) theo hệ thống

Mỗi hệ thống coi là "xong" khi đạt **tất cả** mục dưới:

- **Kinh tế:** vàng/lãi/chuỗi/EXP/level/shop-odds đúng bảng mục 2; reroll & mua EXP trừ đúng; bán refund đúng công thức; có unit test cho từng công thức.
- **Shop & pool:** ra lính đúng tỉ lệ tier; pool cạn khi mua nhiều; reroll dùng RNG có seed.
- **Gộp sao:** 3 lính cùng id cùng sao → tự gộp 1★→2★→3★; gộp đồ đúng; 3★ đổi ngoại hình.
- **Synergy:** đếm distinct đúng; bật/tắt theo mốc; số liệu buff khớp mục 4; HUD hiển thị đúng.
- **Combat:** flow-field dẫn quái về nhà, vòng qua chặn; 4 chính sách targeting hành xử đúng mô tả; sát thương/giáp/chí mạng theo công thức; status đóng băng/khóa hoạt động; deterministic (test seed cố định cho cùng log trận).
- **Trang bị:** 3 đồ hoàn chỉnh + hiệu ứng đúng; tối đa 3/lính; gắn/bán đúng.
- **Boss/quái:** mọi cơ chế mục 6–7 hoạt động; có telegraph; onDeath (slime tách) đúng.
- **Campaign:** 3 chapter chơi được; chấm sao đúng ngưỡng; thắng/thua đúng điều kiện.
- **Meta:** Mảnh thưởng đúng công thức; cây kỹ năng mua được, hiệu ứng áp vào run; thử thách mở/áp modifier đúng; save bền qua phiên.
- **UI/UX:** mọi màn hình mục 10 đủ chức năng; input mục 11 hoạt động trên chuột & cảm ứng; co giãn màn hình.
- **Art/Audio:** đủ animation state mục 12; đủ SFX/nhạc mục 13; không thiếu asset placeholder ở v1.0.
- **i18n:** không còn chuỗi hardcode; chuyển vi/en đầy đủ.

---

## 18. Kế hoạch test & cân bằng

- **Công cụ tua nhanh (sim headless):** chạy N trận tự động (không render) với nhiều đội hình → in tỉ lệ thắng theo wave, vàng trung bình, độ mạnh từng lính → dùng để cân số liệu nhanh (vì data-driven).
- **Cân bằng vòng lặp:** điều chỉnh JSON, không sửa code; mục tiêu đường cong khó tăng dần, mỗi boss có nhịp căng rõ.
- **Hồi quy (regression):** test determinism (cùng seed ra cùng kết quả) chạy trong CI; test công thức kinh tế.
- **Playtest người thật:** mỗi cột mốc (MVP, v1.0), ghi nhận: trận có vui không, có "đội hình bá đạo" phá cân bằng không, UI có dễ hiểu không.
- **Tiêu chí cân bằng đạt:** không lính/synergy nào "auto-thắng mọi màn"; người mới qua được Ch1 ở mức 1–2★; tối ưu mới đạt 3★ ổn định.

---

## 19. Checklist sản xuất nội dung (để "hoàn thiện")

- [ ] 12 lính MVP (→ ~18 cho v1.0) với sprite + animation + skill.
- [ ] 6 mảnh + 3 đồ hoàn chỉnh (→ lưới ghép rộng hơn cho v1.0).
- [ ] 6 quái thường + 3 mini-boss + 3 boss với cơ chế + telegraph.
- [ ] 3 chapter, mỗi chapter định nghĩa đủ WaveDef, tile set, nhạc nền.
- [ ] Cây kỹ năng đầy đủ node + chi phí + hiệu ứng.
- [ ] Toàn bộ màn hình UI + icon + khung.
- [ ] Toàn bộ SFX + nhạc.
- [ ] Chuỗi i18n vi/en.
- [ ] Save/Settings + reset.
- [ ] Pass toàn bộ DoD mục 17 + test mục 18.

---

## 20. Ngoài phạm vi v1.0 (làm sau)

Các tính năng GDD mục 8 — **địa hình/khí hậu** (dung nham, bụi rậm), **Thẻ Bài Quyết Định** (roguelite), **Lai Tạo Mutant** — đã có chỗ móc nối trong technical spec (TerrainTile, DecisionCard, FusionRecipe) nhưng **không thuộc v1.0**. Triển khai sau khi vòng lặp lõi + 3 chapter đã ổn định và vui.

---

*Spec này cùng TECHNICAL_SPEC.md tạo thành bộ tài liệu đủ để lập kế hoạch sản xuất và bắt tay hoàn thiện sản phẩm. Bước tiếp theo gợi ý: chốt số liệu MVP (phần 2–7) rồi dựng skeleton code (M0–M2 trong technical spec). Nếu bạn muốn, tôi có thể xuất các bảng nội dung (lính/đồ/quái/wave) thành các file JSON cấu hình mẫu để cắm thẳng vào code, hoặc dựng bộ khung dự án khởi đầu.*
