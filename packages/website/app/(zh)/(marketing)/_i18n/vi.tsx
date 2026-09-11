import type { AboutContent } from '../about/_view';
import type { ContactContent } from '../contact/_view';
import type { PricingContent } from '../pricing/_content';
import type { LocaleContent } from './locale-content';
import type { Dictionary, FaqItem } from './types';

// Từ điển tiếng Việt: bản dịch marketing native, không dịch máy từng chữ.
// Cấu trúc bám theo zh.tsx (nguồn chuẩn); thuật ngữ đối chiếu en.tsx.
// FAQ accordion (có JSX) nằm trong `content.faq` ở cuối file này.

export const dict: Dictionary = {
  brand: { name: 'MuiCV', by: 'by Mui 🐾' },
  nav: {
    links: [
      { label: 'Mẫu CV', href: '/templates' },
      { label: 'Bài viết', href: '/posts/jobs' },
      { label: 'Skill', href: '/skills' },
      { label: 'Bảng giá', href: '/pricing' },
      { label: 'Tải về', href: '/download' },
    ],
    console: 'Mở bảng điều khiển',
    signIn: 'Đăng nhập',
    signUp: 'Tạo tài khoản',
  },
  footer: {
    tagline:
      'Nền tảng tìm việc AI tất cả trong một. CV, tìm vị trí, phỏng vấn thử, cố vấn nghề nghiệp — giúp bạn nhận được offer tốt hơn.',
    curatedBy: 'Được chú corgi Mui giám sát',
    cols: [
      {
        label: 'Sản phẩm',
        links: [
          { label: 'Tính năng chính', href: '/#features' },
          { label: 'Mẫu CV', href: '/templates' },
          { label: 'Bảng giá', href: '/pricing' },
          { label: 'Ứng dụng desktop', href: '/download' },
          { label: 'Danh mục Skill', href: '/skills' },
          { label: 'Bảng điều khiển', href: '/dashboard' },
        ],
      },

      {
        label: 'Nội dung',
        links: [
          { label: 'Bài viết tìm việc', href: '/posts/jobs' },
          { label: 'Tất cả bài viết', href: '/posts' },
          { label: 'Nhật ký cập nhật', href: '/changelog' },
        ],
      },
      {
        label: 'Công ty',
        links: [
          { label: 'Về chúng tôi', href: '/about' },
          { label: 'Liên hệ', href: '/contact' },
        ],
      },
      {
        label: 'Pháp lý',
        links: [
          { label: 'Điều khoản dịch vụ', href: '/terms' },
          { label: 'Chính sách bảo mật', href: '/privacy' },
        ],
      },
    ],
    copyright: '© 2026 Meathill LLC · MuiCV · Bảo lưu mọi quyền',
    madeIn: 'Made with 🐾 in Trung Quốc',
  },
  hero: {
    badge: 'Ứng dụng desktop đã ra mắt — bắt đầu từ một tư liệu thật',
    titleA: 'Giao CV và kinh nghiệm ',
    titleHighlight: 'cho Mui sắp xếp',
    titleEnd: '.',
    lede: 'Tải ứng dụng desktop, nhập CV hiện có hoặc dán một đoạn kinh nghiệm. Mui sẽ sắp xếp thành thư viện tư liệu nghề nghiệp có thể tái sử dụng, rồi tạo, đánh giá và xuất CV riêng cho từng vị trí.',
    ctaDownload: 'Tải ứng dụng desktop',
    ctaSteps: 'Xem 3 bước bắt đầu',
    accountSignedIn: 'Vào trang cá nhân',
    accountSignedOut: 'Tạo tài khoản',
    agentNote:
      'Đã quen với Claude Code, Codex hay Cursor? Phần sau trang chủ vẫn giữ cách cài skill, bạn có thể tiếp tục dùng bộ công cụ quen thuộc.',
  },
  heroShowcase: {
    tabsAria: 'Chuyển demo',
    slides: { import: 'Nhập tư liệu', library: 'Thư viện', resume: 'CV riêng' },
    caption: 'Sắp xếp trước, rồi tinh chỉnh theo vị trí',
    importHeader: 'MuiCV · Bước 1',
    importTitle: 'Đưa vào một tư liệu thật trước',
    importDesc:
      'Tải lên CV, dán kinh nghiệm, hoặc chỉ cần nói “tôi muốn bắt đầu từ con số không”. Mui sẽ bắt đầu từ những gì bạn đã có.',
    importItems: [
      { title: 'CV hiện tại.pdf', desc: 'Phân tích thành tư liệu có thể chỉnh sửa' },
      { title: 'Một dự án đã làm', desc: 'Bổ sung bối cảnh, hành động, kết quả' },
      { title: 'Link vị trí mục tiêu', desc: 'Dùng để tạo bản CV sau này' },
    ],
    libraryHeader: 'Thư viện tư liệu nghề nghiệp',
    libraryNavLabel: 'Điều hướng',
    libraryNav: ['Kinh nghiệm', 'Dự án', 'Kỹ năng', 'Vị trí'],
    libraryListLabel: 'Tư liệu tái sử dụng',
    libraryItems: [
      { title: 'Phụ trách nền tảng thử nghiệm tăng trưởng hội viên', match: 'Đã định lượng' },
      { title: 'Tái cấu trúc pipeline phát hành frontend', match: 'Sẵn sàng gửi' },
      { title: 'Thúc đẩy chuẩn tracking giữa các team', match: 'Cần bổ sung' },
    ],
  },
  features: {
    eyebrow: 'Có thể làm gì',
    titleA: 'Sắp xếp tư liệu gọn gàng, ',
    titleHighlight: 'rồi mới ứng tuyển',
    titleEnd: '.',
    lede: 'Cốt lõi của Mui không phải là bịa chuyện thay bạn, mà là sắp xếp kinh nghiệm thật thành tư liệu tái sử dụng, rồi điều chỉnh cách diễn đạt theo từng vị trí.',
    statusLive: 'Đã ra mắt',
    statusSoon: 'Sắp ra mắt',
    items: [
      {
        id: 'organize',
        title: 'Sắp xếp tư liệu nghề nghiệp',
        desc: 'Tách CV, kinh nghiệm dự án, kỹ năng và điểm nổi bật hiện có thành tư liệu tái sử dụng. Mỗi lần ứng tuyển đều bắt đầu từ cùng một bản gốc.',
        status: 'live',
        highlights: ['Nhập CV', 'Bổ sung kinh nghiệm', 'Quản lý file cục bộ'],
      },
      {
        id: 'generate',
        title: 'Tạo CV theo vị trí',
        desc: 'Đưa Mui một vị trí mục tiêu, nó sẽ chọn, sắp xếp và viết lại nội dung từ thư viện để tạo một bản CV khớp hơn.',
        status: 'live',
        highlights: ['Thu thập tin tuyển dụng', 'Đánh giá độ khớp', 'Quản lý phiên bản'],
      },
      {
        id: 'review',
        title: 'Đánh giá và xuất file',
        desc: 'Kiểm tra bản nháp theo STAR, định lượng, từ khóa, độ dài, rồi xuất PDF A4 — giảm bối rối sát giờ ứng tuyển.',
        status: 'live',
        highlights: ['Đánh giá 7 khía cạnh', 'Gợi ý chỉnh sửa', 'Xuất PDF'],
      },
      {
        id: 'practice',
        title: 'Tiếp tục luyện tìm việc',
        desc: 'Khi tư liệu đã ổn định, bạn có thể tiếp tục với phỏng vấn thử, thư xin việc và checklist ứng tuyển. Các tính năng nâng cao sẽ xuất hiện khi bạn cần.',
        status: 'soon',
        highlights: ['Phỏng vấn thử', 'Thư xin việc', 'Checklist ứng tuyển'],
      },
    ],
  },
  workflow: {
    eyebrow: 'Bắt đầu thế nào',
    titleA: 'Lần đầu mở app, ',
    titleHighlight: 'chỉ làm ba việc',
    titleEnd: '.',
    aside:
      'Hoàn thành tư liệu nghề nghiệp đầu tiên trước, đừng vội hiểu mọi tính năng. Các bản CV theo vị trí, ghép vị trí và xuất file sau này đều lớn lên từ đây.',
    steps: [
      {
        title: 'Nhập CV hiện có hoặc dán kinh nghiệm',
        desc: 'Không cần học khái niệm trước. Đưa vào PDF, tài liệu hay một dự án bạn đã có, Mui sẽ bắt đầu sắp xếp từ tư liệu thật.',
      },
      {
        title: 'Sắp xếp thành thư viện tái sử dụng',
        desc: 'Kinh nghiệm, dự án và kỹ năng được tách thành file Markdown, lưu trên chính máy của bạn. Mỗi lần sửa CV sau này không phải làm lại từ đầu.',
      },
      {
        title: 'Tạo, đánh giá và xuất theo vị trí',
        desc: 'Khi đã có thư viện, dán link hoặc mô tả vị trí, Mui sẽ tạo bản CV, kiểm tra vấn đề và xuất PDF sẵn sàng để gửi đi.',
      },
    ],
  },
  desktopApp: {
    badge: 'Ứng dụng desktop · Đã ra mắt',
    titleA: 'Chưa quen AI agent? ',
    titleHighlight: 'Tải về là bắt đầu',
    titleEnd: '.',
    lede: 'Ứng dụng desktop đa nền tảng, mở lên sẽ dẫn bạn nhập CV hoặc ghi lại kinh nghiệm đầu tiên. Khi tư liệu đã gọn, tiếp tục ghép vị trí, đánh giá CV và xuất PDF.',
    ctaDownload: 'Tải ứng dụng desktop',
    ctaAdvanced: 'Đang dùng AI agent? Đi lối nâng cao ↓',
    platforms: [
      { name: 'macOS', sub: 'Apple Silicon · Intel' },
      { name: 'Windows', sub: 'x64 · Gói cài NSIS' },
      { name: 'Linux', sub: 'x86_64 · AppImage' },
    ],
    downloadLabel: 'Tải về',
    noteBefore: 'Số phiên bản và dung lượng gói cài được lấy từ ',
    noteLink: 'trang tải về',
    noteAfter:
      ' tự động theo bản GitHub Releases mới nhất. Nếu lần chạy đầu bị hệ thống chặn, nửa sau trang tải về có hướng dẫn cho phép.',
  },
  install: {
    badge: 'Lối nâng cao · cho người đã quen công cụ AI',
    titleA: 'Đang dùng Claude Code / Codex? ',
    titleHighlight: 'Cài skill là xong',
    titleEnd: '.',
    lede: 'Đây là lối nâng cao, dành cho người đã quen làm việc trong AI agent. Người tìm việc thông thường chỉ cần tải ứng dụng desktop sẽ thuận hơn.',
    noteBefore: 'Chưa quen AI agent? ',
    noteLink: 'Tải ứng dụng desktop',
    noteAfter: ' để bắt đầu ngay, dùng được trên macOS / Windows / Linux.',
    cardMeta: 'Dùng chung nhiều agent / tương thích 40+',
  },
  faq: {
    eyebrow: 'Câu hỏi thường gặp',
    titleA: 'Điều bạn muốn hỏi ',
    titleHighlight: 'rất có thể',
    titleEnd: ' nằm ngay đây.',
    articlesEyebrow: 'Bài viết tìm việc',
    articlesTitle: 'CV, phỏng vấn và offer — gặp khó thì mở một bài ra đọc.',
    articlesLede:
      'Tổng hợp những chỗ hay tắc khi tìm việc: sửa CV thế nào, chuẩn bị phỏng vấn ra sao, làm sao biết một cơ hội có đáng theo đuổi.',
    articlesCta: 'Đến trung tâm nội dung',
    articlesEmpty: 'Bài viết đang được chuẩn bị. Bạn có thể vào trung tâm nội dung xem các mục đã mở.',
  },
  download: {
    eyebrow: 'Ứng dụng desktop',
    title: 'Tải MuiCV',
    lede: 'Không cần cài Claude Code, cũng không cần hiểu skill trước. Mở app, nhập CV hoặc ghi lại kinh nghiệm đầu tiên, Mui sẽ dẫn bạn dựng một thư viện tư liệu nghề nghiệp có thể tiếp tục hoàn thiện.',
    firstMinuteLabel: 'Phút đầu tiên sau khi tải',
    firstMinuteSteps: [
      {
        title: 'Đăng nhập tài khoản muicv',
        desc: 'Hoàn tất uỷ quyền trên trình duyệt, app sẽ tự trở về trạng thái đã đăng nhập.',
      },
      {
        title: 'Nhập CV hoặc ghi từ đầu',
        desc: 'Tải lên CV hiện có, hoặc chỉ cần kể một dự án và kinh nghiệm bạn từng làm.',
      },
      {
        title: 'Bắt đầu cuộc trò chuyện sắp xếp đầu tiên',
        desc: 'Mui tách tư liệu thành các phần tái sử dụng trước, rồi mới tạo bản CV theo vị trí.',
      },
    ],
    releasedAt: 'Phát hành',
    platforms: [
      { title: 'macOS · Apple Silicon', subtitle: 'M1 / M2 / M3 / M4', key: 'mac-arm64' },
      { title: 'macOS · Intel', subtitle: 'Máy Mac cũ x64', key: 'mac-x64' },
      { title: 'Windows', subtitle: 'x64 · Gói cài NSIS', key: 'win' },
      { title: 'Linux', subtitle: 'x86_64 · AppImage', key: 'linux' },
    ],
    unsignedNote:
      'Tất cả các nền tảng đều chưa ký code, lần chạy đầu cần cho phép thủ công theo hướng dẫn bên dưới; các bản sau khi có chứng chỉ nhà phát triển sẽ bỏ bước này.',
    noArch: 'Bản này không có gói cho kiến trúc đó',
    downloadLabel: 'Tải về',
    noReleaseLead: '🐾 Ứng dụng desktop tạm thời không lấy được bản phát hành. Trước đó bạn có thể:',
    noReleaseSkill:
      'Nếu đang dùng AI agent như Claude Code, Codex hay Cursor, quay lại trang chủ xem lệnh cài skill, 5 giây là tích hợp xong',
    noReleaseContactBefore: 'Có thắc mắc hay muốn góp ý, ',
    noReleaseContactLink: 'liên hệ chúng tôi',
    firstRunTitle: '⚠️ Lần mở đầu cần gỡ hạn chế',
    firstRunLede:
      'Cả ba nền tảng đều chưa ký code nên hệ điều hành sẽ chặn một lần. Làm theo các bước dưới để cho phép, sau đó nhấp đúp / dùng dòng lệnh là chạy được ngay.',
    firstRunMacSteps: [
      'Kéo file .dmg vào /Applications',
      <>
        <strong>Nhấp chuột phải</strong> (hoặc control-click) vào app → <strong>Mở</strong>
      </>,
      'Sau khi hộp thoại hiện ra, bấm “Mở” lần nữa, từ đó nhấp đúp là dùng được',
    ],
    firstRunMacCliLabel: 'Bản dòng lệnh (không cần thao tác GUI):',
    firstRunMacCli: 'xattr -d com.apple.quarantine /Applications/Mui简历.app',
    firstRunWinSteps: [
      'Nhấp đúp file .exe đã tải',
      <>
        Gặp cảnh báo SmartScreen → bấm <strong>Thông tin thêm</strong> → bấm <strong>Vẫn chạy</strong>
      </>,
      'Chọn đường dẫn cài đặt, mặc định cài vào thư mục người dùng hiện tại, không cần mật khẩu quản trị',
    ],
    firstRunLinuxLede: 'Sau khi tải .AppImage, cấp quyền thực thi rồi chạy trực tiếp:',
  },
  meta: {
    home: {
      title: 'MuiCV — Trình tạo CV AI | Mẫu CV lập trình viên, tạo CV tiếng Anh trực tuyến',
      description:
        'MuiCV (muicv.com) là trình tạo CV AI và bàn làm việc tìm việc tất cả trong một: mẫu CV lập trình viên, tạo CV tiếng Anh trực tuyến, tối ưu từ khóa ATS thông minh và xuất PDF A4. Tư liệu do bạn kiểm soát, riêng tư an toàn.',
    },
    download: {
      title: 'Tải ứng dụng desktop MuiCV (macOS / Windows / Linux)',
      description:
        'Tải ứng dụng desktop MuiCV, hỗ trợ macOS, Windows, Linux. Nhập CV hoặc dán kinh nghiệm, sắp xếp tư liệu nghề nghiệp cục bộ, rồi dùng AI tạo, đánh giá và xuất CV PDF theo vị trí. Tải miễn phí, tư liệu lưu cục bộ.',
    },
  },
};

