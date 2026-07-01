// Data Tools Collection — 6 nhóm + ~50 công cụ (logic chạy ở frontend qua `component`).
export interface ToolCategorySeed {
  slug: string; name: string; description: string; icon: string; sortOrder: number;
}
export interface ToolSeed {
  categorySlug: string; slug: string; name: string; description: string;
  icon: string; component: string; isPro?: boolean; sortOrder: number;
  serverEngine?: string; // nếu set => chạy ở server
}

export const TOOL_CATEGORIES: ToolCategorySeed[] = [
  { slug: 'ai', name: 'AI hỗ trợ', description: 'Công cụ chạy AI ở server', icon: 'sparkles', sortOrder: 0 },
  { slug: 'formatters', name: 'Định dạng', description: 'Format & làm đẹp code/dữ liệu', icon: 'code', sortOrder: 1 },
  { slug: 'validators', name: 'Kiểm tra', description: 'Validate dữ liệu, cú pháp', icon: 'check', sortOrder: 2 },
  { slug: 'encoders', name: 'Mã hóa', description: 'Encode/decode, hash', icon: 'lock', sortOrder: 3 },
  { slug: 'generators', name: 'Tạo dữ liệu', description: 'Sinh dữ liệu ngẫu nhiên', icon: 'sparkles', sortOrder: 4 },
  { slug: 'converters', name: 'Chuyển đổi', description: 'Chuyển đổi định dạng/đơn vị', icon: 'refresh', sortOrder: 5 },
  { slug: 'calculators', name: 'Tính toán', description: 'Máy tính & công cụ số học', icon: 'calculator', sortOrder: 6 },
];

// Công cụ chạy ở SERVER (engine = serverEngine). component 'ServerTool' = runner chung trên frontend.
export const SERVER_TOOLS: ToolSeed[] = [
  { categorySlug: 'ai', slug: 'ai-explain-code', name: 'AI Giải thích code', description: 'Dán code, AI giải thích cách hoạt động', icon: 'sparkles', component: 'ServerTool', serverEngine: 'ai-explain-code', sortOrder: 0 },
  { categorySlug: 'ai', slug: 'ai-regex', name: 'AI Sinh Regex', description: 'Mô tả nhu cầu, AI tạo regex + giải thích', icon: 'search', component: 'ServerTool', serverEngine: 'ai-regex', sortOrder: 1 },
  { categorySlug: 'ai', slug: 'ai-commit', name: 'AI Commit Message', description: 'Sinh commit message từ mô tả thay đổi', icon: 'git-branch', component: 'ServerTool', serverEngine: 'ai-commit', sortOrder: 2 },
  { categorySlug: 'ai', slug: 'ai-translate', name: 'AI Dịch Việt–Anh', description: 'Tự nhận diện & dịch Việt ⇄ Anh', icon: 'languages', component: 'ServerTool', serverEngine: 'ai-translate', sortOrder: 3 },
  { categorySlug: 'ai', slug: 'ai-sql', name: 'AI Sinh SQL', description: 'Mô tả truy vấn, AI viết câu lệnh SQL', icon: 'database', component: 'ServerTool', serverEngine: 'ai-sql', sortOrder: 4 },
  { categorySlug: 'ai', slug: 'ai-name', name: 'AI Đặt tên biến', description: 'Gợi ý tên biến/hàm chuẩn từ mô tả', icon: 'tag', component: 'ServerTool', serverEngine: 'ai-name', sortOrder: 5 },
  { categorySlug: 'ai', slug: 'ai-explain-error', name: 'AI Giải thích lỗi', description: 'Dán lỗi/stack trace, AI gợi ý cách sửa', icon: 'bug', component: 'ServerTool', serverEngine: 'ai-explain-error', sortOrder: 6 },
  { categorySlug: 'encoders', slug: 'hash-server', name: 'Hash (server)', description: 'MD5/SHA1/SHA256/SHA512 tính ở server', icon: 'lock', component: 'ServerTool', serverEngine: 'hash-all', sortOrder: 20 },
  { categorySlug: 'converters', slug: 'slugify', name: 'Slugify', description: 'Chuyển chữ có dấu thành slug URL', icon: 'link', component: 'ServerTool', serverEngine: 'slugify', sortOrder: 20 },
];

