# TSchedule

App lên kế hoạch hằng ngày chạy **local trên macOS**. Mỗi ngày có một chỗ ghi việc cần làm,
mỗi việc có thời gian ước tính và được **báo trước khi tới giờ**, có **bấm giờ**, có chỗ
**theo dõi mục tiêu dài hạn** (ngày thi, deadline lớn) — và quan trọng nhất: **mỗi sáng khi
mở máy và mỗi tối, app bắt bạn chốt lại việc đã làm / chưa làm.**

Không có tài khoản, không có server. Toàn bộ dữ liệu nằm trong một file SQLite trên máy bạn.

---

## Cài đặt và chạy

```bash
git clone https://github.com/Eliza516/TSchedule.git
cd TSchedule
npm install
npm run dev
```

Đóng gói thành app thật:

```bash
npm run build:mac           # cả Apple Silicon và Intel
npm run build:mac:arm64     # chỉ Apple Silicon, nhanh hơn
```

Kết quả nằm trong `dist/`, kiểu `TSchedule-0.2.0-arm64.dmg`.

> **Đừng chạy `electron-builder` trực tiếp.** Hai script trên chạy `npm run build`
> trước rồi mới đóng gói. Gọi thẳng `npx electron-builder --mac` sẽ đóng gói cây
> thư mục chưa biên dịch và tạo ra một app chết ngay khi mở với lỗi
> `Cannot find module .../out/main/index.js`. Có một lớp chặn ở `beforePack` bắt
> trường hợp này và báo lỗi rõ ràng thay vì để bạn tạo ra app hỏng.

> **Lưu ý về thông báo:** ở chế độ `npm run dev`, macOS hiển thị tên người gửi thông báo là
> "Electron" thay vì "TSchedule". Đó là giới hạn của bản chưa đóng gói, không phải lỗi — bản
> `.dmg` hiển thị đúng tên.
>
> Bản build không ký số, nên lần đầu mở macOS sẽ hỏi xác nhận (chuột phải → Open).

Sau khi cài, vào **Settings → Open at login** và bật lên. Nếu app không chạy nền thì nó
không thể chặn bạn lúc mở máy buổi sáng.

---

## Nghi thức check-in — phần cốt lõi

Đây là thứ phân biệt TSchedule với một app to-do thường.

### Buổi sáng
Lần đầu tiên bạn chạm vào máy trong ngày (mở nắp, mở khoá màn hình, hoặc app khởi động cùng
hệ thống) — sau mốc giờ bạn đặt, mặc định 06:00 — cửa sổ check-in sáng bật lên:

1. **Việc còn dở từ trước** — mỗi việc **bắt buộc** chọn một: *Move to today · Move to
   tomorrow · Pick a date · Actually done · Drop it*, kèm lý do một chạm (*hết giờ · bị chặn ·
   ước tính sai · không quan trọng*). Không phân loại hết thì không đóng được.
2. **Kế hoạch hôm nay** — chọn tối đa **3 việc Focus**, điền ước tính. Nếu tổng thời gian
   vượt số giờ làm việc của bạn, app nói thẳng là sẽ có việc bị trượt.
3. **Bối cảnh** — đếm ngược tới các mục tiêu, và ưu tiên bạn đã tự đặt ra tối hôm trước.

### Buổi tối
Mặc định **23:30** cửa sổ tổng kết tự bật. Bạn khai từng việc: *xong* hay *chưa xong + lý do*;
việc nào không bấm giờ thì ước lượng nhanh (15m / 30m / 1h / 2h); rồi ghi lại *hôm nay được gì ·
vướng gì · mai ưu tiên gì*. **Ưu tiên cho ngày mai được tạo thành một task Focus thật** trên
danh sách hôm sau, không phải một dòng ghi chú rồi quên.

### Vì sao có tới 4 lớp kích hoạt
macOS **không cho phép** app chặn lại lúc bạn gập máy — hệ điều hành chỉ bắn sự kiện rồi ngủ
trong vài trăm mili-giây, không đủ để hiện form. Nên "bắt lúc chuẩn bị đóng máy" được hiện
thực bằng:

| Lớp | Khi nào |
|---|---|
| Theo giờ hẹn | 23:30 (đổi được trong Settings) |
| Khi thoát app | Sau 18:00 mà chưa check-in, bấm Quit sẽ mở check-in thay vì thoát |
| **Ghi nợ** | Ngày nào bạn có làm việc mà không chốt lại thì bị ghi nợ. **Lần sau mở máy, món nợ đó hiện ra trước cả check-in sáng** |
| Tự bấm | Nút *Wrap up my day*, mục trong menu bar, hoặc phím tắt `⌘⌥W` |

Lớp **ghi nợ** được suy ra từ hoạt động thật (có task, có ghi chú trong ngày), **không** phải
từ một dấu hiệu ghi lúc máy ngủ — nên force-quit, treo máy hay hết pin vẫn không thoát được.

### Độ chặt
Mặc định **chặt vừa**: cửa sổ không có nút X, Esc không đóng, click ra ngoài thì nó giành lại
focus, và chỉ được **Snooze 10 phút, tối đa 2 lần**. Đổi sang *Gentle* hoặc *Strict* trong
Settings.

*Nói thẳng:* đây là ràng buộc ở mức ứng dụng, không phải mức hệ điều hành — force-quit qua
Activity Monitor vẫn thoát được. Không app userspace nào trên macOS làm hơn được. Nhưng lớp
ghi nợ sẽ bắt bù vào sáng hôm sau.

---

## Gõ một dòng là xong

```
Write report tomorrow 2pm ~45m #work @exam !mit
```

