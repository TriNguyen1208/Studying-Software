// Khởi tạo kết nối WebSocket (Socket.IO) tới Backend đang chạy ở port 3000
const socket = io('http://localhost:3000');

// Lấy các element (thành phần HTML) từ giao diện để thao tác
const videoInput = document.getElementById('videoInput');
const uploadBtn = document.getElementById('uploadBtn');
const fileInfo = document.getElementById('fileInfo');
const progressContainer = document.getElementById('progressContainer');
const progressBar = document.getElementById('progressBar');
const statusMessage = document.getElementById('statusMessage');
const resultContainer = document.getElementById('resultContainer');
const videoPlayer = document.getElementById('videoPlayer');

// Biến lưu trữ file người dùng chọn
let selectedFile = null;

// Hằng số quy định kích thước mỗi mảnh (chunk) là 5MB (chuẩn S3 quy định part tối thiểu phải là 5MB)
const CHUNK_SIZE = 5 * 1024 * 1024; 

// Sự kiện: Khi người dùng chọn file
videoInput.addEventListener('change', (e) => {
  // Lấy file đầu tiên người dùng chọn
  selectedFile = e.target.files[0];
  if (selectedFile) {
    // Hiển thị tên file và kích thước (chuyển sang MB cho dễ đọc)
    fileInfo.innerText = `File đã chọn: ${selectedFile.name} (${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)`;
    // Mở khóa nút Bắt đầu Upload
    uploadBtn.disabled = false;
  }
});

// Sự kiện: Lắng nghe tin nhắn từ Backend gửi qua WebSocket khi quá trình hoàn tất (kể cả FFmpeg)
// (Lưu ý: Trong demo này, backend gửi 'upload_completed' khi lên S3 xong, 
// nhưng để đơn giản, ta sẽ cập nhật giao diện thành 'Đang xử lý')
socket.on('upload_completed', (data) => {
  // Backend thông báo đã upload xong lên R2, đang chuyển qua Worker FFmpeg
  statusMessage.innerText = 'Đã upload lên Cloud. Đang xử lý Video (FFmpeg FastStart)...';
  statusMessage.style.color = '#ff9800'; // Đổi màu cam
});