export const TOOLS: ToolSeed[] = [
  // formatters
  { categorySlug: 'formatters', slug: 'json-formatter', name: 'JSON Formatter', description: 'Format & validate JSON', icon: 'braces', component: 'JsonFormatter', sortOrder: 0 },
  { categorySlug: 'formatters', slug: 'xml-formatter', name: 'XML Formatter', description: 'Làm đẹp XML', icon: 'code', component: 'XmlFormatter', sortOrder: 1 },
  { categorySlug: 'formatters', slug: 'sql-formatter', name: 'SQL Formatter', description: 'Format câu lệnh SQL', icon: 'database', component: 'SqlFormatter', sortOrder: 2 },
  { categorySlug: 'formatters', slug: 'html-formatter', name: 'HTML Formatter', description: 'Beautify HTML', icon: 'code', component: 'HtmlFormatter', sortOrder: 3 },
  { categorySlug: 'formatters', slug: 'css-formatter', name: 'CSS Formatter', description: 'Beautify/minify CSS', icon: 'palette', component: 'CssFormatter', sortOrder: 4 },
  { categorySlug: 'formatters', slug: 'js-minifier', name: 'JS Minifier', description: 'Nén JavaScript', icon: 'code', component: 'JsMinifier', sortOrder: 5 },
  { categorySlug: 'formatters', slug: 'markdown-preview', name: 'Markdown Preview', description: 'Xem trước Markdown', icon: 'file-text', component: 'MarkdownPreview', sortOrder: 6 },

  // validators
  { categorySlug: 'validators', slug: 'json-validator', name: 'JSON Validator', description: 'Kiểm tra JSON hợp lệ', icon: 'check', component: 'JsonValidator', sortOrder: 0 },
  { categorySlug: 'validators', slug: 'regex-tester', name: 'Regex Tester', description: 'Test biểu thức chính quy', icon: 'search', component: 'RegexTester', sortOrder: 1 },
  { categorySlug: 'validators', slug: 'email-validator', name: 'Email Validator', description: 'Kiểm tra định dạng email', icon: 'mail', component: 'EmailValidator', sortOrder: 2 },
  { categorySlug: 'validators', slug: 'credit-card-validator', name: 'Credit Card Check', description: 'Kiểm tra số thẻ (Luhn)', icon: 'credit-card', component: 'CreditCardValidator', sortOrder: 3 },
  { categorySlug: 'validators', slug: 'cron-validator', name: 'Cron Validator', description: 'Kiểm tra & giải thích cron', icon: 'clock', component: 'CronValidator', sortOrder: 4 },
  { categorySlug: 'validators', slug: 'url-validator', name: 'URL Validator', description: 'Kiểm tra URL hợp lệ', icon: 'link', component: 'UrlValidator', sortOrder: 5 },

  // encoders
  { categorySlug: 'encoders', slug: 'base64', name: 'Base64 Encode/Decode', description: 'Mã hóa/giải mã Base64', icon: 'lock', component: 'Base64Tool', sortOrder: 0 },
  { categorySlug: 'encoders', slug: 'url-encode', name: 'URL Encode/Decode', description: 'Encode/decode URL', icon: 'link', component: 'UrlEncodeTool', sortOrder: 1 },
  { categorySlug: 'encoders', slug: 'html-entities', name: 'HTML Entities', description: 'Encode/decode HTML entities', icon: 'code', component: 'HtmlEntitiesTool', sortOrder: 2 },
  { categorySlug: 'encoders', slug: 'jwt-decoder', name: 'JWT Decoder', description: 'Giải mã JWT', icon: 'key', component: 'JwtDecoder', sortOrder: 3 },
  { categorySlug: 'encoders', slug: 'hash-md5-sha', name: 'Hash (MD5/SHA)', description: 'Tạo hash MD5/SHA', icon: 'hash', component: 'HashTool', sortOrder: 4 },
  { categorySlug: 'encoders', slug: 'bcrypt', name: 'Bcrypt Hash', description: 'Tạo & so khớp bcrypt', icon: 'lock', component: 'BcryptTool', isPro: true, sortOrder: 5 },
  { categorySlug: 'encoders', slug: 'morse-code', name: 'Morse Code', description: 'Chuyển văn bản ↔ Morse', icon: 'radio', component: 'MorseTool', sortOrder: 6 },

  // generators
  { categorySlug: 'generators', slug: 'uuid-generator', name: 'UUID Generator', description: 'Sinh UUID v4', icon: 'sparkles', component: 'UuidGenerator', sortOrder: 0 },
  { categorySlug: 'generators', slug: 'password-generator', name: 'Password Generator', description: 'Tạo mật khẩu mạnh', icon: 'key', component: 'PasswordGenerator', sortOrder: 1 },
  { categorySlug: 'generators', slug: 'lorem-ipsum', name: 'Lorem Ipsum', description: 'Sinh văn bản giả', icon: 'file-text', component: 'LoremIpsum', sortOrder: 2 },
  { categorySlug: 'generators', slug: 'qr-generator', name: 'QR Code Generator', description: 'Tạo mã QR', icon: 'qr-code', component: 'QrGenerator', sortOrder: 3 },
  { categorySlug: 'generators', slug: 'fake-data', name: 'Fake Data', description: 'Sinh dữ liệu mẫu (tên/email...)', icon: 'users', component: 'FakeDataGenerator', sortOrder: 4 },
  { categorySlug: 'generators', slug: 'color-palette', name: 'Color Palette', description: 'Tạo bảng màu', icon: 'palette', component: 'ColorPalette', sortOrder: 5 },
  { categorySlug: 'generators', slug: 'random-number', name: 'Random Number', description: 'Sinh số ngẫu nhiên', icon: 'dice', component: 'RandomNumber', sortOrder: 6 },
  { categorySlug: 'generators', slug: 'slug-generator', name: 'Slug Generator', description: 'Tạo slug từ chuỗi', icon: 'link', component: 'SlugGenerator', sortOrder: 7 },

  // converters
  { categorySlug: 'converters', slug: 'json-csv', name: 'JSON ↔ CSV', description: 'Chuyển đổi JSON/CSV', icon: 'refresh', component: 'JsonCsvConverter', sortOrder: 0 },
  { categorySlug: 'converters', slug: 'json-yaml', name: 'JSON ↔ YAML', description: 'Chuyển đổi JSON/YAML', icon: 'refresh', component: 'JsonYamlConverter', sortOrder: 1 },
  { categorySlug: 'converters', slug: 'timestamp', name: 'Timestamp Converter', description: 'Unix timestamp ↔ ngày', icon: 'clock', component: 'TimestampConverter', sortOrder: 2 },
  { categorySlug: 'converters', slug: 'number-base', name: 'Number Base', description: 'Bin/Oct/Dec/Hex', icon: 'binary', component: 'NumberBaseConverter', sortOrder: 3 },
  { categorySlug: 'converters', slug: 'color-converter', name: 'Color Converter', description: 'HEX/RGB/HSL', icon: 'palette', component: 'ColorConverter', sortOrder: 4 },
  { categorySlug: 'converters', slug: 'unit-converter', name: 'Unit Converter', description: 'Chuyển đổi đơn vị', icon: 'ruler', component: 'UnitConverter', sortOrder: 5 },
  { categorySlug: 'converters', slug: 'case-converter', name: 'Case Converter', description: 'camelCase/snake_case...', icon: 'type', component: 'CaseConverter', sortOrder: 6 },
  { categorySlug: 'converters', slug: 'image-base64', name: 'Image ↔ Base64', description: 'Ảnh sang Base64', icon: 'image', component: 'ImageBase64', sortOrder: 7 },

  // calculators
  { categorySlug: 'calculators', slug: 'percentage', name: 'Percentage Calc', description: 'Tính phần trăm', icon: 'percent', component: 'PercentageCalc', sortOrder: 0 },
  { categorySlug: 'calculators', slug: 'bmi', name: 'BMI Calculator', description: 'Tính chỉ số BMI', icon: 'activity', component: 'BmiCalc', sortOrder: 1 },
  { categorySlug: 'calculators', slug: 'loan', name: 'Loan Calculator', description: 'Tính lãi vay', icon: 'dollar-sign', component: 'LoanCalc', sortOrder: 2 },
  { categorySlug: 'calculators', slug: 'age', name: 'Age Calculator', description: 'Tính tuổi', icon: 'calendar', component: 'AgeCalc', sortOrder: 3 },
  { categorySlug: 'calculators', slug: 'date-diff', name: 'Date Difference', description: 'Khoảng cách 2 ngày', icon: 'calendar', component: 'DateDiff', sortOrder: 4 },
  { categorySlug: 'calculators', slug: 'tip', name: 'Tip Calculator', description: 'Tính tiền tip', icon: 'dollar-sign', component: 'TipCalc', sortOrder: 5 },
  { categorySlug: 'calculators', slug: 'scientific', name: 'Scientific Calc', description: 'Máy tính khoa học', icon: 'calculator', component: 'ScientificCalc', sortOrder: 6 },
  { categorySlug: 'calculators', slug: 'word-counter', name: 'Word Counter', description: 'Đếm từ/ký tự', icon: 'file-text', component: 'WordCounter', sortOrder: 7 },
];