const faqLink =
  'font-semibold text-yellow-deep underline decoration-corgi decoration-2 underline-offset-4 hover:decoration-yellow';

const about: AboutContent = {
  meta: {
    title: 'Về chúng tôi',
    description:
      'Chúng tôi muốn làm một công cụ thực sự giúp bạn nhận được offer, chứ không phải một trình tạo mẫu CV nữa.',
  },
  heroEyebrow: 'Giới thiệu',
  heroTitleLead: 'Một công cụ thực sự giúp bạn nhận ',
  heroTitleHighlight: 'offer',
  heroTitleMid: ' — ',
  heroTitleTail: 'không phải lại một trình tạo mẫu nữa.',
  heroLede:
    'MuiCV là nền tảng tìm việc AI tất cả trong một: từ sắp xếp kinh nghiệm đã qua, đến tìm vị trí phù hợp, tùy chỉnh CV, phỏng vấn thử, viết thư xin việc — tất cả xoay quanh việc “nhận được công việc tiếp theo”, chứ không chỉ tạo ra một file PDF đẹp.',
  doEyebrow: 'Chúng tôi làm gì',
  doTitle: 'Toàn bộ hành trình từ tư liệu đến offer.',
  doCards: [
    {
      t: 'Không chỉ là CV',
      d: 'CV chỉ là điểm vào. Chúng tôi quan tâm những khâu thực sự quyết định bạn có nhận được offer hay không: ghép vị trí, chuẩn bị phỏng vấn, chiến lược tìm việc.',
    },
    {
      t: 'Dữ liệu thuộc về bạn',
      d: 'Mọi tư liệu đều là file Markdown trên máy hoặc trong dự án của bạn, do bạn toàn quyền nắm giữ. Chúng tôi không làm “kho CV” trên cloud, không khóa dữ liệu của bạn.',
    },
    {
      t: 'Không bịa thay bạn',
      d: 'Mọi nội dung đều dựa trên sự thật bạn viết ra. Thiếu tư liệu thì hỏi lại hoặc để trống, tuyệt đối không “sáng tạo” thay — tránh để CV phản lại bạn trong buổi phỏng vấn.',
    },
  ],
  whyEyebrow: 'Vì sao làm',
  whyTitle: 'Tìm việc không đáng phải khó đến thế.',
  whyParagraphs: [
    'Chúng tôi từng thấy quá nhiều ứng viên giỏi vấp ngã vì CV: nội dung rất đỉnh nhưng kể không rõ, thử hết mẫu này đến mẫu khác, sửa theo JD cả đêm vẫn không biết có nên ứng tuyển không.',
    'Phần lớn công cụ CV trên thị trường chỉ giải quyết “trình bày cho đẹp”, nhưng chỗ khó thật sự nằm ở hai đầu: đầu vào là “mình có gì để kể”, đầu ra là “vị trí nào hợp với mình, phỏng vấn cần chuẩn bị gì”.',
    'Chúng tôi muốn làm công cụ cho cả hành trình, làm từng khâu đến nơi đến chốn: từ đoạn kinh nghiệm đầu tiên bạn viết ra, cho đến ngày nhận được offer.',
  ],
  teamEyebrow: 'Đội ngũ',
  teamTitle: 'Một chú corgi và một kỹ sư.',
  teamPara1: (
    <>
      Dự án do <strong className="text-ink">meathill</strong> (một lập trình viên làm frontend nhiều năm) khởi xướng,
      được chú corgi <strong className="text-ink">Mui</strong> giám sát — cô là chú chó lông vàng trắng nhà meathill,
      khi giám sát sản phẩm thì hay nằm lên bàn phím gây ảnh hưởng đến việc merge code.
    </>
  ),
  teamPara2:
    'Sẽ có thêm đồng đội tham gia, nhưng tâm huyết ban đầu của sản phẩm sẽ không đổi: làm công cụ, không làm chiêu trò marketing; đặt trải nghiệm người dùng và quyền sở hữu dữ liệu lên trên hết.',
  ctaTitle: 'Tìm công việc tiếp theo, bắt đầu từ đây.',
  ctaSignedIn: 'Vào bảng điều khiển',
  ctaSignedOut: 'Bắt đầu miễn phí',
  ctaContact: 'Liên hệ chúng tôi',
};

