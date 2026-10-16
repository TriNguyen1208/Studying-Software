const users = [
  { id: 1, name: "Alice", email: "alice@example.com" },
  { id: 2, name: "Bob", email: "bob@example.com" },
  { id: 3, name: "Charlie", email: "charlie@example.com" }
];

const messages = [
  { id: 101, userId: 1, text: "Chào mọi người, hôm nay thời tiết thế nào?", timestamp: "2023-10-01T10:00:00Z" },
  { id: 102, userId: 2, text: "Hôm nay trời nắng đẹp, rất thích hợp đi chơi.", timestamp: "2023-10-01T10:05:00Z" },
  { id: 103, userId: 1, text: "Tuyệt quá, mình đang muốn tìm hiểu về ElasticSearch.", timestamp: "2023-10-01T10:10:00Z" },
  { id: 104, userId: 3, text: "Elasticsearch rất mạnh trong việc tìm kiếm full-text search nhé.", timestamp: "2023-10-01T10:15:00Z" },
  { id: 105, userId: 2, text: "Đúng rồi, nó dùng index ngược (inverted index) nên tìm kiếm text cực nhanh.", timestamp: "2023-10-01T10:20:00Z" },
  { id: 106, userId: 1, text: "Mình có thể dùng nó với NodeJS và ReactJS được không?", timestamp: "2023-10-01T10:25:00Z" },
  { id: 107, userId: 3, text: "Chắc chắn rồi, thư viện @elastic/elasticsearch cho Node hoạt động rất tốt.", timestamp: "2023-10-01T10:30:00Z" }
];

module.exports = { users, messages };
