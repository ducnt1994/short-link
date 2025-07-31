# 🔗 URL Shortener với Anti-Spam Protection

Một ứng dụng Node.js tạo link rút gọn với các kỹ thuật chống spam tiên tiến, sử dụng MongoDB làm database.

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
- MongoDB 4.4+

### Bước 1: Clone và cài đặt dependencies
```bash
git clone <repository-url>
cd short-link
npm install
```

### Bước 2: Cấu hình MongoDB
Đảm bảo MongoDB đang chạy trên máy của bạn hoặc sử dụng MongoDB Atlas.

### Bước 3: Cấu hình môi trường
```bash
cp env.example .env
```

Chỉnh sửa file `.env` theo nhu cầu:
```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
DB_URI=mongodb://localhost:27017/shortlink

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
```

### Bước 4: Khởi chạy ứng dụng
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

## 📊 Database Schema (MongoDB)

### Collection `shortlinks`
```javascript
{
  _id: ObjectId,
  originalUrl: String,        // URL gốc
  shortCode: String,          // Mã rút gọn (unique)
  ipAddress: String,          // IP tạo link
  userAgent: String,          // User agent
  clicks: Number,             // Số lượt click (default: 0)
  lastClicked: Date,          // Lần click cuối
  isActive: Boolean,          // Trạng thái hoạt động (default: true)
  createdAt: Date,            // Thời gian tạo
  updatedAt: Date             // Thời gian cập nhật
}
```

### Collection `spamlogs`
```javascript
{
  _id: ObjectId,
  ipAddress: String,          // IP có hành vi spam
  action: String,             // Loại hành vi spam
  details: String,            // Chi tiết
  createdAt: Date,            // Thời gian ghi log
  updatedAt: Date             // Thời gian cập nhật
}
```

### Collection `blockedips`
```javascript
{
  _id: ObjectId,
  ipAddress: String,          // IP bị chặn (unique)
  reason: String,             // Lý do chặn
  expiresAt: Date,            // Thời gian hết hạn
  isPermanent: Boolean,       // Chặn vĩnh viễn (default: false)
  createdAt: Date,            // Thời gian chặn
  updatedAt: Date             // Thời gian cập nhật
}
```

### Collection `ratelimitlogs`
```javascript
{
  _id: ObjectId,
  ipAddress: String,          // IP address
  endpoint: String,           // API endpoint
  requestCount: Number,       // Số request (default: 1)
  windowStart: Date,          // Bắt đầu window
  lastRequest: Date,          // Request cuối cùng
  createdAt: Date,            // Thời gian tạo
  updatedAt: Date             // Thời gian cập nhật
}
```

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

### Cấu hình Database
```env
DB_URI=mongodb://localhost:27017/shortlink
# Hoặc sử dụng MongoDB Atlas
DB_URI=mongodb+srv://username:password@cluster.mongodb.net/shortlink
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