const contact: ContactContent = {
  meta: {
    title: 'Liên hệ',
    description: 'Phản hồi sản phẩm, hợp tác kinh doanh, báo chí — chọn đúng hộp thư để được trả lời nhanh hơn.',
  },
  heroEyebrow: 'Liên hệ',
  heroTitleLead: 'Muốn ',
  heroTitleHighlight: 'nói với chúng tôi điều gì đó',
  heroTitleTail: '?',
  heroLede:
    'Chúng tôi đọc từng email. Thường phản hồi trong 1–3 ngày làm việc; lúc cao điểm có thể chậm hơn, nhưng chắc chắn sẽ trả lời.',
  contacts: [
    {
      label: 'Liên hệ chung',
      tag: 'Phản hồi sản phẩm / hỗ trợ người dùng',
      email: 'hi@muicv.com',
      desc: 'Câu hỏi sử dụng, báo lỗi, góp ý tính năng — mọi vấn đề về sản phẩm đều gửi về đây.',
    },
    {
      label: 'Hợp tác kinh doanh',
      tag: 'Doanh nghiệp / đội nhóm / đối tác',
      email: 'partner@muicv.com',
      desc: 'Mua theo nhóm, hợp tác với tổ chức giáo dục, kết nối nền tảng tuyển dụng — việc kinh doanh gửi về hộp thư này sẽ được phản hồi nhanh hơn.',
    },
    {
      label: 'Báo chí',
      tag: 'Phỏng vấn / đưa tin / thương hiệu',
      email: 'press@muicv.com',
      desc: 'Lời mời phỏng vấn, tư liệu truyền thông, xin tài liệu thương hiệu. Giới thiệu ngắn gọn hướng đưa tin, chúng tôi sẽ phản hồi sớm nhất.',
    },
  ],
  noteStrong: 'Muốn dùng thử ngay?',
  noteLink: 'Tải ứng dụng desktop',
  noteAfter: 'bắt đầu ngay, dùng được trên macOS / Windows / Linux.',
};

