# 📊 Database Indexes Documentation

## 🔍 Tổng quan

Tài liệu này giải thích về các indexes được sử dụng trong MongoDB database và cách tránh lỗi duplicate index.

## 🏗️ Index Structure

### 1. ShortLink Collection

```javascript
// Schema definition
shortCode: {
  type: String,
  required: true,
  unique: true,  // ✅ Tự động tạo index
  trim: true
}

// Manual indexes
shortLinkSchema.index({ ipAddress: 1 });      // Index cho IP address
shortLinkSchema.index({ createdAt: -1 });     // Index cho thời gian tạo (descending)
```

**Indexes được tạo:**
- `shortCode` (unique) - Tự động tạo bởi `unique: true`
- `ipAddress` - Manual index cho queries theo IP
- `createdAt` - Manual index cho sorting theo thời gian

### 2. BlockedIP Collection

```javascript
// Schema definition
ipAddress: {
  type: String,
  required: true,
  unique: true  // ✅ Tự động tạo index
}

// Manual indexes
blockedIPSchema.index({ expiresAt: 1 });  // Index cho thời gian hết hạn
```

**Indexes được tạo:**
- `ipAddress` (unique) - Tự động tạo bởi `unique: true`
- `expiresAt` - Manual index cho queries theo thời gian hết hạn

### 3. SpamLog Collection

```javascript
// Schema definition (không có unique fields)

// Manual indexes
spamLogSchema.index({ ipAddress: 1 });     // Index cho IP address
spamLogSchema.index({ createdAt: -1 });    // Index cho thời gian tạo
```

**Indexes được tạo:**
- `ipAddress` - Manual index cho queries theo IP
- `createdAt` - Manual index cho sorting theo thời gian

### 4. RateLimitLog Collection

```javascript
// Schema definition (không có unique fields)

// Manual indexes
rateLimitLogSchema.index({ ipAddress: 1, endpoint: 1 }, { unique: true });  // Compound unique index
rateLimitLogSchema.index({ windowStart: 1 });  // Index cho window start
```

**Indexes được tạo:**
- `ipAddress + endpoint` (compound unique) - Manual compound index
- `windowStart` - Manual index cho window timing

## ⚠️ Tránh Duplicate Index Errors

### ❌ Lỗi thường gặp

```javascript
// ❌ SAI - Duplicate index
const schema = new mongoose.Schema({
  field: {
    type: String,
    unique: true  // Tự động tạo index
  }
});

schema.index({ field: 1 });  // ❌ Duplicate index!
```

### ✅ Cách đúng

```javascript
// ✅ ĐÚNG - Không duplicate
const schema = new mongoose.Schema({
  field: {
    type: String,
    unique: true  // Tự động tạo index
  }
});

// Không cần thêm schema.index({ field: 1 })
```

## 🔧 Kiểm tra Indexes

### Xem tất cả indexes trong collection

```javascript
// Trong MongoDB shell
db.shortlinks.getIndexes()
db.blockedips.getIndexes()
db.spamlogs.getIndexes()
db.ratelimitlogs.getIndexes()
```

### Xem indexes trong Mongoose

```javascript
// Trong Node.js
const ShortLink = require('./database/models/ShortLink');

// Lấy thông tin indexes
ShortLink.collection.getIndexes().then(indexes => {
  console.log('ShortLink indexes:', indexes);
});
```

## 📈 Performance Benefits

### 1. Query Performance
- **shortCode lookup**: O(log n) thay vì O(n)
- **IP address queries**: Nhanh hơn với index
- **Date range queries**: Hiệu quả với index trên timestamp

### 2. Unique Constraints
- **shortCode**: Đảm bảo không duplicate
- **ipAddress (BlockedIP)**: Đảm bảo mỗi IP chỉ bị block một lần
- **ipAddress + endpoint (RateLimitLog)**: Đảm bảo unique combination

### 3. Sorting Performance
- **createdAt**: Index cho sorting theo thời gian
- **clicks**: Có thể thêm index nếu cần sort theo clicks

## 🚀 Best Practices

### 1. Index Strategy
```javascript
// ✅ Tốt - Index cho fields thường query
schema.index({ field: 1 });

// ✅ Tốt - Compound index cho queries phức tạp
schema.index({ field1: 1, field2: -1 });

// ✅ Tốt - Unique constraint
schema.index({ field: 1 }, { unique: true });
```

### 2. Index Maintenance
```javascript
// Kiểm tra index usage
db.collection.aggregate([
  { $indexStats: {} }
])

// Drop unused indexes
db.collection.dropIndex("index_name")
```

### 3. Monitoring
```javascript
// Theo dõi index performance
db.collection.find().explain("executionStats")
```

## 🔍 Troubleshooting

### Lỗi Duplicate Index
```
Duplicate schema index on {"field":1} found. 
This is often due to declaring an index using both "index: true" and "schema.index()".
```

**Giải pháp:**
1. Kiểm tra schema definition có `unique: true` không
2. Loại bỏ `schema.index()` cho field đã có `unique: true`
3. Restart application

### Index Creation Failed
```
Index creation failed: E11000 duplicate key error
```

**Giải pháp:**
1. Kiểm tra dữ liệu có duplicate không
2. Drop index cũ và tạo lại
3. Clean up duplicate data

## 📝 Notes

- Indexes tự động được tạo khi khởi tạo collection
- Unique indexes đảm bảo data integrity
- Compound indexes hiệu quả cho queries phức tạp
- Regular monitoring giúp tối ưu performance

---

**Indexes được cấu hình tối ưu cho performance và data integrity! 🚀** 