# 🔗 URL Shortener với Anti-Spam Protection

Một ứng dụng Node.js tạo link rút gọn với các kỹ thuật chống spam tiên tiến.

## ✨ Tính năng

### 🛡️ Anti-Spam Protection
- **Rate Limiting**: Giới hạn số lượng request từ mỗi IP
- **Speed Limiting**: Làm chậm response khi có quá nhiều request
- **IP Blocking**: Tự động chặn IP có hành vi spam
- **Domain Filtering**: Chặn các domain đáng ngờ
- **Keyword Detection**: Phát hiện từ khóa spam trong URL
- **Daily Limits**: Giới hạn số link tạo mỗi ngày theo IP

### 🔗 URL Shortening
- Tạo link rút gọn tự động
- Hỗ trợ custom code
- Theo dõi số lượt click
- Thống kê chi tiết
- Giao diện web đẹp mắt

## 🚀 Cài đặt

### Yêu cầu hệ thống
- Node.js 16+ 
- npm hoặc yarn

### Bước 1: Clone và cài đặt dependencies
```bash
git clone <repository-url>
cd short-link
npm install
```

### Bước 2: Cấu hình môi trường
```bash
cp env.example .env
```

Chỉnh sửa file `.env` theo nhu cầu:
```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database
DB_PATH=./database/shortlinks.db

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
SLOW_DOWN_WINDOW_MS=900000
SLOW_DOWN_DELAY_AFTER=50
SLOW_DOWN_DELAY_MS=500

# Anti-spam Configuration
MAX_LINKS_PER_IP_PER_DAY=50
BLOCKED_DOMAINS=spam.com,malware.com,phishing.com
SUSPICIOUS_KEYWORDS=spam,malware,virus,hack

# Captcha Configuration
CAPTCHA_ENABLED=true
```

### Bước 3: Khởi chạy ứng dụng
```bash
# Development mode
npm run dev

# Production mode
npm start
```

Truy cập: http://localhost:3000

## 📚 API Documentation

### Tạo link rút gọn
```http
POST /api/shortlink/create
Content-Type: application/json

{
  "originalUrl": "https://example.com/very-long-url",
  "customCode": "my-custom-link" // optional
}
```

### Truy cập link rút gọn
```http
GET /:shortCode
```

### Lấy thông tin link
```http
GET /api/shortlink/info/:shortCode
```

### Thống kê tổng quan
```http
GET /api/shortlink/stats/overview
```



## 🛡️ Cơ chế chống spam

### 1. Rate Limiting
- Giới hạn 100 request/15 phút cho mỗi IP
- Tự động làm chậm response khi vượt quá 50 request

### 2. IP Blocking
- Tự động chặn IP có 5+ hoạt động spam trong 1 ngày
- Thời gian chặn: 7 ngày
- Hỗ trợ chặn vĩnh viễn

### 3. Domain & Keyword Filtering
- Chặn các domain đáng ngờ (cấu hình trong .env)
- Phát hiện từ khóa spam trong URL
- Có thể tùy chỉnh danh sách

### 4. Daily Limits
- Giới hạn 50 link/ngày cho mỗi IP
- Phát hiện tạo link quá nhanh (>10 link/giờ)

## 📊 Database Schema

### Bảng `shortlinks`
- `id`: Primary key
- `original_url`: URL gốc
- `short_code`: Mã rút gọn
- `ip_address`: IP tạo link
- `user_agent`: User agent
- `created_at`: Thời gian tạo
- `clicks`: Số lượt click
- `last_clicked`: Lần click cuối
- `is_active`: Trạng thái hoạt động

### Bảng `spam_logs`
- `id`: Primary key
- `ip_address`: IP có hành vi spam
- `action`: Loại hành vi spam
- `details`: Chi tiết
- `created_at`: Thời gian ghi log

### Bảng `blocked_ips`
- `id`: Primary key
- `ip_address`: IP bị chặn
- `reason`: Lý do chặn
- `blocked_at`: Thời gian chặn
- `expires_at`: Thời gian hết hạn
- `is_permanent`: Chặn vĩnh viễn

## 🔧 Tùy chỉnh

### Cấu hình Rate Limiting
```env
RATE_LIMIT_WINDOW_MS=900000    # 15 phút
RATE_LIMIT_MAX_REQUESTS=100    # Số request tối đa
SLOW_DOWN_DELAY_AFTER=50       # Bắt đầu làm chậm sau 50 request
SLOW_DOWN_DELAY_MS=500         # Độ trễ 500ms
```

### Cấu hình Anti-Spam
```env
MAX_LINKS_PER_IP_PER_DAY=50    # Giới hạn link/ngày
BLOCKED_DOMAINS=spam.com,malware.com
SUSPICIOUS_KEYWORDS=spam,malware,virus
```



## 🚀 Deployment

### Production
```bash
# Cài đặt dependencies
npm ci --only=production

# Set environment
NODE_ENV=production

# Khởi chạy
npm start
```

### Docker (tùy chọn)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## 📝 License

MIT License - xem file [LICENSE](LICENSE) để biết thêm chi tiết.

## 🤝 Contributing

1. Fork project
2. Tạo feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Tạo Pull Request

## 📞 Support

Nếu có vấn đề hoặc câu hỏi, vui lòng tạo issue trên GitHub. 