const pricing: PricingContent = {
  meta: {
    title: 'Bảng giá',
    description:
      'Tính phí theo token, không bao giờ hết hạn. Đăng ký nhận ngay 10K token; chọn gói tháng / năm / gói nạp thêm tùy bạn.',
  },
  heroEyebrow: 'Bảng giá',
  heroTitleLead: 'Tính phí theo ',
  heroTitleHighlight: 'token',
  heroTitleMid: ', ',
  heroTitleTail: 'không bao giờ hết hạn.',
  heroLede:
    'Đăng ký nhận ngay 10.000 token (một lần). Khi cần thêm, chọn gói tháng / năm, hoặc mua gói nạp thêm bất cứ lúc nào. Skill luôn miễn phí, BYOK luôn khả dụng.',
  toggleMonthly: 'Theo tháng',
  toggleYearly: 'Theo năm',
  toggleSavings: 'tiết kiệm ≈9%',
  free: {
    title: 'Bắt đầu miễn phí',
    sub: 'Muốn thử một chút thì bắt đầu từ đây.',
    grantNote: 'Tặng khi đăng ký · chỉ một lần',
    bullets: [
      'Dùng được mọi dịch vụ cloud (LLM / PDF / JD)',
      'Quản lý tư liệu cục bộ không giới hạn',
      'Kết nối BYOK là dùng LLM “không giới hạn”',
      'Hết thì mua gói nạp thêm hoặc đăng ký, số dư không bao giờ hết hạn',
    ],
    ctaSignedIn: 'Vào bảng điều khiển',
    ctaSignedOut: 'Đăng ký miễn phí nhận 10K token',
  },
  tokenLineYearly: 'Phát một lần khoảng 11 tháng',
  tokenLineMonthly: 'Tự động gia hạn mỗi tháng',
  tiers: {
    pro: {
      tagline: 'Giai đoạn tìm việc nghiêm túc.',
      badge: 'Phổ biến nhất',
      features: [
        'Mọi tính năng (LLM / PDF / JD / thư viện tuyển dụng) phân bổ tự do theo token',
        'Hủy đăng ký, token đã phát không bao giờ hết hạn',
        'Hỗ trợ email ưu tiên',
      ],
    },
    max: {
      tagline: 'Dành cho giai đoạn tìm việc cường độ cao.',
      features: ['Mọi tính năng của Pro', 'Trải nghiệm sớm các module mới', 'Kênh hỗ trợ riêng'],
    },
  },
  cardPerYear: 'Mỗi năm',
  cardPerMonth: 'Mỗi tháng',
  signUpToSubscribe: 'Đăng ký rồi mở gói',
  manageSub: 'Quản lý đăng ký',
  subscribeNow: 'Đăng ký ngay',
  cnSubscribeHint:
    'Gói đăng ký không hỗ trợ CNY (giới hạn của Stripe). Đăng ký cần thẻ quốc tế (Visa / Mastercard, v.v.) — thẻ UnionPay nội địa thường không dùng được. Nếu chỉ có UnionPay, hãy mua gói nạp thêm bên dưới (hỗ trợ WeChat Pay / Alipay).',
  switchToUsd: 'Chuyển sang USD (thẻ quốc tế)',
  topupHeading: 'Gói nạp thêm (mua một lần, không hết hạn)',
  topupDesc: 'Chưa muốn đăng ký, hoặc thỉnh thoảng dùng quá. Mua lúc nào cũng được.',
  buyNow: 'Mua ngay',
  signUpToBuy: 'Đăng ký rồi mua',
  faqEyebrow: 'Về bảng giá',
  faqTitle: 'Vài chi tiết hay được hỏi.',
  faq: [
    {
      q: 'MuiCV tính phí như thế nào?',
      a: 'Lời gọi LLM được ghi trực tiếp theo token prompt + completion của nhà cung cấp và quy đổi theo bảng giá, kể cả phần cache cũng tính theo giá gốc; mỗi lần render PDF trừ 200 token; mỗi lần thu thập JD trừ 300 token. Mọi lời gọi đều hiện chi tiết trong lịch sử ở bảng điều khiển.',
    },
    {
      q: 'Gói tháng và gói năm khác nhau thế nào?',
      a: 'Về giá, gói năm rẻ hơn khoảng 9%; về token, gói năm phát một lần khoảng 11 tháng, dùng được tập trung ngay từ ngày thanh toán. Hủy đăng ký vẫn giữ toàn bộ token đã phát, không bao giờ hết hạn. Gói tháng phù hợp để thử trước, gói năm phù hợp khi chắc chắn dùng lâu dài.',
    },
    {
      q: 'Hỗ trợ những phương thức thanh toán nào?',
      a: 'Gói đăng ký (USD) qua Stripe cần thẻ quốc tế (Visa / Mastercard / Amex, v.v.); thẻ UnionPay nội địa thường không thanh toán được gói đăng ký bằng USD. Gói nạp thêm một lần hỗ trợ nhiều hơn: CNY dùng WeChat Pay / Alipay / thẻ quốc tế, USD dùng thẻ quốc tế. Nếu chỉ có UnionPay, hãy mua gói nạp thêm.',
    },
    {
      q: 'Có thể dùng đồng thời đăng ký và gói nạp thêm không?',
      a: 'Được. Đăng ký là “tự động gia hạn theo chu kỳ”, gói nạp thêm là “hết thì nạp thủ công”. Token từ cả hai đều vào cùng một số dư, dùng không phân biệt trước sau.',
    },
    {
      q: 'Có thể nâng / hạ gói hoặc hủy bất cứ lúc nào không?',
      a: 'Được. Bấm “Quản lý đăng ký” trong bảng điều khiển sẽ mở Stripe Customer Portal, hủy, đổi gói hay đổi phương thức thanh toán đều ở đó. Token đã phát không bao giờ hết hạn, hủy xong vẫn dùng tiếp số dư cũ. Phí tính theo mức sử dụng thực tế, không tính trùng.',
    },
    {
      q: 'Người dùng Free có được tự động gia hạn token mỗi tháng không?',
      a: 'Không. Khi đăng ký tặng một lần 10.000 token, chỉ vậy thôi. Dùng đến hết thì có thể mua gói nạp thêm (rẻ nhất ¥12.88 = 140K token), đăng ký gói tháng / năm, hoặc gắn BYOK để LLM dùng API của bạn (PDF / JD vẫn trừ token muicv).',
    },
    {
      q: 'Không hài lòng có được hoàn tiền không?',
      a: 'Đăng ký trong 7 ngày nếu chưa dùng tính năng chính thì được hoàn tiền đầy đủ, hãy liên hệ qua email. Gói nạp thêm vào tài khoản ngay, về nguyên tắc không hoàn; nếu mua nhầm hoặc có vấn đề lớn, vẫn có thể thương lượng qua email.',
    },
    {
      q: 'Tôi mua API của nơi khác rồi, còn phải trả phí không?',
      a: 'Bạn có thể chọn chỉ dùng BYOK: gắn địa chỉ API và API key của bạn vào bảng điều khiển, khi đó mọi lời gọi LLM đều chạy bằng số dư API của bạn, không tiêu token muicv. Nhưng các dịch vụ giá trị gia tăng như render PDF / thu thập JD vẫn trừ token muicv (những dịch vụ này chỉ chúng tôi cung cấp được).',
    },
    {
      q: 'Tôi không biết mua API ở đâu, có gợi ý không?',
      a: 'Tôi còn phát triển muirouter, dùng toàn bộ AI chính hãng, hỗ trợ mọi sản phẩm chủ lưu. Nếu bạn dùng sản phẩm AI ở nhiều nơi và muốn dùng ngân sách AI hiệu quả hơn, hãy thử: https://muirouter.com.',
    },
    {
      q: 'Dùng API riêng (BYOK) có lợi gì?',
      a: 'Ví dụ bạn không thích gói nào của chúng tôi vì thấy ít quá hoặc nhiều quá, hoặc bạn dùng nhiều hơn một sản phẩm AI, thì có thể cân nhắc tự mang API (BYOK). Như vậy hạn mức bạn không dùng hết ở nền tảng này vẫn dùng được cho các sản phẩm AI khác.',
    },
    {
      q: 'Bộ Skill có mất phí không?',
      a: 'Không. npx skills add cài vào bất kỳ AI agent nào như Claude Code / Codex / Cursor hoàn toàn miễn phí — nền tảng chỉ tính phí cho năng lực phía server (xuất PDF / tìm vị trí).',
    },
  ],
};

