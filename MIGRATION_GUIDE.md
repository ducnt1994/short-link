# 🔄 Migration Guide: SQLite to MongoDB

Hướng dẫn chuyển đổi từ SQLite sang MongoDB cho dự án URL Shortener.

## 📋 Yêu cầu

- Node.js 16+
- MongoDB 4.4+ (local hoặc MongoDB Atlas)
- Dự án đã được cài đặt dependencies mới

## 🚀 Bước 1: Cài đặt MongoDB

### Local MongoDB
```bash
# macOS (với Homebrew)
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community

# Ubuntu/Debian
sudo apt update
sudo apt install mongodb
sudo systemctl start mongodb
sudo systemctl enable mongodb

# Windows
# Tải MongoDB từ https://www.mongodb.com/try/download/community
```

### MongoDB Atlas (Cloud)
1. Truy cập [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Tạo tài khoản và cluster miễn phí
3. Lấy connection string

## 🔧 Bước 2: Cấu hình Environment

Cập nhật file `.env`:

```env
# Thay đổi từ SQLite sang MongoDB
DB_URI=mongodb://localhost:27017/shortlink

# Hoặc sử dụng MongoDB Atlas
DB_URI=mongodb+srv://username:password@cluster.mongodb.net/shortlink
```

## 📦 Bước 3: Cài đặt Dependencies

```bash
npm install
```

## 🔄 Bước 4: Migration Data (Tùy chọn)

Nếu bạn có dữ liệu trong SQLite và muốn chuyển sang MongoDB:

```bash
# Chạy script migration
npm run migrate
```

Script này sẽ:
- Kết nối với cả SQLite và MongoDB
- Chuyển đổi tất cả dữ liệu từ SQLite sang MongoDB
- Giữ nguyên cấu trúc dữ liệu
- Hiển thị tiến trình migration

## ✅ Bước 5: Kiểm tra

```bash
# Khởi chạy ứng dụng
npm run dev
```

Truy cập http://localhost:3000 để kiểm tra ứng dụng.

## 📊 Cấu trúc Database

### SQLite → MongoDB Mapping

| SQLite Table | MongoDB Collection | Mô tả |
|--------------|-------------------|-------|
| `shortlinks` | `shortlinks` | Thông tin link rút gọn |
| `spam_logs` | `spamlogs` | Log hoạt động spam |
| `blocked_ips` | `blockedips` | IP bị chặn |
| `rate_limit_logs` | `ratelimitlogs` | Log rate limiting |

### Schema Changes

#### ShortLinks
```javascript
// SQLite
{
  id: INTEGER,
  original_url: TEXT,
  short_code: TEXT,
  ip_address: TEXT,
  user_agent: TEXT,
  created_at: DATETIME,
  clicks: INTEGER,
  last_clicked: DATETIME,
  is_active: BOOLEAN
}

// MongoDB
{
  _id: ObjectId,
  originalUrl: String,
  shortCode: String,
  ipAddress: String,
  userAgent: String,
  clicks: Number,
  lastClicked: Date,
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

## 🛠️ Troubleshooting

### Lỗi kết nối MongoDB
```bash
# Kiểm tra MongoDB có đang chạy không
mongosh
# hoặc
mongo
```

### Lỗi migration
```bash
# Xóa collections cũ nếu cần
mongosh
use shortlink
db.shortlinks.drop()
db.spamlogs.drop()
db.blockedips.drop()
db.ratelimitlogs.drop()
```

### Lỗi permissions
```bash
# Đảm bảo MongoDB có quyền ghi
sudo chown -R $USER /data/db
```

## 🔒 Security Notes

- Thay đổi DB_URI trong production
- Sử dụng authentication cho MongoDB
- Backup dữ liệu trước khi migration
- Test migration trên môi trường development trước

## 📝 Notes

- Migration script chỉ chạy một lần
- Dữ liệu SQLite vẫn được giữ nguyên
- Có thể xóa file SQLite sau khi migration thành công
- Tất cả API endpoints vẫn hoạt động như cũ

## 🆘 Support

Nếu gặp vấn đề, hãy:
1. Kiểm tra logs trong console
2. Đảm bảo MongoDB đang chạy
3. Kiểm tra connection string
4. Tạo issue trên GitHub 