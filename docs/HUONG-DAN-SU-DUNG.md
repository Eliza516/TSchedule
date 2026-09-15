# TSchedule — Hướng dẫn sử dụng

Tài liệu này mô tả **app làm gì và vì sao nó làm vậy**. Phần cài đặt nằm ở
[README](../README.md).

Giao diện app bằng tiếng Anh, nên trong tài liệu này tên nút và nhãn được giữ nguyên
tiếng Anh, giải thích bằng tiếng Việt.

---

## Mục lục

1. [Ý tưởng nền](#1-ý-tưởng-nền)
2. [Bản đồ giao diện](#2-bản-đồ-giao-diện)
3. [Màn hình Today](#3-màn-hình-today)
4. [Gõ một dòng để tạo việc](#4-gõ-một-dòng-để-tạo-việc)
5. [Bấm giờ](#5-bấm-giờ)
6. [Nghi thức check-in](#6-nghi-thức-check-in)
7. [Mục tiêu dài hạn](#7-mục-tiêu-dài-hạn)
8. [Habits](#8-habits)
9. [Quick capture và Inbox](#9-quick-capture-và-inbox)
10. [Week](#10-week)
11. [Stats](#11-stats)
12. [Settings](#12-settings)
13. [Thông báo](#13-thông-báo)
14. [Dữ liệu và backup](#14-dữ-liệu-và-backup)
15. [Một ngày dùng TSchedule](#15-một-ngày-dùng-tschedule)
16. [Những điều app cố ý không làm](#16-những-điều-app-cố-ý-không-làm)
17. [Xử lý sự cố](#17-xử-lý-sự-cố)

---

## 1. Ý tưởng nền

Phần lớn app to-do thất bại ở cùng một chỗ: bạn ghi việc vào, không làm, việc tự trôi sang
ngày mai, và ba tuần sau bạn có một danh sách 60 việc mà không biết vì sao.

TSchedule chặn đúng chỗ đó bằng ba quyết định:

**Không có việc nào tự trôi.** Việc chưa xong nằm nguyên ở ngày bạn đã lên kế hoạch. Muốn nó
sang ngày khác thì bạn phải tự tay quyết định — và phải nói lý do.

**Mỗi ngày bị đóng sổ hai lần.** Sáng khi mở máy: chốt việc còn dở, chọn việc hôm nay. Tối:
khai từng việc xong hay không, vì sao. Không bỏ qua được.

**Ước tính được đối chiếu với thực tế.** Bạn đoán 45 phút, app đo 68 phút. Sau vài tuần nó
nói thẳng: "You typically take 1.4× your estimate".

Toàn bộ dữ liệu nằm trên máy bạn. Không tài khoản, không server, không đồng bộ.

---

## 2. Bản đồ giao diện

**Cửa sổ chính** — thanh bên trái có 7 mục:

| Tab | Dùng để |
|---|---|
| **Today** | Màn hình chính. Việc của một ngày |
| **Week** | 7 ngày cạnh nhau, kéo thả việc giữa các ngày |
| **Goals** | Mục tiêu dài hạn, đếm ngược, cột mốc |
| **Habits** | Việc lặp lại, chuỗi ngày |
| **Stats** | Thống kê, hệ số ước tính |
| **Inbox** | Ý tưởng ghi vội, chưa xếp lịch |
| **Settings** | Cấu hình, backup |

Số tròn cạnh **Inbox** là số item chưa xử lý. Số màu cam cạnh **Goals** là số mục tiêu đang
bị bỏ quên.

Dưới cùng thanh bên, khi có check-in đang chờ, sẽ hiện một ô bấm được để mở nó ra.

**Menu bar** (icon đồng hồ nhỏ trên thanh trạng thái macOS) — hoạt động cả khi cửa sổ chính đã
đóng:

- Khi đồng hồ đang chạy: hiện đếm ngược, ví dụ `18:42`; đang nghỉ thì có thêm `☕`
- Khi có check-in đang chờ: hiện dấu `•`
- Bấm vào để xem 3 việc kế tiếp hôm nay, điều khiển đồng hồ, **Quick capture**,
  **Wrap up my day**, mở cửa sổ chính, hoặc thoát app

**Hai cửa sổ phụ** — cửa sổ **check-in** (mục 6) và ô **quick capture** (mục 9).

---

## 3. Màn hình Today

### Dải ngày

Bảy ô ngày ở trên cùng, ngày đang xem nằm giữa. Bấm để chuyển ngày. Vạch mảnh dưới mỗi ô là
**tải của ngày đó** — tổng thời gian ước tính, tính cả việc chưa có ước tính (tạm tính 20 phút).
Nhìn dải này là thấy tuần bạn nặng ở đâu.

Đang xem ngày khác thì có nút **Back to today** ở góc trên phải.

### Ba nhóm việc

| Nhóm | Là gì |
|---|---|
| **Focus** | Tối đa 3 việc quan trọng nhất hôm nay. Bấm ☆ trên một việc để ghim |
| **Scheduled** | Việc có giờ bắt đầu, xếp theo giờ |
| **Anytime** | Việc không cố định giờ |

Bên dưới còn **Done** và **Dropped** nếu có.

Giới hạn 3 việc Focus là cố ý. Thử ghim việc thứ tư thì app báo lỗi chứ không lặng lẽ nhận.

### Một dòng việc

Mỗi việc gồm:

- **Ô vuông** — bấm để đánh dấu xong. Bấm lại để mở lại
- **Tên việc** — bấm vào là sửa được tại chỗ. Enter để lưu, Esc để huỷ
- **Các chip** dưới tên: giờ bắt đầu · `45m est` (ước tính) · `1h 8m actual` (thực tế, chuyển
  màu cam khi lệch quá 20% so với ước tính) · chấm màu + tên mục tiêu · `#nhãn` · `habit` ·
  và cảnh báo nếu việc bị dời nhiều lần
- **Nút bên phải** (hiện khi rê chuột): ☆ ghim Focus · ▶ bắt đầu bấm giờ · ⋯ mở bảng sửa
  chi tiết

**Bảng sửa chi tiết** (nút ⋯) cho đổi ngày, giờ bắt đầu, ước tính, mục tiêu, nhãn, ghi chú,
và xoá việc.

### Cảnh báo việc ì

Việc bị dời từ 3 lần trở lên (chỉnh được trong Settings) sẽ hiện chip đỏ:
`rolled over 4× — reschedule, shrink or drop it`.

Đây không phải trang trí. Một việc dời 4 lần gần như chắc chắn là: quá to nên không bắt đầu
nổi, hoặc thật ra bạn không định làm. Cả hai trường hợp đều cần xử lý chứ không phải dời tiếp.

### Cột phải

- **Timer** — đồng hồ đang chạy (mục 5)
- **Today** — xong bao nhiêu / bao nhiêu, tổng thời gian dự kiến, thời gian đã ghi nhận, số
  pomodoro. Nếu kế hoạch vượt số giờ làm việc của bạn thì có cảnh báo cam
- **Wrap-up streak** — số ngày liên tiếp bạn đã đóng sổ, kèm ưu tiên bạn đặt ra tối hôm trước
- **Counting down** — các mục tiêu có ngày đích, kèm số ngày còn lại

---

## 4. Gõ một dòng để tạo việc

Ô nhập ở cuối màn hình Today. Không cần mở form.

```
Ôn chương 3 tomorrow 2pm ~90m #study @exam !mit
```

| Cú pháp | Nghĩa | Ví dụ |
|---|---|---|
| Ngày/giờ tiếng Anh | Ngày và giờ bắt đầu | `2pm`, `tomorrow`, `next Monday 9am`, `Friday` |
| `~<thời lượng>` | Ước tính | `~45m`, `~90`, `~1h`, `~1h30`, `~1.5h` |
| `#nhãn` | Gắn nhãn (tự viết thường) | `#work`, `#study` |
| `@tênmụctiêu` | Gắn mục tiêu, khớp theo tiền tố | `@exam` khớp "Final exam" |
| `!mit` | Ghim làm việc Focus | |
| `!!` | Nhắc trước 30 phút thay vì 10 | |

Phần còn lại sau khi bóc hết token là **tên việc**.

**Xem trước trước khi Enter.** Vừa gõ, bên dưới ô nhập hiện các chip cho biết app hiểu ra
gì — tên việc, ngày, giờ, ước tính, nhãn, mục tiêu. `@tên` không khớp mục tiêu nào thì chip
chuyển cam để bạn biết. Nhìn chip rồi mới Enter thì không bao giờ tạo nhầm.

### Quy tắc ngày

- Có ngày trong câu (`tomorrow`, `Friday`) → dùng ngày đó
- **Không** có ngày → việc rơi vào **ngày bạn đang xem**, không phải hôm nay. Đang xem thứ Sáu
  mà gõ "Nộp báo cáo" thì nó vào thứ Sáu
- Có ngày nhưng không có giờ → việc thuộc ngày đó, nhóm **Anytime**

### Con số bị bỏ qua đúng lúc

`Đọc 20 trang ~30m` → tên việc giữ nguyên "Đọc 20 trang". App không nhầm số 20 thành ngày,
vì một con số trần trong câu hầu như luôn là một phần của tên việc.

### Gợi ý ước tính

Khi đã có đủ dữ liệu (ít nhất 3 việc hoàn thành có cả ước tính lẫn thời gian đo được), gõ
`~45m` sẽ thấy dòng gợi ý: *"Going by your last few weeks this is closer to 1h 5m"*.

Đó là **gợi ý, không tự sửa**. Con số bạn gõ vẫn được giữ — nếu app tự sửa thì nó không còn
học được gì từ sai số của bạn nữa.

---

## 5. Bấm giờ

Đồng hồ chạy trong tiến trình chính của app, **không** trong cửa sổ. Đóng cửa sổ, đồng hồ vẫn
chạy và menu bar vẫn đếm ngược.

### Hai chế độ

**Pomodoro** — mặc định 25 phút, nghỉ 5 phút, nghỉ dài 15 phút sau mỗi 4 phiên. Tất cả chỉnh
được trong Settings.

**Stopwatch** — đếm lên, không giới hạn. Dùng khi bạn không biết việc dài bao lâu.

### Bắt đầu

- Nút **▶** trên một việc → chạy Pomodoro gắn với việc đó
- Nút **Pomodoro** / **Stopwatch** trong ô Timer ở cột phải → chạy không gắn việc nào
- Nút **Start timer** trên thông báo khi tới giờ một việc

Bắt đầu bấm giờ trên một việc đang `todo` thì việc tự chuyển sang trạng thái *đang làm*.

### Khi hết phiên

Hết một pomodoro: có thông báo **kèm tiếng**, và phiên nghỉ **tự bắt đầu**. Muốn bỏ qua thì bấm
**Skip break**.

Dừng giữa chừng bằng **Stop** vẫn ghi lại thời gian đã chạy — chỉ là phiên đó không được tính
là pomodoro hoàn chỉnh trong thống kê.

### Thời gian được ghi vào đâu

Mọi phiên đều được lưu và cộng vào ô `actual` của việc. Thời gian nghỉ **không** tính vào thời
gian làm việc.

Nếu app bị tắt đột ngột giữa một phiên, lần mở sau nó tự đóng phiên đó lại để thống kê không
bị phồng lên.

---

## 6. Nghi thức check-in

Đây là phần cốt lõi, và là phần khó chịu nhất theo đúng thiết kế.

### 6.1 Check-in sáng

**Bật lên khi nào:** lần đầu tiên bạn chạm vào máy trong ngày — mở nắp, mở khoá màn hình, hoặc
app khởi động cùng hệ thống — miễn là đã qua **Morning window opens** (mặc định 06:00) và chưa
qua **Evening window opens** (mặc định 18:00).

Sau 18:00 thì check-in sáng bị bỏ qua hẳn. Hỏi "hôm nay định làm gì" lúc 19:00 là vô nghĩa.

**Ba phần:**

**a. Unfinished from before** — việc còn dở từ các ngày trước, không giới hạn lùi bao xa (hiện
tối đa 60 việc một lần). Mỗi việc **bắt buộc** chọn một hành động:

| Nút | Việc gì xảy ra |
|---|---|
| **Move to today** | Chuyển sang hôm nay, đếm dời +1 |
| **Move to tomorrow** | Chuyển sang mai, đếm dời +1 |
| **Pick a date** | Chọn ngày cụ thể, đếm dời +1 |
| **Actually done** | Thật ra đã làm rồi, đánh dấu xong |
| **Drop it** | Bỏ hẳn |

Chọn bất cứ gì **ngoài** "Actually done" thì phải chọn thêm **lý do**: *Ran out of time ·
Blocked · Underestimated it · Not important · Other*.

Lý do này không phải hình thức — nó được gom lại trong **Stats** để bạn biết mình hay hỏng ở
đâu. Bị "hết giờ" hoài là do lên kế hoạch quá tải; "ước tính sai" hoài là do bạn đoán dở;
"không quan trọng" hoài là do bạn ghi vào những việc lẽ ra không nên ghi.

Việc nào chưa xử lý xong thì nút xanh ở dưới còn mờ, không bấm được.

**b. Today** — danh sách việc hôm nay (habit đến hạn đã tự sinh sẵn). Ở đây bạn:

- Bấm ☆ chọn tối đa **3 việc Focus**
- Thêm việc mới bằng ô gõ một dòng ngay trong cửa sổ check-in
- Thấy cảnh báo nếu tổng thời gian vượt số giờ làm việc của bạn, hoặc nếu có việc chưa có
  ước tính

**c. Counting down** — mục tiêu và số ngày còn lại; mục tiêu nào lâu không động tới sẽ được
nêu tên.

Nếu tối qua bạn có ghi ưu tiên cho hôm nay, nó hiện ở ngay đầu cửa sổ.

### 6.2 Check-in tối

**Bật lên khi nào** — bốn lớp:

| Lớp | Khi nào |
|---|---|
| **Theo giờ hẹn** | Mặc định 23:30 |
| **Khi thoát app** | Đã qua 18:00 mà chưa check-in, bấm ⌘Q sẽ mở check-in thay vì thoát. Điền xong app thoát thật |
| **Ghi nợ** | Xem 6.3 |
| **Tự bấm** | Nút **Wrap up my day** trên Today, mục trong menu bar, hoặc `⌘⌥W` |

**Bốn phần:**

**a. What happened today** — mọi việc còn mở của ngày đó. Mỗi việc chọn: **Actually done** /
**Move to tomorrow** / **Pick a date** / **Drop it**, kèm lý do như trên.

Chọn "Actually done" cho việc **chưa từng bấm giờ** thì có thêm một hàng hỏi nhanh: *15m · 30m
· 1h · 2h · Skip*. Con số này chỉ được ghi khi việc đó **chưa có thời gian đo được** — một ước
lượng thô không bao giờ ghi đè lên thời gian đã đo thật.

Việc đã xong trong ngày liệt kê bên dưới, có `est` và `actual` để bạn tự thấy khoảng cách.

**b. The numbers** — xong bao nhiêu, thời gian ghi nhận, thời gian ước tính, số pomodoro, và
hệ số ước tính của riêng ngày hôm đó.

**c. Looking back** — ba ô, đều không bắt buộc:
- *What went well*
- *What got in the way*
- **Tomorrow's top priority**

**d.** Mood và Energy, thang 1–5.

> **Ô "Tomorrow's top priority" không phải ghi chú.** Bạn viết vào đó thì app **tạo một việc
> thật, đã ghim Focus, trên danh sách ngày mai**. Sáng hôm sau nó hiện lại ở đầu check-in sáng.
> Đây là cầu nối giữa hai đầu ngày — thứ biến "mai tôi phải làm X" thành một việc có thật.

### 6.3 Lớp ghi nợ — vì sao nó tồn tại

macOS **không cho phép** app chặn lại lúc bạn gập máy. Hệ điều hành chỉ bắn một sự kiện rồi ngủ
trong vài trăm mili-giây — không đủ để hiện form và chờ bạn điền. Đây là giới hạn của hệ điều
hành, không app nào lách được.

Nên "bắt lúc chuẩn bị đóng máy" được làm theo cách khác: **ngày nào bạn có hoạt động mà không
đóng sổ thì bị ghi nợ**. Lần kế tiếp bạn dùng máy, món nợ đó hiện ra **trước cả check-in sáng**,
và phải xong mới đi tiếp.

Điểm mấu chốt: món nợ được **suy ra từ hoạt động thật** — ngày đó có việc, hoặc có ghi chú —
chứ không phải từ một dấu hiệu ghi lúc máy sắp ngủ. Nghĩa là **force-quit, treo máy, hết pin,
hay rút điện đều không thoát được**. Nợ vẫn còn đó.

App nhìn lại tối đa 7 ngày. Nhiều ngày nợ thì xử lý lần lượt từ cũ nhất.

> Lưu ý nhỏ: khi đang đóng sổ cho *hôm qua*, nút **Move to tomorrow** nghĩa là ngày kế tiếp của
> ngày đang đóng sổ — tức là **hôm nay**. Đúng logic, nhưng đọc thoáng dễ nhầm.

### 6.4 Cửa sổ check-in cứng tới mức nào

Mặc định (**Firm**): không có nút X, Esc không đóng, click ra ngoài thì cửa sổ giành lại focus.
Chỉ có hai lối ra:

- **Snooze 10 min** — tối đa **2 lần** cho mỗi check-in. Hết lượt thì nút biến mất
- **Nút xanh** — chỉ bấm được khi mọi việc đã được xử lý

Ba mức trong Settings:

| Mức | Khác nhau |
|---|---|
| **Gentle** | Không giành lại focus, để bạn yên |
| **Firm** (mặc định) | Như mô tả trên |
| **Strict** | Không có nút Snooze |

**Nói thẳng:** đây là ràng buộc ở mức ứng dụng, không phải mức hệ điều hành. Force-quit qua
Activity Monitor vẫn thoát được — kể cả ở mức Strict. Không app userspace nào trên macOS làm
hơn được thế. Nhưng lớp ghi nợ sẽ bắt bù, nên trốn được một tối chứ không trốn được luôn.

Trong lúc một lần snooze còn hiệu lực, bấm ⌘Q thì app thoát bình thường — bạn vừa chủ động
hoãn, app tôn trọng điều đó. Nhưng hết 10 phút đó thì check-in quay lại, và lúc này **⌘Q lại
bị chặn**, mà nút Snooze thì đã hết lượt. Đường ra duy nhất còn lại là điền cho xong — hoặc
force-quit, và sáng mai bị đòi nợ.

---

## 7. Mục tiêu dài hạn

Dành cho những thứ không xong trong một ngày: kỳ thi, luận văn, deadline lớn.

### Tạo mục tiêu

**Goals → New goal**. Ba thứ: tên, **Target date** (ngày thi — thứ sinh ra đếm ngược), màu.

Sau khi tạo, mở ra để thêm:

- **Milestones** — cột mốc, mỗi cái có hạn riêng. Tick để đánh dấu xong
- **Notes** — vùng ghi chú tự do. Nội dung thi, chỗ đang học dở, gì cũng được. Tự lưu khi bạn
  click ra ngoài
- **Linked work** — các việc hằng ngày đã gắn vào mục tiêu

### Đếm ngược

Thẻ mục tiêu hiện `47 days left`. Đổi màu khi tới gần: **cam** khi còn ≤ 14 ngày, **đỏ** khi
còn ≤ 7 ngày. Quá hạn thì hiện `3d ago` màu xám.

### Tiến độ tính thế nào

Trung bình của hai tỉ lệ:
- % cột mốc đã xong
- % việc đã gắn đã xong

Chỉ có một trong hai thì tính theo cái đó. Không có gì thì 0%.

### Gắn việc hằng ngày vào mục tiêu

Ba cách: gõ `@tênmụctiêu` khi tạo việc · chọn trong bảng sửa (nút ⋯) · gắn habit vào mục tiêu
để mọi task nó sinh ra đều tự gắn theo.

Đây là thứ làm mục tiêu dài hạn khác một ghi chú: nó nối được với việc bạn làm mỗi ngày.

### Cảnh báo bỏ quên

Không có việc nào gắn mục tiêu được hoàn thành trong **7 ngày** (chỉnh được), mục tiêu bị đánh
dấu bỏ quên:

- Chip cam trên thẻ
- Số cam cạnh **Goals** ở thanh bên
- Nêu tên trong check-in sáng
- Thông báo mỗi ngày một lần, sau 12:00

Mục tiêu chưa từng có việc nào hoàn thành cũng bị tính là bỏ quên sau 7 ngày kể từ lúc tạo.

Xoá mục tiêu **không** xoá việc — các việc chỉ đơn giản là thôi được gắn.

---

## 8. Habits

Việc lặp lại. Tới ngày đến hạn, app **tự tạo thành một task thật** trên danh sách của bạn.

### Ba kiểu lịch

| Kiểu | Hành xử |
|---|---|
| **Every day** | Mỗi ngày |
| **Chosen days** | Đúng các thứ bạn chọn |
| **N times per week** | Xem dưới |

**N times per week** không sinh task mỗi ngày. Nó chỉ nhắc khi **số ngày còn lại trong tuần vừa
đủ cho số buổi còn nợ**. Ví dụ 3 lần/tuần, tới thứ Bảy mới làm 2 lần → thứ Bảy chưa nhắc (vẫn
còn Chủ nhật), Chủ nhật mới nhắc. Bạn vẫn tự do chọn ngày, app chỉ can thiệp khi sắp trượt.

### Chuỗi ngày

Streak **tôn trọng lịch của chính habit đó**. Habit thứ 2-4-6 không bị đứt chuỗi vào Chủ nhật —
chỉ đứt khi bạn bỏ một ngày lẽ ra phải làm.

Hôm nay chưa làm thì **không** tính là đứt chuỗi. Ngày còn chưa hết.

Lưới ô vuông là 12 tuần gần nhất: ô đậm = đã làm, ô nhạt = tới hạn mà không làm, ô mờ = không
phải ngày của habit này. Ô hôm nay có viền.

### Vài chi tiết

- Habit được ghi nhận **qua task của nó**: tick task là habit tính là đã làm hôm đó, bỏ tick
  thì rút lại. Màn hình Habits chỉ để xem và quản lý lịch, không tick trực tiếp ở đó
- Đặt **Usual time** thì task sinh ra có giờ bắt đầu, và **có thông báo** như mọi việc khác
- Gắn habit vào goal thì mọi task nó sinh ra đều tự gắn goal
- **Pause** để tạm ngưng mà không mất lịch sử chuỗi ngày

---

## 9. Quick capture và Inbox

### Ô ghi nhanh

`⌘⇧Space` từ **bất kỳ app nào**. Một ô nhập hiện giữa màn hình. Gõ, Enter. Esc để đóng.

Cửa sổ này luôn được giữ sẵn ở chế độ ẩn nên bật lên là tức thì. Không làm bạn mất mạch việc
đang làm.

### Luật: thành task hay vào Inbox?

Nội dung bạn gõ **thành task ngay** nếu có **ít nhất một** trong: giờ bắt đầu · ngày khác hôm
nay · ước tính `~` · nhãn `#` · cờ `!mit`.

Không có gì trong số đó → vào **Inbox**.

```
Gọi nha sĩ                     → Inbox (không có gì cụ thể)
Gọi nha sĩ 3pm                 → Task hôm nay 15:00
Gọi nha sĩ tomorrow            → Task ngày mai
Gọi nha sĩ ~15m                → Task hôm nay, ước tính 15 phút
Gọi nha sĩ #health             → Task hôm nay, nhãn health
```

Ý ở đây: một ý nghĩ chưa có ngày giờ thì **chưa phải kế hoạch**. Nhét nó vào hôm nay chỉ làm
bẩn danh sách. Nó chờ ở Inbox tới khi bạn quyết định.

### Inbox

Mỗi item có hai nút **Today** / **Tomorrow** để biến thành task (lúc này cú pháp `~`, `#`, `@`
trong nội dung cũng được đọc), và nút × để bỏ.

---

## 10. Week

Bảy cột, mỗi cột một ngày. **Kéo thả** một việc sang cột khác để đổi ngày.

Mỗi cột hiện tổng thời gian ước tính của việc **chưa xong**, chuyển cam khi vượt số giờ làm
việc của bạn. Đây là chỗ để thấy thứ Tư đang gánh 11 tiếng còn thứ Năm trống trơn.

Cố ý **không** làm lưới giờ như Google Calendar. Bạn cần thấy tải của từng ngày, không cần vẽ
lại lịch.

> Kéo thả ở đây **không** tính vào số lần dời việc — đó là bạn chủ động sắp lịch, khác với việc
> trượt qua ngày trong check-in.

---

## 11. Stats

Ba khoảng thời gian: **This week** · **Last 4 weeks** · **Last 12 weeks**.

### Sáu ô số

| Ô | Nghĩa |
|---|---|
| **Time logged** | Tổng thời gian đã bấm giờ (không tính nghỉ) |
| **Tasks finished** | Xong / tổng số việc đã lên kế hoạch (không tính việc đã bỏ) |
| **Completion rate** | Tỉ lệ hoàn thành |
| **Pomodoros** | Số phiên pomodoro chạy **hết** |
| **Wrap-up streak** | Số ngày liên tiếp đã đóng sổ |
| **Days closed out** | Tỉ lệ ngày có hoạt động mà bạn đã đóng sổ |

### Estimates vs reality

Con số đáng giá nhất trong app.

Lấy các việc **đã xong** có **cả** ước tính lẫn thời gian đo được, chia tổng thực tế cho tổng
ước tính. Cần ít nhất 3 việc mới hiện.

Hệ số 1.4 nghĩa là bạn thường mất gấp 1.4 lần thời gian bạn nghĩ. Biết con số này thì bạn hết
lên kế hoạch cho một ngày 12 tiếng công việc rồi tự trách mình.

Việc không bấm giờ hoặc không có ước tính đều bị **bỏ qua**, không bị tính là đoán chuẩn.

### Time per day

Cột theo ngày. Thời gian được tính vào **ngày của việc**, không phải thời điểm bấm giờ — nên
một phiên làm quá nửa đêm vẫn thuộc về ngày bạn định làm nó.

### By goal / By tag

Thời gian thực đổ vào đâu. Đây là chỗ đối chiếu điều bạn *nói* là quan trọng với điều bạn
*thật sự* dành thời gian.

### Why things did not get done

Gom các lý do bạn đã chọn trong check-in.

Đọc nó thế này:
- **Ran out of time** nhiều → bạn lên kế hoạch quá tải. Bớt việc đi
- **Underestimated it** nhiều → ước tính dở. Xem hệ số ở trên và nhân lên
- **Blocked** nhiều → vấn đề nằm ngoài bạn. Xử lý chỗ nghẽn, đừng xử lý lịch
- **Not important** nhiều → bạn đang ghi vào những việc lẽ ra không nên ghi

---

## 12. Settings

### Daily check-ins

| Mục | Mặc định | Nghĩa |
|---|---|---|
| Evening wrap-up at | 23:30 | Giờ check-in tối tự bật |
| Morning window opens | 06:00 | Sớm nhất check-in sáng được phép hiện |
| Evening window opens | 18:00 | Sau giờ này, thoát app tính là kết thúc ngày |
| How insistent | Firm | Gentle / Firm / Strict (mục 6.4) |
| Snooze length | 10 phút | |
| Snoozes allowed | 2 | Đặt 0 là không cho hoãn |
| Warn when a planned task has no estimate | Bật | |

Hai nút:
- **Open the wrap-up now** — mở check-in tối bất kể giờ giấc
- **Reset today's check-ins** — xoá trạng thái check-in của hôm nay. Dùng để thử. Nếu đang
  trong khung giờ sáng thì check-in sáng sẽ tự hiện lại **trong vòng 15 giây**

### Reminders & timer

Thời gian nhắc trước (mặc định 10 phút — từng việc chỉnh riêng được trong bảng ⋯), độ dài
pomodoro, nghỉ ngắn, nghỉ dài, và cứ mấy phiên thì nghỉ dài.

### Planning

| Mục | Mặc định | Dùng để |
|---|---|---|
| Hours in your working day | 8 | Ngưỡng cảnh báo quá tải |
| Flag a goal after N idle days | 7 | Ngưỡng bỏ quên mục tiêu |
| Call a task stale after N rollovers | 3 | Ngưỡng cảnh báo việc ì |

### Shortcuts & system

Đổi phím tắt, bật **Open at login**, ẩn icon Dock để chỉ sống trên menu bar.

> **Open at login chỉ có tác dụng ở bản đã đóng gói (.app).** Chạy bằng `npm run dev` thì
> nút này không làm gì — và check-in sáng cũng không bắt được bạn, vì app không chạy sẵn khi
> bạn mở máy.

> Phím tắt đã bị app khác chiếm thì macOS từ chối **trong im lặng** — bấm không có gì xảy ra,
> không báo lỗi. Đổi tổ hợp khác.

### Your data

Export JSON, export nhật ký Markdown, restore từ backup. Xem mục 14.

---

## 13. Thông báo

### Bạn nhận được gì

| Khi nào | Nội dung |
|---|---|
| Trước giờ việc bắt đầu | *"Starting in 10 min — Viết báo cáo · est. 45m"* |
| Đúng giờ bắt đầu | *"Now: Viết báo cáo"*, có nút **Start timer** |
| Hết một pomodoro | Kèm tiếng, báo độ dài phiên nghỉ |
| Hết giờ nghỉ | Nhắc quay lại việc đang làm |
| Cột mốc tới hạn | Mỗi ngày một lần, sau 12:00 |
| Mục tiêu bị bỏ quên | Mỗi ngày một lần, sau 12:00 |

Click vào thông báo → cửa sổ chính mở lên đúng chỗ liên quan.

### Máy ngủ thì sao

App không dùng hẹn giờ dài — chúng trôi sai sau khi máy ngủ. Thay vào đó cứ **15 giây** nó rà
lại một lượt, và khi máy thức dậy thì rà ngay lập tức.

**Thông báo quá hạn hơn 30 phút sẽ bị bỏ qua.** Gập máy 3 tiếng, mở ra không bị dội một tràng
thông báo cũ vô nghĩa.

Một thông báo được đánh dấu là đã bắn **trước khi** hiện ra, nên app có sập giữa chừng cũng
không bắn lại lần hai.

---

## 14. Dữ liệu và backup

Tất cả nằm trong **một file duy nhất**:

```
~/Library/Application Support/TSchedule/tschedule.db
```

Đây là file SQLite chuẩn. Không có gì được gửi đi đâu.

### Export

**Settings → Your data**:

- **Export backup (JSON)** — toàn bộ dữ liệu. Đây là thứ để khôi phục
- **Export journal (Markdown)** — nhật ký đọc được: mỗi ngày một mục, kèm danh sách việc
  (đánh dấu xong/chưa, lý do) và phần reflection. Dùng để đọc lại hoặc lưu trữ, **không** dùng
  để khôi phục

### Restore

**Restore from backup** — **ghi đè toàn bộ** dữ liệu hiện tại. App hỏi xác nhận trước. Không
hoàn tác được.

File backup hỏng hoặc sai định dạng thì thao tác dừng lại và dữ liệu hiện tại **không bị đụng
tới** — toàn bộ chạy trong một transaction.

### Chuyển sang máy khác

Export JSON ở máy cũ → cài app ở máy mới → Restore. Hoặc chép thẳng file `.db` khi app đang
tắt.

---

## 15. Một ngày dùng TSchedule

**Mở máy buổi sáng** — check-in sáng chặn bạn lại. Chốt việc còn dở (2 phút), chọn 3 việc
Focus, kiểm tra ước tính. Đóng lại, bắt đầu làm.

**Trong lúc làm** — bấm ▶ trên việc đang làm. Nghĩ ra gì thì `⌘⇧Space` ném vào Inbox, không rời
việc. Tới giờ một việc khác thì máy nhắc.

**Cuối ngày** — 23:30 cửa sổ tổng kết bật lên (hoặc bạn tự bấm **Wrap up my day** khi xong
việc sớm hơn). Khai từng việc, ghi ưu tiên cho mai. Ưu tiên đó thành việc thật trên danh sách
ngày mai.

**Cuối tuần** — mở **Stats**, xem ba thứ: hệ số ước tính có cải thiện không, thời gian có đổ
vào mục tiêu quan trọng không, và lý do việc dở đang nghiêng về đâu.

---

## 16. Những điều app cố ý không làm

**Không tự dời việc chưa xong.** Việc nằm nguyên ở ngày cũ tới khi bạn phân loại. Nếu rollover
chạy ngầm lúc 4h sáng thì tới sáng chẳng còn gì để bắt bạn chốt lại — mà đó mới là điểm của cả
app này.

**Không cho quá 3 việc Focus.** Ghim 6 việc thì không còn là ưu tiên nữa.

**Không tự sửa ước tính của bạn.** Chỉ gợi ý. App sửa hộ thì bạn không bao giờ học được cách
đoán đúng.

**Không ghi đè thời gian đã đo bằng ước lượng thô.** Việc nào đã bấm giờ thì con số nhanh
15m/30m/1h trong check-in tối không đụng tới nó.

**Không có lưới giờ kiểu calendar.** Đây là chỗ ghi việc theo ngày, không phải để vẽ lại lịch.

**Không đồng bộ, không tài khoản, không đám mây.** Một file trên máy bạn.

---

## 17. Xử lý sự cố

**Check-in sáng không bao giờ hiện**

Gần như chắc chắn app không chạy sẵn khi bạn mở máy. Kiểm tra: đang dùng bản `.app` đã đóng
gói chứ không phải `npm run dev`? **Settings → Open at login** đã bật? Icon đồng hồ có trên
menu bar không?

**Thông báo không hiện**

**System Settings → Notifications → TSchedule** — đã Allow chưa, và nên đặt là **Alerts** chứ
không phải Banners. Kiểm tra Focus / Do Not Disturb có đang bật không.

**Thông báo hiện tên "Electron"**

Bạn đang chạy `npm run dev`. Bản `.dmg` hiển thị đúng tên. Đây là giới hạn của bản chưa ký số,
không phải lỗi.

**Phím tắt không ăn**

Đã bị app khác chiếm. macOS từ chối trong im lặng. Đổi tổ hợp trong Settings.

**Menu bar không thấy icon**

Icon là hình đồng hồ nhỏ đen/trắng. Menu bar chật thì macOS ẩn bớt — đóng vài app khác rồi thử
lại.

**Muốn thử lại check-in sáng ngay bây giờ**

**Settings → Reset today's check-ins**. Đang trong khung giờ sáng thì nó tự hiện lại trong
vòng 15 giây.

**Mở app báo `Cannot find module .../out/main/index.js`**

Bản đóng gói được tạo ra khi chưa biên dịch. Chạy `npm run build:mac` hoặc
`npm run build:mac:arm64` — hai lệnh này biên dịch trước rồi mới đóng gói. Đừng gọi thẳng
`npx electron-builder`.

**Gỡ sạch**

Xoá `/Applications/TSchedule.app` và thư mục `~/Library/Application Support/TSchedule/`.