const faq: FaqItem[] = [
  {
    q: 'Dữ liệu CV của tôi lưu ở đâu? Ai xem được?',
    a: (
      <>
        Tất cả đều lưu trên chính máy của bạn — dưới dạng file Markdown thuần, do bạn hoàn toàn nắm giữ. Có sao lưu hay
        chia sẻ cho người khác hay không đều do bạn quyết định. Server của chúng tôi chỉ tạm xử lý dữ liệu khi bạn chủ
        động gọi các tính năng như xuất PDF / thu thập vị trí, xử lý xong là xóa, không lưu lại bất kỳ nội dung CV nào.
      </>
    ),
    text: 'Tất cả đều lưu trên chính máy của bạn — dưới dạng file Markdown thuần, do bạn hoàn toàn nắm giữ. Có sao lưu hay chia sẻ cho người khác hay không đều do bạn quyết định. Server của chúng tôi chỉ tạm xử lý dữ liệu khi bạn chủ động gọi các tính năng như xuất PDF / thu thập vị trí, xử lý xong là xóa, không lưu lại bất kỳ nội dung CV nào.',
  },
  {
    q: 'Tính phí thế nào?',
    a: (
      <>
        Ví token thống nhất:
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            <strong>Đăng ký tặng một lần 10.000 token</strong>, không bao giờ hết hạn, dùng đến hết thì thôi
          </li>
          <li>
            <strong>Đăng ký gói</strong>: Pro / Max theo tháng hoặc năm, tự động gia hạn token theo chu kỳ; gói năm phát
            một lần khoảng 11 tháng, giảm khoảng 9%
          </li>
          <li>
            <strong>Gói nạp thêm</strong>: mua một lần 140K / 480K / 1.75M token, cần là mua
          </li>
          <li>
            <strong>BYOK</strong>: gắn địa chỉ API và key của bạn trong bảng điều khiển, LLM dùng số dư của bạn; PDF /
            JD vẫn trừ token muicv
          </li>
        </ul>
        Các dịch vụ cloud (xuất PDF, tìm vị trí...) trừ phí theo token. Xem giá cụ thể tại{' '}
        <a href="/pricing" className={faqLink}>
          trang bảng giá
        </a>
        .
      </>
    ),
    text: 'Ví token thống nhất: đăng ký tặng một lần 10.000 token, không bao giờ hết hạn; đăng ký gói Pro / Max theo tháng hoặc năm, tự động gia hạn token theo chu kỳ, gói năm giảm khoảng 9%; gói nạp thêm mua một lần 140K / 480K / 1.75M token; BYOK cho phép gắn API key của bạn để LLM dùng số dư của bạn. Các dịch vụ cloud (xuất PDF, tìm vị trí...) trừ phí theo token, xem cụ thể ở trang bảng giá.',
  },
  {
    q: 'BYOK là gì?',
    a: (
      <>
        BYOK = Bring Your Own Key, tự mang số dư LLM. Sau khi gắn, mọi lời gọi AI đều dùng số dư của bạn, chúng tôi
        không tiêu token nền tảng nữa — phù hợp với người đã có gói dịch vụ LLM và muốn quản lý chi phí thống nhất.
      </>
    ),
    text: 'BYOK = Bring Your Own Key, tự mang số dư LLM. Sau khi gắn, mọi lời gọi AI đều dùng số dư của bạn, chúng tôi không tiêu token nền tảng nữa — phù hợp với người đã có gói dịch vụ LLM và muốn quản lý chi phí thống nhất.',
  },
  {
    q: 'Ứng dụng desktop phát hành khi nào?',
    a: (
      <>
        <strong>Đã ra mắt</strong>, dùng được trên macOS / Windows / Linux. Vào{' '}
        <a href="/download" className={faqLink}>
          trang tải về
        </a>{' '}
        để lấy bản mới nhất. Người đang dùng AI agent (Claude Code / Codex / Cursor...) cũng có thể tích hợp trực tiếp
        qua bộ skill, chọn một trong hai cách là được.
      </>
    ),
    text: 'Đã ra mắt, dùng được trên macOS / Windows / Linux, vào trang tải về để lấy bản mới nhất. Người đang dùng AI agent (Claude Code / Codex / Cursor...) cũng có thể tích hợp trực tiếp qua bộ skill, chọn một trong hai cách là được.',
  },
  {
    q: 'Có hỗ trợ CV tiếng Anh / song ngữ không?',
    a: (
      <>
        Có. Tư liệu viết bằng ngôn ngữ nào thì CV theo ngôn ngữ đó; nếu vị trí mục tiêu là tiếng Anh, CV tạo ra sẽ viết
        theo văn phong tiếng Anh; mẫu song ngữ đối chiếu đang được lên kế hoạch.
      </>
    ),
    text: 'Có. Tư liệu viết bằng ngôn ngữ nào thì CV theo ngôn ngữ đó; nếu vị trí mục tiêu là tiếng Anh, CV tạo ra sẽ viết theo văn phong tiếng Anh; mẫu song ngữ đối chiếu đang được lên kế hoạch.',
  },
  {
    q: 'Có tự động ứng tuyển lên LinkedIn / các trang tuyển dụng không?',
    a: (
      <>
        Không. Chúng tôi chỉ giúp bạn thu thập vị trí, tạo CV đúng trọng tâm, viết thư xin việc, sắp xếp checklist — còn
        việc “bấm nút gửi” là do bạn tự làm. Điều này là cố ý, để tránh rủi ro tài khoản và vi phạm ToS.
      </>
    ),
    text: 'Không. Chúng tôi chỉ giúp bạn thu thập vị trí, tạo CV đúng trọng tâm, viết thư xin việc, sắp xếp checklist — còn việc “bấm nút gửi” là do bạn tự làm. Điều này là cố ý, để tránh rủi ro tài khoản và vi phạm ToS.',
  },
  {
    q: 'MuiCV phù hợp với ai?',
    a: (
      <>
        Người đang tìm việc và phải sửa CV nhiều lần — sinh viên mới ra trường, người nhảy việc, người chuyển ngành,
        hoặc người ứng tuyển nhiều vị trí cùng lúc. Ai đang dùng AI agent như Claude Code, Cursor thì có thể gắn skill
        trực tiếp; không muốn động đến dòng lệnh thì tải ứng dụng desktop. Bạn lo phần kinh nghiệm, Mui lo việc sắp xếp
        nó thành CV khớp với vị trí.
      </>
    ),
    text: 'Người đang tìm việc và phải sửa CV nhiều lần — sinh viên mới ra trường, người nhảy việc, người chuyển ngành, hoặc người ứng tuyển nhiều vị trí cùng lúc. Ai đang dùng AI agent như Claude Code, Cursor thì có thể gắn skill trực tiếp; không muốn động đến dòng lệnh thì tải ứng dụng desktop. Bạn lo phần kinh nghiệm, Mui lo việc sắp xếp nó thành CV khớp với vị trí.',
  },
  {
    q: 'AI có giúp tôi tối ưu / sửa CV không?',
    a: (
      <>
        Có, nhưng chỉ dựa trên sự thật bạn cung cấp. Mui đánh giá bản nháp theo STAR, kết quả định lượng, từ khóa vị
        trí, độ dài..., chỉ ra câu nào còn mơ hồ, đoạn nào thiếu số liệu, từ khóa nào chưa bao phủ, và đưa ra gợi ý viết
        lại dùng được ngay. Dán mô tả vị trí mục tiêu vào, nó còn chọn lại và viết lại tư liệu cho vị trí đó. Tuyệt đối
        không bịa kinh nghiệm cho bạn.
      </>
    ),
    text: 'Có, nhưng chỉ dựa trên sự thật bạn cung cấp. Mui đánh giá bản nháp theo STAR, kết quả định lượng, từ khóa vị trí, độ dài..., chỉ ra câu nào còn mơ hồ, đoạn nào thiếu số liệu, từ khóa nào chưa bao phủ, và đưa ra gợi ý viết lại dùng được ngay. Dán mô tả vị trí mục tiêu vào, nó còn chọn lại và viết lại tư liệu cho vị trí đó. Tuyệt đối không bịa kinh nghiệm cho bạn.',
  },
  {
    q: 'Trang web chính thức của MuiCV là gì?',
    a: (
      <>
        Chỉ có một: <strong>muicv.com</strong>, www.muicv.com sẽ tự chuyển hướng về đây. Tên tiếng Trung của sản phẩm là
        Mui简历, tên tiếng Anh là MuiCV. Trên mạng có vài công cụ CV tên gần giống nhưng không liên quan đến chúng tôi;
        khi lưu bookmark hay tìm kiếm, cứ nhận đúng muicv.com là không lạc.
      </>
    ),
    text: 'Chỉ có một: muicv.com, www.muicv.com sẽ tự chuyển hướng về đây. Tên tiếng Trung của sản phẩm là Mui简历, tên tiếng Anh là MuiCV. Trên mạng có vài công cụ CV tên gần giống nhưng không liên quan đến chúng tôi; khi lưu bookmark hay tìm kiếm, cứ nhận đúng muicv.com là không lạc.',
  },
];

export const content: LocaleContent = {
  about,
  contact,
  pricing,
  faq,
};