| Cú pháp | Nghĩa |
|---|---|
| `2pm`, `tomorrow`, `next Monday` | ngày và giờ (hiểu tiếng Anh tự nhiên) |
| `~45m`, `~1h30`, `~1.5h` | thời gian ước tính |
| `#tag` | nhãn |
| `@goal` | gắn vào mục tiêu (khớp theo tiền tố tên) |
| `!mit` | ghim làm một trong 3 việc Focus |
| `!!` | nhắc sớm 30 phút thay vì 10 phút |

Phần còn lại là tên việc. Ô nhập hiện trước kết quả phân tích nên bạn thấy nó hiểu đúng chưa
rồi mới Enter.

---

## Các tính năng khác

- **Thông báo trước giờ** — mặc định 10 phút trước, chỉnh chung hoặc riêng từng việc. Click vào
  thông báo là mở đúng việc đó. Máy ngủ dậy không bị dội một tràng thông báo cũ.
- **Bấm giờ** — Pomodoro (25/5, nghỉ dài 15 sau 4 phiên) hoặc đếm lên tự do. Đồng hồ chạy trong
  main process nên **đóng cửa sổ vẫn chạy**, và menu bar hiện đếm ngược.
- **Ước tính vs thực tế** — app tự tính hệ số của riêng bạn ("You typically take 1.4× your
  estimate") và gợi ý con số sát hơn khi bạn nhập ước tính mới.
- **Mục tiêu dài hạn** — đếm ngược "47 days left", chia thành milestone, gắn việc hằng ngày vào
  mục tiêu. Mục tiêu nhiều ngày không động tới sẽ bị cảnh báo.
- **Tài liệu học** — dán link khoá học (Coursera…) hoặc chọn file sách PDF/EPUB vào một mục
  tiêu, cho biết tổng số bài/trang/chương và ngày phải xong. Mỗi ngày học app tự sinh một task
  với đúng phần của ngày đó (`Clean Code — trang 45–68 · Ch.3 Functions`), nhắc đúng giờ, và
  bấm `↗` là mở thẳng khoá học hay file sách. Định mức được **tính lại mỗi ngày** từ phần còn
  lại, nên lỡ một hôm thì những hôm sau tự gánh chứ không để lại task cũ; đặt trần mỗi ngày thì
  app báo luôn deadline có khả thi không. Chọn file PDF, app đọc mục lục để điền sẵn số trang và
  danh sách chương (sửa được, và nhập tay được nếu file không có mục lục).
- **Habits** — việc lặp lại tự sinh thành task, có streak tôn trọng lịch (habit T2-4-6 không đứt
  streak vào Chủ nhật) và heatmap 12 tuần.
- **Quick capture** — `⌘⇧Space` từ bất kỳ app nào. Có ngày/giờ thì thành task luôn, không thì
  vào Inbox.
- **Stats** — giờ làm theo ngày/nhãn/mục tiêu, tỉ lệ hoàn thành, streak check-in, và **phân bố
  lý do việc dở** để biết bạn hay hỏng vì "hết giờ" hay vì "ước tính sai".
- **Week** — 7 cột danh sách, kéo thả việc sang ngày khác. Cố ý không làm lưới giờ.

Một điều **cố ý không làm**: việc chưa xong **không** tự động nhảy sang ngày mới. Nó nằm
nguyên ở ngày cũ cho tới khi bạn phân loại trong check-in — nếu không thì buổi sáng chẳng còn
gì để bắt bạn chốt.

---

## Dữ liệu

Nằm ở `~/Library/Application Support/TSchedule/tschedule.db` (SQLite).

Trong **Settings → Your data**: xuất backup JSON, xuất nhật ký Markdown (mỗi ngày một mục, kèm
việc và phần reflection), và khôi phục từ backup.

---

## Phím tắt

| Phím | Việc |
|---|---|
| `⌘⇧Space` | Quick capture |
| `⌘⌥W` | Mở check-in tối |

Đổi trong Settings. Nếu phím đã bị app khác chiếm, macOS từ chối trong im lặng và phím đơn giản
là không có tác dụng — chọn tổ hợp khác.

---

## Phát triển

```bash
npm run typecheck   # TypeScript cho main, preload, renderer
npm test            # vitest: policy check-in, parser, recurrence, repository
npm run build       # build 3 bundle
npm run check       # cả ba
npm run smoke       # mở từng màn hình với dữ liệu giả, bắt lỗi console (cần npm run build trước)
```

`npm run smoke` chụp ảnh từng màn hình vào `scripts/smoke/shots/`, chạy được cả trên máy không
có màn hình (`xvfb-run`) vì nó dùng preload giả, không đụng tới SQLite.

### Bố cục

```
src/shared/      logic thuần dùng chung, có test — checkinPolicy, quickAdd, recurrence, stats, studyPlan
src/main/        tiến trình chính: DB + repository, scheduler, timer, check-in, tray, IPC
src/preload/     cầu contextBridge duy nhất, kênh được allow-list
src/renderer/    React: cửa sổ chính, cửa sổ check-in, ô quick capture
```

Nguyên tắc: **mọi logic liên quan tới thời gian nằm ở main process** (scheduler, timer,
check-in). Đặt ở renderer thì đóng cửa sổ là mất. Scheduler dùng một nhịp 15 giây quét database
chứ không dùng `setTimeout` dài — `setTimeout` trôi sai sau khi máy ngủ, mà nắp MacBook thì
đóng thường xuyên hơn là tắt máy.

### Nếu `npm install` báo lỗi build `better-sqlite3`

Đó là native module, cần Xcode Command Line Tools:

```bash
xcode-select --install
npm rebuild better-sqlite3
```