// Sự kiện: Bấm nút Bắt đầu Upload
uploadBtn.addEventListener('click', async () => {
  if (!selectedFile) return; // Nếu chưa chọn file thì thoát

  // Khóa nút bấm để tránh click nhiều lần
  uploadBtn.disabled = true;
  
  // Hiển thị thanh tiến trình và thông báo
  progressContainer.style.display = 'block';
  statusMessage.innerText = 'Đang khởi tạo phiên upload...';
  statusMessage.style.color = '#333';
  progressBar.style.width = '0%'; // Reset thanh tiến trình về 0

  try {
    // --- BƯỚC 1: BÁO CHO BACKEND BIẾT ĐỂ TẠO PHIÊN UPLOAD (CREATE MULTIPART) ---
    // Gọi API bằng fetch (AJAX)
    const startRes = await fetch('http://localhost:3000/api/upload/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }, // Định dạng dữ liệu gửi đi là JSON
      // Gửi tên file, loại mime (video/mp4) và dung lượng file
      body: JSON.stringify({
        filename: selectedFile.name,
        contentType: selectedFile.type,
        size: selectedFile.size
      })
    });
    // Parse dữ liệu JSON backend trả về
    const { uploadId, fileKey, videoId } = await startRes.json();

    // --- BƯỚC 2: TÍNH TOÁN SỐ LƯỢNG CHUNK (PHẦN) CẦN CẮT ---
    // Tính tổng số mảnh (làm tròn lên)
    const totalParts = Math.ceil(selectedFile.size / CHUNK_SIZE);
    
    // Mảng lưu trữ thông tin các phần sau khi upload thành công (bắt buộc phải có ETag và PartNumber để S3 ghép lại)
    const uploadedParts = [];
    
    statusMessage.innerText = `Đang upload ${totalParts} phần...`;

    // --- BƯỚC 3 & 4: UPLOAD TỪNG PHẦN ---
    // (Lưu ý: Để đơn giản cho demo, ta dùng vòng lặp for upload tuần tự hoặc xử lý Promise.all để upload song song)
    // Ở đây ta dùng vòng lặp, mỗi vòng lặp xử lý 1 chunk. Có thể cải tiến thành upload song song nhiều chunk cùng lúc (Max Concurrent)
    
    for (let partNumber = 1; partNumber <= totalParts; partNumber++) {
      // Tính vị trí bắt đầu cắt file
      const start = (partNumber - 1) * CHUNK_SIZE;
      // Tính vị trí kết thúc cắt file (nếu là phần cuối thì kết thúc ở cuối file)
      const end = Math.min(start + CHUNK_SIZE, selectedFile.size);
      
      // Dùng hàm slice của File (Blob) trong trình duyệt để cắt một đoạn video ra (không load cả file vào RAM)
      const chunk = selectedFile.slice(start, end);

      // Gọi API lấy Presigned URL cho đoạn cắt (chunk) này
      const presignRes = await fetch('http://localhost:3000/api/upload/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileKey, uploadId, partNumber }) // Truyền ID phiên và số thứ tự phần
      });
      const { presignedUrl } = await presignRes.json();

      // Dùng fetch (phương thức PUT) để đẩy trực tiếp đoạn dữ liệu byte (chunk) lên URL ký sẵn (Cloudflare R2)
      const uploadChunkRes = await fetch(presignedUrl, {
        method: 'PUT',
        body: chunk
      });

      if (!uploadChunkRes.ok) {
        const errorText = await uploadChunkRes.text();
        throw new Error(`Lỗi khi upload phần ${partNumber} lên R2: ${uploadChunkRes.status} - ${errorText}`);
      }

      // R2 (S3) trả về một header tên là 'ETag' sau khi nhận thành công một phần. Ta bắt buộc phải lưu lại chuỗi ETag này.
      let eTag = uploadChunkRes.headers.get('ETag');
      if (!eTag) {
        // Fallback nếu trình duyệt ẩn ETag do CORS caching
        throw new Error("Không thể đọc được ETag từ R2. Vui lòng xoá cache trình duyệt (Disable Cache trong F12) hoặc kiểm tra lại cấu hình CORS 'ExposeHeaders': ['ETag']");
      }
      
      // Xoá dấu ngoặc kép thừa (nếu có) trong ETag (Cloudflare đôi khi trả về ETag có ngoặc kép "..." )
      eTag = eTag.replace(/"/g, '');

      // Lưu lại thông tin phần đã tải xong
      uploadedParts.push({ PartNumber: partNumber, ETag: eTag });

      // Cập nhật thanh tiến trình trên giao diện
      const progress = (partNumber / totalParts) * 100;
      progressBar.style.width = `${progress}%`;
      statusMessage.innerText = `Đang upload phần ${partNumber}/${totalParts}...`;
    }

    // --- BƯỚC 5: THÔNG BÁO HOÀN TẤT TẤT CẢ CÁC PHẦN (COMPLETE MULTIPART) ---
    statusMessage.innerText = 'Đang tiến hành ghép file trên Server...';
    
    // Gọi API Complete lên Backend
    const completeRes = await fetch('http://localhost:3000/api/upload/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileKey, uploadId, parts: uploadedParts, videoId })
    });
    
    if (!completeRes.ok) {
        const errorText = await completeRes.text();
        throw new Error(`Lỗi khi Complete Upload trên Backend: ${errorText}`);
    }
    
    const completeData = await completeRes.json();
    
    // Note: Do có đoạn chờ Worker (FFmpeg) chạy ngầm, lý tưởng nhất là ta phải chờ event socket 'worker_done'.
    // Để cho nhanh trong bản demo: Giả sử sau 5-10 giây worker sẽ làm xong, ta mô phỏng polling hoặc hiển thị luôn kết quả.
    
    // Do file Worker của bạn sẽ đẩy trực tiếp publicUrl vào MongoDB sau khi làm xong, 
    // trong thực tế bạn sẽ bắt sự kiện WebSocket từ Worker. 
    // Ở demo này, ta tự động hiện khung video và set SRC trỏ thẳng về Cloudflare R2 dựa trên Cấu trúc Key.
    // (Phần này chỉ là giả lập sau khi worker xong, để bạn nhìn thấy kết quả).
    
    // Lấy Public URL từ file .env (Bạn cần thay đoạn text này bằng R2_PUBLIC_URL thật của bạn trong Frontend,
    // hoặc Backend trả về. Ở đây tôi hardcode mẫu theo .env của bạn)
    const PUBLIC_R2_URL = "https://pub-789073ead98e46dab0fc7ef16dba7e8a.r2.dev";
    
    setTimeout(() => {
        statusMessage.innerText = 'Xử lý thành công! (Lưu ý: Thời gian thực tế phụ thuộc vào độ dài video và tốc độ FFmpeg)';
        statusMessage.style.color = 'green';
        
        // Hiện khung kết quả
        resultContainer.style.display = 'block';
        
        // Gắn URL Video đã qua xử lý (Worker lưu ở folder processed/)
        videoPlayer.src = `${PUBLIC_R2_URL}/processed/faststart_${fileKey}`;
        
        // Cấp phát ảnh Thumbnail làm ảnh bìa cho thẻ Video (poster)
        videoPlayer.poster = `${PUBLIC_R2_URL}/thumbnails/thumb_${fileKey}.jpg`;
    }, 5000); // Giả lập chờ Worker xử lý 5 giây (trong app thật thì nhận socket thay vì setTimeout)

  } catch (error) {
    // Nếu có lỗi ở bất kỳ bước nào, bắt (catch) tại đây và thông báo
    console.error('Lỗi upload:', error);
    statusMessage.innerText = 'Có lỗi xảy ra trong quá trình upload!';
    statusMessage.style.color = 'red';
    uploadBtn.disabled = false; // Mở khóa nút bấm để người dùng có thể thử lại
  }
});
